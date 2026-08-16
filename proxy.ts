import createIntlMiddleware from "next-intl/middleware";
import { NextResponse, type NextRequest } from "next/server";
import { routing } from "@/i18n/routing";
import { createMiddlewareClient } from "@/lib/supabase/middleware";

// NOTE: Next.js 16 renamed the `middleware.ts` file convention to
// `proxy.ts` (export name `proxy` instead of `middleware`). See
// node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md

const handleI18nRouting = createIntlMiddleware(routing);

const supabaseHostname = new URL(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://placeholder.supabase.co"
).hostname;

/**
 * Baseline security headers, applied on every request.
 *
 * CSP intentionally has NO nonce: nonces require dynamic (per-request)
 * rendering, which would force every page to opt out of ISR/static
 * rendering — unacceptable for the ~10k visitors/day + Supabase free-tier
 * budget this site runs on (see lib/config.ts). A static CSP string keeps
 * product/category pages statically/ISR-cacheable. Revisit only if a
 * stricter CSP becomes a hard requirement.
 */
function securityHeaders(): Record<string, string> {
  const isDev = process.env.NODE_ENV !== "production";

  // React's dev-mode debugging tooling (reconstructing server-side error
  // stacks in the browser, among other things) calls eval(), which
  // 'script-src' otherwise blocks. Confirmed dev-only for this project by
  // downloading and grepping the actual built JS chunks rather than just
  // trusting the console message: eval( appears in dev bundles (the
  // Turbopack runtime chunk and react-server-dom-turbopack) and in ZERO
  // of the 9 production chunks from a real `next build`. So this is only
  // ever added outside production — the production CSP never includes it.
  const scriptSrc = isDev
    ? "script-src 'self' 'unsafe-inline' 'unsafe-eval'"
    : "script-src 'self' 'unsafe-inline'";

  const csp = [
    "default-src 'self'",
    // 'unsafe-inline' is required here: Next.js's App Router injects its
    // own inline bootstrap scripts (self.__next_f.push(...), used to
    // stream RSC payloads for hydration) on every page, in both dev and
    // production — confirmed by inspecting real build output, not
    // assumed. Without 'unsafe-inline' (or a nonce), the browser blocks
    // those scripts outright and client-side hydration never runs, i.e.
    // the whole site becomes non-interactive. A nonce-based CSP was
    // evaluated and rejected: nonces are per-request, which forces every
    // page (homepage, collections/products/quote) off SSG/ISR onto full
    // per-request rendering — directly contradicting this project's
    // 10k-visitors/day performance plan (see the comment above and
    // lib/config.ts). 'unsafe-inline' does weaken this directive
    // specifically against inline-script injection; every other
    // directive below is unaffected and still fully enforced.
    scriptSrc,
    "style-src 'self' 'unsafe-inline'",
    `img-src 'self' data: blob: https://${supabaseHostname}`,
    `connect-src 'self' https://${supabaseHostname}`,
    "font-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "upgrade-insecure-requests",
  ].join("; ");

  return {
    "Content-Security-Policy": csp,
    "X-Frame-Options": "SAMEORIGIN",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  };
}

function withSecurityHeaders(response: NextResponse): NextResponse {
  for (const [key, value] of Object.entries(securityHeaders())) {
    response.headers.set(key, value);
  }
  return response;
}

const ADMIN_LOGIN_PATH = "/admin/login";
const ADMIN_HOME_PATH = "/admin";

/**
 * Redirects to `pathname`, carrying over any cookies `source` has queued
 * (a refreshed session token) so the redirect itself doesn't lose that
 * refresh -- discarding `source` and building a bare NextResponse.redirect
 * would drop a just-refreshed access token, forcing another refresh (or
 * worse, a spurious logout) on the very next request.
 */
function redirectPreservingCookies(
  request: NextRequest,
  pathname: string,
  source: NextResponse
): NextResponse {
  const url = request.nextUrl.clone();
  url.pathname = pathname;
  url.search = "";
  const redirectResponse = NextResponse.redirect(url);
  for (const cookie of source.cookies.getAll()) {
    redirectResponse.cookies.set(cookie);
  }
  return withSecurityHeaders(redirectResponse);
}

/**
 * Admin auth (Prompt 21). Deliberately scoped to /admin/* only, not run
 * on every public marketing request: getClaims() does real JWT
 * verification work (a cached JWKS lookup, occasionally a network call --
 * see @supabase/auth-js's own getClaims() doc comment) that anonymous
 * visitors browsing the public catalog have no reason to pay for, on a
 * site whose whole caching strategy (lib/config.ts) exists to minimize
 * per-request cost at ~10k visitors/day.
 *
 * Single-admin model (approved architecture): authorization = authentication.
 * Any successfully authenticated session IS the admin -- no roles table,
 * no is_admin() check. See the 0014 migration for the RLS side of this
 * same decision.
 */
async function handleAdminRoute(request: NextRequest): Promise<NextResponse> {
  const { supabase, getResponse } = createMiddlewareClient(request);

  // IMPORTANT: no other logic between createMiddlewareClient and the
  // getClaims() call below -- the @supabase/ssr package's own
  // createServerClient doc comment and Supabase's Next.js SSR guide both
  // warn that inserting logic here is a common source of "random logout"
  // bugs, since it can end up reading stale/pre-refresh cookie state.
  const { data } = await supabase.auth.getClaims();
  const isAuthenticated = Boolean(data?.claims);

  const response = getResponse();
  const isLoginPage = request.nextUrl.pathname === ADMIN_LOGIN_PATH;

  if (!isAuthenticated && !isLoginPage) {
    return redirectPreservingCookies(request, ADMIN_LOGIN_PATH, response);
  }

  if (isAuthenticated && isLoginPage) {
    return redirectPreservingCookies(request, ADMIN_HOME_PATH, response);
  }

  return withSecurityHeaders(response);
}

export async function proxy(request: NextRequest) {
  // /admin is a separate, non-locale-prefixed route tree (its own root
  // layout under app/admin/, not app/[locale]/) -- it must never go
  // through next-intl's routing (which would otherwise try to redirect
  // e.g. /admin/login to /en/admin/login).
  if (request.nextUrl.pathname.startsWith("/admin")) {
    return handleAdminRoute(request);
  }

  const response = handleI18nRouting(request);
  return withSecurityHeaders(response);
}

export const config = {
  // Run on all page routes; skip API routes, Next.js internals, and files
  // with an extension (static assets). /admin is intentionally included
  // here (not excluded) -- it's handled by the branch above, not by
  // next-intl.
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
