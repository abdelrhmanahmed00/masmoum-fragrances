import "server-only";
import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

/**
 * Supabase client for use inside proxy.ts (Next.js's middleware) —
 * Prompt 21's admin auth. Separate from lib/supabase/server.ts's
 * createSessionClient: middleware runs before any Server Component and
 * has no next/headers cookies() to read from — it works directly against
 * the NextRequest/NextResponse pair instead, which is why @supabase/ssr
 * ships a distinct pattern for it (confirmed against
 * https://supabase.com/docs/guides/auth/server-side/nextjs and
 * cross-checked with multiple independent current examples using the
 * same request.cookies.getAll()/response.cookies.set() shape — see the
 * Prompt 21 report for what was actually checked).
 *
 * The getAll/setAll dance below (mutate `request.cookies` AND rebuild
 * `response` from that mutated request, THEN mirror the same cookies onto
 * `response.cookies`) is required, not decorative: it's what lets a
 * refreshed token be visible to (a) any Server Component rendered later
 * in this same request via next/headers cookies(), and (b) the browser,
 * via the Set-Cookie header on the final response. Getting this wrong is
 * exactly what the installed @supabase/ssr package's own createServerClient
 * doc comment warns causes "significant and difficult to debug
 * authentication issues."
 */
export function createMiddlewareClient(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  return {
    supabase,
    /** A function, not a value: setAll (triggered by awaiting
     *  getClaims()/getUser() below) reassigns the closed-over `response`
     *  variable above. Call this AFTER that await to read the current
     *  value, not the stale pre-refresh one. */
    getResponse: () => response,
  };
}
