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
