import { createPublicClient } from "@/lib/supabase/server";
import { getPublicStorageUrl } from "@/lib/supabase/storage";
import { REVALIDATE_SECONDS } from "@/lib/config";
import type { HeroSlide } from "@/types/hero";
import HeroSlider from "./HeroSlider";
import HeroEmptyState from "./HeroEmptyState";

/**
 * hero_slides has 0 rows until the client sends real photography — see
 * HeroEmptyState. Uses REVALIDATE_SECONDS.marketing (ISR, not a fresh
 * fetch per request) since this is homepage marketing content per the
 * caching plan in lib/config.ts.
 */
async function getActiveHeroSlides(): Promise<HeroSlide[]> {
  const supabase = createPublicClient(REVALIDATE_SECONDS.marketing);
  const { data, error } = await supabase
    .from("hero_slides")
    .select(
      "id, storage_path, headline_en, headline_ar, subheadline_en, subheadline_ar, cta_label_en, cta_label_ar, cta_href, sort_order"
    )
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  // Graceful degradation: a fetch error renders the same empty state as a
  // genuinely empty table, never a broken page.
  if (error || !data) return [];
  return data;
}

export default async function Hero() {
  const slides = await getActiveHeroSlides();

  if (slides.length === 0) {
    return <HeroEmptyState />;
  }

  const slidesWithUrls = slides.map((slide) => ({
    ...slide,
    imageUrl: getPublicStorageUrl("hero-images", slide.storage_path),
  }));

  return <HeroSlider slides={slidesWithUrls} />;
}
