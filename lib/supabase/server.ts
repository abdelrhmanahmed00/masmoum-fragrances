import "server-only";
import { cookies } from "next/headers";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";

/**
 * Privileged Supabase client for server-only code (Route Handlers, Server
 * Actions, RSC data loaders). Uses SUPABASE_SERVICE_ROLE_KEY, which
 * bypasses Row Level Security — it must never reach the browser.
 *
 * The `server-only` import above enforces this at build time: importing
 * this file from a Client Component (or anything under components/ marked
 * "use client") will fail the build rather than leaking the key.
 */
export function createServiceRoleClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "Missing Supabase server environment variables: NEXT_PUBLIC_SUPABASE_URL and/or SUPABASE_SERVICE_ROLE_KEY."
    );
  }

  return createSupabaseClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

/**
 * Public, anon-privileged server-side client for Server Components / RSC
 * data loaders reading public content (catalog, site settings). Unlike
 * createServiceRoleClient above, this does NOT bypass RLS — reads are still
 * governed by each table's SELECT policy, so it's the right client for any
 * server-side fetch of data that's also safe to read with the anon key.
 *
 * Requests are wired into Next.js's fetch cache via `next.revalidate`, per
 * the ISR caching plan in lib/config.ts (REVALIDATE_SECONDS) — repeated
 * requests within that window are served from cache instead of hitting
 * Supabase again. Pass the relevant REVALIDATE_SECONDS value explicitly at
 * the call site rather than relying on a hidden default.
 *
 * `tags` (added Prompt 23): optional `next.tags` on the underlying fetch,
 * for on-demand invalidation via `revalidateTag()` from an admin mutation
 * — e.g. every category-touching read is tagged "categories" so a
 * category edit can invalidate every page that embeds category data
 * (category pages, collection pages, homepage product tabs, product
 * detail pages -- see lib/catalog.ts and the Prompt 23 report for exactly
 * which call sites carry which tags and why) in one call, without the
 * admin action needing to know every affected path/slug up front.
 */
export function createPublicClient(revalidateSeconds: number, tags?: string[]) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !anonKey) {
    throw new Error(
      "Missing Supabase public environment variables: NEXT_PUBLIC_SUPABASE_URL and/or NEXT_PUBLIC_SUPABASE_ANON_KEY."
    );
  }

  return createSupabaseClient(supabaseUrl, anonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: {
      fetch: (input, init) =>
        fetch(input, {
          ...init,
          next: { revalidate: revalidateSeconds, tags },
        }),
    },
  });
}

/**
 * Anon-privileged server-side client for MUTATIONS from Server Actions
 * (Prompt 19's quote submission and any future public-insert flow) — as
 * opposed to createPublicClient above, which is for cached GET-style reads.
 *
 * Deliberately not createServiceRoleClient: quote_requests/quote_request_items
 * (0008/0009 migrations) grant anon INSERT with RLS policies that already
 * express exactly the access this needs (status must be 'new'; nothing else
 * granted) — reaching for the service role here would bypass those policies
 * for no benefit, the opposite of least privilege. See the Prompt 19 report
 * for the full reasoning.
 *
 * Also deliberately not createPublicClient: that function wraps every fetch
 * with `next: { revalidate }`, which only makes sense for cacheable GET
 * reads. Supabase insert/update calls are POSTs, which Next's fetch cache
 * never caches regardless — reusing that helper here would carry a
 * `revalidateSeconds` parameter that doesn't apply to what it's doing,
 * which is misleading to read even though it'd be functionally harmless.
 * This client uses a plain, uncached fetch instead.
 */
export function createAnonMutationClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !anonKey) {
    throw new Error(
      "Missing Supabase public environment variables: NEXT_PUBLIC_SUPABASE_URL and/or NEXT_PUBLIC_SUPABASE_ANON_KEY."
    );
  }

  return createSupabaseClient(supabaseUrl, anonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

/**
 * Cookie-aware, session-aware anon client (Prompt 21 — admin auth). Unlike
 * the three clients above, this one is NOT anonymous-only: it reads the
 * caller's Supabase Auth session from cookies via @supabase/ssr's
 * getAll/setAll contract, so `.auth.getClaims()` / `.auth.getUser()` /
 * `.auth.signInWithPassword()` / `.auth.signOut()` all work against the
 * real logged-in admin (or lack thereof), and RLS's `auth.uid()` /
 * `to authenticated` policies (0014 migration) become meaningful.
 *
 * This is the exact "one function, two contexts" pattern from Supabase's
 * own SSR guide (https://supabase.com/docs/guides/auth/server-side/nextjs,
 * cross-checked against the actual @supabase/ssr APIs installed in this
 * project — see the Prompt 21 report):
 *   - In a Server Component, `cookieStore.set()` throws (Server Components
 *     can't write response cookies) — caught and ignored here. That's
 *     fine as long as proxy.ts's session refresh (lib/supabase/middleware.ts)
 *     is running, which it is for every /admin request; that's what
 *     actually keeps the session's access token fresh across requests.
 *   - In a Server Action or Route Handler, `cookieStore.set()` succeeds,
 *     which is required for sign-in/sign-out to actually persist.
 *
 * `cookies()` is awaited — required as of the async-dynamic-APIs change
 * (see the equivalent `await params` pattern used throughout app/, e.g.
 * app/[locale]/layout.tsx).
 */
export async function createSessionClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !anonKey) {
    throw new Error(
      "Missing Supabase public environment variables: NEXT_PUBLIC_SUPABASE_URL and/or NEXT_PUBLIC_SUPABASE_ANON_KEY."
    );
  }

  const cookieStore = await cookies();

  return createServerClient(supabaseUrl, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // Called from a Server Component -- see the function's own
          // comment above for why this is expected and harmless.
        }
      },
    },
  });
}
