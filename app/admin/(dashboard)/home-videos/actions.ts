"use server";

import { redirect } from "next/navigation";
import { updateTag } from "next/cache";
import { createSessionClient } from "@/lib/supabase/server";
import {
  createHomeVideo,
  updateHomeVideo,
  deleteHomeVideo,
} from "@/lib/admin/home-videos";
import type { HomeVideoActionState } from "@/types/admin-home-video";

/**
 * Thin "use server" wrappers, same split/reasoning as
 * hero-slides/actions.ts (Prompt 35). createSessionClient authorizes both
 * the home_videos TABLE writes (0014 migration) and the home-videos
 * BUCKET writes (0021 migration, this prompt) via the same session.
 *
 * updateTag("home_videos") -- confirmed by re-reading components/home/
 * VideosSection.tsx before writing this: its getActiveHomeVideos() had NO
 * cache tag at all, the identical gap Hero.tsx had before Prompt 35's
 * fix. Fixed there (see that file's own comment) and invalidated here on
 * every successful mutation.
 */

export async function createHomeVideoAction(
  _prevState: HomeVideoActionState,
  formData: FormData
): Promise<HomeVideoActionState> {
  const supabase = await createSessionClient();
  const result = await createHomeVideo(supabase, formData);

  if (result.status === "success") {
    updateTag("home_videos");
    redirect("/admin/home-videos");
  }

  return result;
}

export async function updateHomeVideoAction(
  id: string,
  _prevState: HomeVideoActionState,
  formData: FormData
): Promise<HomeVideoActionState> {
  const supabase = await createSessionClient();
  const result = await updateHomeVideo(supabase, id, formData);

  if (result.status === "success") {
    updateTag("home_videos");
    redirect("/admin/home-videos");
  }

  return result;
}

export async function deleteHomeVideoAction(
  id: string
): Promise<HomeVideoActionState> {
  const supabase = await createSessionClient();
  const result = await deleteHomeVideo(supabase, id);

  if (result.status === "success") {
    updateTag("home_videos");
  }

  return result;
}
