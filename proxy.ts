import createIntlMiddleware from "next-intl/middleware";
import type { NextRequest } from "next/server";
import { routing } from "@/i18n/routing";

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
    "script-src 'self' 'unsafe-inline'",
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

export function proxy(request: NextRequest) {
  const response = handleI18nRouting(request);

  for (const [key, value] of Object.entries(securityHeaders())) {
    response.headers.set(key, value);
  }

  return response;
}

export const config = {
  // Run on all page routes; skip API routes, Next.js internals, and files
  // with an extension (static assets).
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
