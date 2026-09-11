"use server";

import { redirect } from "next/navigation";
import { createSessionClient } from "@/lib/supabase/server";
import { updateDesignRequestStatus } from "@/lib/admin/design-requests";
import type { DesignRequestStatusActionState } from "@/types/admin-design-request";

/**
 * Thin "use server" wrapper, byte-for-byte the same shape as Quote
 * Requests' own updateQuoteRequestStatusAction -- see that file's own
 * comment for the full reasoning (createSessionClient, the 0036
 * migration's design_requests_admin_update policy already grants
 * `authenticated` UPDATE, no new RLS policy needed for this prompt).
 *
 * No updateTag() call here either, for the identical reason: no PUBLIC
 * page anywhere reads design_requests (lib/bottle-colors.ts only reads
 * bottle_color_images, a completely different table) -- the only readers
 * are this admin section's own two pages, both plain uncached
 * supabase-js queries via createSessionClient(). Nothing to invalidate.
 *
 * redirect() back to the detail page on success, same reasoning as
 * Quote Requests' own action -- guarantees both the heading's badge and
 * the status control's own selection reflect the freshly-persisted
 * value from a real server re-render.
 */
export async function updateDesignRequestStatusAction(
  id: string,
  _prevState: DesignRequestStatusActionState,
  formData: FormData
): Promise<DesignRequestStatusActionState> {
  const supabase = await createSessionClient();
  const status = formData.get("status");

  if (typeof status !== "string") {
    return { status: "error", message: "Invalid status." };
  }

  const result = await updateDesignRequestStatus(supabase, id, status);

  if (result.status === "success") {
    redirect(`/admin/design-requests/${id}`);
  }

  return result;
}
