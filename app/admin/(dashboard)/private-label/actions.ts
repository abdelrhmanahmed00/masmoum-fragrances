"use server";

import { updateTag } from "next/cache";
import { createSessionClient } from "@/lib/supabase/server";
import { updatePrivateLabelImage } from "@/lib/admin/private-label-images";
import type { PrivateLabelImageActionState } from "@/types/admin-private-label";

/**
 * Thin "use server" wrapper, same split/reasoning as every other admin
 * actions.ts file -- createSessionClient (0028 migration grants
 * `authenticated` full CRUD on both the table and the
 * private-label-images bucket). No redirect() on success -- unlike
 * create/update forms elsewhere, this page shows all 7 slots on one
 * screen and each upload should just refresh in place, not navigate
 * away.
 *
 * updateTag("private_label_images") -- the ONLY reader of this tag is
 * lib/private-label.ts's getPrivateLabelImageMap, which the public
 * /private-label page calls -- one tag covers this feature completely,
 * same one-tag-per-content-type convention as every other admin section.
 */
export async function updatePrivateLabelImageAction(
  slot: string,
  _prevState: PrivateLabelImageActionState,
  formData: FormData
): Promise<PrivateLabelImageActionState> {
  const supabase = await createSessionClient();
  const result = await updatePrivateLabelImage(supabase, slot, formData);

  if (result.status === "success") {
    updateTag("private_label_images");
  }

  return result;
}
