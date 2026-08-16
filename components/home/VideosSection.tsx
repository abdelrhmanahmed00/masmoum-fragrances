import { getTranslations } from "next-intl/server";
import { createPublicClient } from "@/lib/supabase/server";
import { getPublicStorageUrl } from "@/lib/supabase/storage";
import { REVALIDATE_SECONDS } from "@/lib/config";
import type { HomeVideo } from "@/types/home-video";
import VideosCarousel from "./VideosCarousel";

/**
 * home_videos has 0 rows until the client sends real video content — same
 * "0 rows is the current correct state, not a bug" situation as Hero and
 * ProductsSection. Uses REVALIDATE_SECONDS.marketing (ISR), matching the
 * caching plan in lib/config.ts.
 */
async function getActiveHomeVideos(): Promise<HomeVideo[]> {
  const supabase = createPublicClient(REVALIDATE_SECONDS.marketing);
  const { data, error } = await supabase
    .from("home_videos")
    .select(
      "id, storage_path, external_url, thumbnail_storage_path, caption_en, caption_ar, sort_order"
    )
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (error || !data) return [];
  return data;
}

export default async function VideosSection() {
  const t = await getTranslations("Videos");
  const videos = await getActiveHomeVideos();

  return (
    <section className="mx-auto max-w-7xl px-4 py-12 md:py-16 lg:px-8">
      <h2 className="mb-8 text-center text-2xl font-medium text-brand-black md:text-3xl">
        {t("heading")}
      </h2>

      {videos.length === 0 ? (
        <div className="py-16 text-center text-brand-gray">
          <p>{t("emptyState")}</p>
        </div>
      ) : (
        <VideosCarousel
          videos={videos.map((video) => ({
            id: video.id,
            videoUrl: video.storage_path
              ? getPublicStorageUrl("home-videos", video.storage_path)
              : null,
            externalUrl: video.external_url,
            posterUrl: video.thumbnail_storage_path
              ? getPublicStorageUrl("home-videos", video.thumbnail_storage_path)
              : null,
            caption_en: video.caption_en,
            caption_ar: video.caption_ar,
          }))}
        />
      )}
    </section>
  );
}
