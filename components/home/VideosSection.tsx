import { getTranslations } from "next-intl/server";
import { createPublicClient } from "@/lib/supabase/server";
import { getPublicStorageUrl } from "@/lib/supabase/storage";
import { REVALIDATE_SECONDS } from "@/lib/config";
import type { HomeVideo } from "@/types/home-video";
import VideosCarousel from "./VideosCarousel";

/**
 * home_videos had 0 rows until Prompt 37's admin CRUD -- same "0 rows is
 * the current correct state, not a bug" situation Hero and ProductsSection
 * started from. Uses REVALIDATE_SECONDS.marketing (ISR), matching the
 * caching plan in lib/config.ts.
 *
 * Tagged "home_videos" (added Prompt 37) -- this read had NO tag at all
 * before (confirmed by re-reading this exact function before building
 * admin mutations that need it invalidated -- the identical gap Hero.tsx
 * had before Prompt 35's fix). An admin adding/editing/deleting a video
 * now calls updateTag("home_videos")
 * (app/admin/(dashboard)/home-videos/actions.ts) for the same
 * read-your-own-writes guarantee every other content type has.
 */
async function getActiveHomeVideos(): Promise<HomeVideo[]> {
  const supabase = createPublicClient(REVALIDATE_SECONDS.marketing, [
    "home_videos",
  ]);
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
      {/* Prompt 76: same gold-highlight-behind-heading technique built in
          Prompt 60 for "Our Products" (ProductsSection.tsx) -- reused
          verbatim, not reinterpreted (see that file's own comment for
          the full derivation: the real reference-site technique found,
          the contrast math behind bg-brand-gold/40, and the multi-line-
          wrap analysis). Applies unchanged here because this heading
          uses the EXACT same type scale (text-2xl font-medium
          md:text-3xl) as "Our Products" -- no resizing/reinterpretation
          needed, the /40 opacity and 0.55em/10% sizing were derived for
          that font size and this one is identical.
          Wrap check (not assumed): "See It In Action" is 17 characters;
          at this font size the same ~0.55em-per-character estimate used
          in Prompt 60 gives ~9.35em (~224px at 24px) -- comfortably under
          a 320px viewport's available width after this section's own
          px-4 gutter, same margin of safety Prompt 60 found for "Our
          Products". Arabic "شاهدها عن قرب" is shorter still. */}
      <h2 className="mb-8 text-center text-2xl font-medium text-brand-black md:text-3xl">
        <span className="relative inline-block">
          <span
            aria-hidden="true"
            className="absolute inset-x-0 bottom-[10%] -z-10 h-[0.55em] bg-brand-gold/40"
          />
          {t("heading")}
        </span>
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
