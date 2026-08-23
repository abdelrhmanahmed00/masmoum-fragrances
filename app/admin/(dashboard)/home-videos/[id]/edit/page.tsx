import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createSessionClient } from "@/lib/supabase/server";
import HomeVideoForm from "@/components/admin/HomeVideoForm";
import type { AdminHomeVideoRow } from "@/types/admin-home-video";

export const metadata: Metadata = {
  title: "Edit Home Video — Masmoum Admin",
  robots: { index: false, follow: false },
};

const HOME_VIDEO_COLUMNS =
  "id, storage_path, external_url, thumbnail_storage_path, caption_en, caption_ar, sort_order, is_active, created_at";

export default async function AdminEditHomeVideoPage({
  params,
}: PageProps<"/admin/home-videos/[id]/edit">) {
  const { id } = await params;

  const supabase = await createSessionClient();
  const { data, error } = await supabase
    .from("home_videos")
    .select(HOME_VIDEO_COLUMNS)
    .eq("id", id)
    .maybeSingle();

  if (error || !data) notFound();

  const video = data as unknown as AdminHomeVideoRow;

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <h1 className="text-xl font-semibold text-brand-black">
        Edit Home Video
      </h1>
      <div className="mt-6">
        <HomeVideoForm mode="edit" video={video} />
      </div>
    </div>
  );
}
