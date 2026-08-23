import type { Metadata } from "next";
import Link from "next/link";
import { createSessionClient } from "@/lib/supabase/server";
import { getPublicStorageUrl } from "@/lib/supabase/storage";
import { getHomeVideos } from "@/lib/admin/home-videos";
import DeleteHomeVideoButton from "@/components/admin/DeleteHomeVideoButton";

export const metadata: Metadata = {
  title: "Home Videos — Masmoum Admin",
  robots: { index: false, follow: false },
};

// Card/grid, not a table -- same rationale as hero-slides (Prompt 35):
// thumbnail-first identification, small realistic count.
export default async function AdminHomeVideosPage() {
  const supabase = await createSessionClient();
  const videos = await getHomeVideos(supabase);

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-brand-black">
          Home Videos
        </h1>
        <Link
          href="/admin/home-videos/new"
          className="rounded-btn border border-brand-black bg-brand-black px-4 py-2 text-sm font-medium text-brand-white transition-colors hover:bg-brand-white hover:text-brand-black"
        >
          Add Video
        </Link>
      </div>

      {videos.length === 0 ? (
        <p className="mt-8 text-sm text-brand-gray">
          No videos yet -- the homepage is showing its empty-state
          fallback until at least one active video exists.
        </p>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {videos.map((video) => {
            const label = video.caption_en || video.caption_ar || "Untitled video";
            const previewUrl = video.thumbnail_storage_path
              ? getPublicStorageUrl("home-videos", video.thumbnail_storage_path)
              : null;

            return (
              <div
                key={video.id}
                className="overflow-hidden rounded-card border border-brand-border bg-brand-white"
              >
                <div className="relative aspect-video bg-brand-surface">
                  {previewUrl ? (
                    <img src={previewUrl} alt="" className="h-full w-full object-cover" />
                  ) : video.storage_path ? (
                    // No thumbnail set -- show the actual video muted,
                    // paused on its first frame, rather than a blank box.
                    <video
                      src={getPublicStorageUrl("home-videos", video.storage_path)}
                      muted
                      preload="metadata"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-xs text-brand-gray">
                      External link, no thumbnail
                    </div>
                  )}
                  <span
                    className={
                      "absolute start-2 top-2 rounded-full px-2 py-0.5 text-xs font-medium " +
                      (video.is_active
                        ? "bg-green-100 text-green-700"
                        : "bg-brand-white/90 text-brand-gray")
                    }
                  >
                    {video.is_active ? "Active" : "Inactive"}
                  </span>
                  <span className="absolute end-2 top-2 rounded-full bg-brand-white/90 px-2 py-0.5 text-xs font-medium text-brand-gray">
                    {video.storage_path ? "Uploaded" : "External"}
                  </span>
                </div>

                <div className="space-y-2 p-4">
                  <div>
                    <p className="font-medium text-brand-black">
                      {video.caption_en || (
                        <span className="text-brand-gray italic">
                          No caption
                        </span>
                      )}
                    </p>
                    {video.caption_ar ? (
                      <p className="text-xs text-brand-gray" dir="rtl">
                        {video.caption_ar}
                      </p>
                    ) : null}
                  </div>
                  <p className="text-xs text-brand-gray">
                    Sort order: {video.sort_order}
                  </p>

                  <div className="flex items-center gap-3 pt-1">
                    <Link
                      href={`/admin/home-videos/${video.id}/edit`}
                      className="text-sm text-brand-black underline-offset-2 hover:underline"
                    >
                      Edit
                    </Link>
                    <DeleteHomeVideoButton id={video.id} label={label} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
