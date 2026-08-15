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
    "script-src 'self'",
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
