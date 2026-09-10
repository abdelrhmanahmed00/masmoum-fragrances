"use server";

import { updateTag } from "next/cache";
import { createSessionClient } from "@/lib/supabase/server";
import { updatePerfumeGenderImage } from "@/lib/admin/perfume-gender-images";
import type { PerfumeGenderImageActionState } from "@/types/admin-perfume-gender";

/**
 * Thin "use server" wrapper, same split/reasoning as
 * app/admin/(dashboard)/private-label/actions.ts -- createSessionClient
 * (0034 migration grants `authenticated` full CRUD on both the table and
 * the perfume-gender-images bucket). No redirect() on success -- this
 * page shows all 3 slots on one screen and each upload should just
 * refresh in place, not navigate away.
 *
 * updateTag("perfume_gender_images") -- the ONLY reader of this tag is
 * lib/perfume-gender.ts's getPerfumeGenderImageMap, which the public
 * /categories/perfumes sub-template calls -- one tag covers this feature
 * completely, same one-tag-per-content-type convention as every other
 * admin section.
 */
export async function updatePerfumeGenderImageAction(
  slot: string,
  _prevState: PerfumeGenderImageActionState,
  formData: FormData
): Promise<PerfumeGenderImageActionState> {
  const supabase = await createSessionClient();
  const result = await updatePerfumeGenderImage(supabase, slot, formData);

  if (result.status === "success") {
    updateTag("perfume_gender_images");
  }

  return result;
}
