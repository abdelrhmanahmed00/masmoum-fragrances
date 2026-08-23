"use server";

import { redirect } from "next/navigation";
import { updateTag } from "next/cache";
import { createSessionClient } from "@/lib/supabase/server";
import {
  createHeroSlide,
  updateHeroSlide,
  deleteHeroSlide,
} from "@/lib/admin/hero-slides";
import type { HeroSlideActionState } from "@/types/admin-hero";

/**
 * Thin "use server" wrappers, same split/reasoning as
 * categories/actions.ts -- createSessionClient (0014 migration already
 * grants `authenticated` full CRUD on hero_slides; the NEW piece this
 * prompt adds is the 0020 migration's storage.objects policies, which is
 * what actually authorizes the Storage upload/delete calls inside
 * lib/admin/hero-slides.ts, via this SAME session client).
 *
 * updateTag("hero_slides") -- confirmed by re-reading components/home/
 * Hero.tsx before writing this, not assumed: its getActiveHeroSlides()
 * currently carries NO cache tag at all (createPublicClient(REVALIDATE_SECONDS.marketing)
 * with no third argument), relying purely on the 30-minute ISR window.
 * That's a real gap for an admin CRUD that wants read-your-own-writes --
 * fixed by tagging that read "hero_slides" (see Hero.tsx's own updated
 * comment) and invalidating it here on every successful mutation, same
 * pattern as every other content type in this project.
 */

export async function createHeroSlideAction(
  _prevState: HeroSlideActionState,
  formData: FormData
): Promise<HeroSlideActionState> {
  const supabase = await createSessionClient();
  const result = await createHeroSlide(supabase, formData);

  if (result.status === "success") {
    updateTag("hero_slides");
    redirect("/admin/hero-slides");
  }

  return result;
}

export async function updateHeroSlideAction(
  id: string,
  _prevState: HeroSlideActionState,
  formData: FormData
): Promise<HeroSlideActionState> {
  const supabase = await createSessionClient();
  const result = await updateHeroSlide(supabase, id, formData);

  if (result.status === "success") {
    updateTag("hero_slides");
    redirect("/admin/hero-slides");
  }

  return result;
}

export async function deleteHeroSlideAction(
  id: string
): Promise<HeroSlideActionState> {
  const supabase = await createSessionClient();
  const result = await deleteHeroSlide(supabase, id);

  if (result.status === "success") {
    updateTag("hero_slides");
  }

  return result;
}
