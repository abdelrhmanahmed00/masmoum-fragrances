"use server";

import { updateTag } from "next/cache";
import { createSessionClient } from "@/lib/supabase/server";
import { updateBottleColorImage } from "@/lib/admin/bottle-color-images";
import type { BottleColorImageActionState } from "@/types/admin-bottle-colors";

/**
 * Thin "use server" wrapper, same split/reasoning as
 * app/admin/(dashboard)/private-label/actions.ts /
 * app/admin/(dashboard)/perfume-gender/actions.ts -- createSessionClient
 * (0036 migration grants `authenticated` full CRUD on both the table and
 * the bottle-color-images bucket). No redirect() on success -- this page
 * shows all 5 slots on one screen and each upload should just refresh in
 * place, not navigate away.
 *
 * updateTag("bottle_color_images") -- the ONLY reader of this tag will be
 * the Phase 2 customer-facing designer page (not built yet) -- one tag
 * covers this feature completely, same one-tag-per-content-type
 * convention as every other admin section.
 */
export async function updateBottleColorImageAction(
  slot: string,
  _prevState: BottleColorImageActionState,
  formData: FormData
): Promise<BottleColorImageActionState> {
  const supabase = await createSessionClient();
  const result = await updateBottleColorImage(supabase, slot, formData);

  if (result.status === "success") {
    updateTag("bottle_color_images");
  }

  return result;
}
