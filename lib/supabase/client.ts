import { createBrowserClient } from "@supabase/ssr";

/**
 * Browser Supabase client — safe to use in Client Components ("use client").
 * Uses only the public URL and anon key; all data access is governed by
 * Row Level Security policies on the Supabase side. Never import the
 * service role key here — see lib/supabase/server.ts for privileged access.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
