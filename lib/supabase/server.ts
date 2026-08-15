import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

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
 */
export function createPublicClient(revalidateSeconds: number) {
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
        fetch(input, { ...init, next: { revalidate: revalidateSeconds } }),
    },
  });
}
