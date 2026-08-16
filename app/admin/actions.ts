"use server";

import { redirect } from "next/navigation";
import { createSessionClient } from "@/lib/supabase/server";

/** Zero-arg Server Action -- bind directly to a form's `action`, no
 *  hidden fields needed. Uses createSessionClient (same as sign-in) so
 *  the session cookie actually gets cleared, not just ignored. */
export async function signOut() {
  const supabase = await createSessionClient();
  await supabase.auth.signOut();
  redirect("/admin/login");
}
