import { getLocale, getTranslations } from "next-intl/server";
import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { getCategoryTemplates } from "@/lib/catalog";
import { getPublicStorageUrl } from "@/lib/supabase/storage";

/**
 * Prompt 125 -- Category Templates Strip (Phase 1). New homepage section,
 * placed after Hero and before ProductsSection ("Our Products") --
 * additive, not a replacement for either. One tile per ACTIVE category
 * (is_active = true), ordered by sort_order -- same active-only/ordering
 * convention as every other category listing in this project
 * (getActiveCategoriesList, ProductsSection's own tabs). A new category
 * automatically gets a new tile with zero code changes: this component
 * has no hardcoded category list anywhere, it only ever renders whatever
 * getCategoryTemplates() returns.
 *
 * Deliberately a plain async Server Component, not a Client Component --
 * unlike HeroSlider (autoplay/pause state) or VideosCarousel (per-video
 * mute state), this strip has no interactive state of its own: it's a
 * CSS-only horizontal-scroll row (mobile) that becomes a wrapping flex
 * row (desktop, `md:flex-wrap md:overflow-visible`) via pure Tailwind
 * classes, same "server fetches, no client boundary needed" reasoning as
 * Footer.tsx/CategoryTemplatesStrip's sibling sections.
 *
 * Layout: `flex flex-wrap` was rejected in favor of `md:flex-wrap` kept
 * OFF the mobile breakpoint specifically -- flex-wrap at narrow widths
 * would stack tiles into a multi-row grid instead of the requested
 * "horizontal scrollable row (mobile)"; switching wrap on only at `md:`
 * (and disabling scroll-snap/overflow there) is what actually produces
 * "grid or flex row (desktop)" while keeping mobile a real horizontal
 * scroller. A rigid `grid-cols-N` was rejected for desktop specifically
 * because N must equal the current category count for a clean layout --
 * a flex-wrap row has no such coupling, so it stays correct at any
 * category count (the whole point of "new categories automatically get a
 * new tile," which a hardcoded column count would quietly break).
 */
export default async function CategoryTemplatesStrip() {
  const locale = await getLocale();
  const t = await getTranslations("CategoryTemplates");
  const categories = await getCategoryTemplates();

  if (categories.length === 0) {
    return null;
  }

  return (
    <section className="mx-auto max-w-7xl px-4 py-12 md:py-16 lg:px-8">
      {/* Same heading treatment (type scale + gold "highlighter" band) as
          every other homepage section -- see VideosSection.tsx's own
          comment for the full research behind this exact technique
          (re-inspected shop-gulforchid.com's real inline CSS, Prompt 60),
          reused verbatim here, not reinvented. */}
      <h2 className="mb-8 text-center text-2xl font-medium text-brand-black md:text-3xl">
        <span className="relative inline-block">
          <span
            aria-hidden="true"
            className="absolute inset-x-0 bottom-[10%] -z-10 h-[0.55em] bg-brand-gold/40"
          />
          {t("heading")}
        </span>
      </h2>

      <div
        className="flex gap-3.5 overflow-x-auto snap-x snap-mandatory [-ms-overflow-style:none] [scrollbar-width:none] md:flex-wrap md:justify-center md:overflow-visible md:snap-none [&::-webkit-scrollbar]:hidden"
      >
        {categories.map((category) => {
          const name = locale === "ar" ? category.name_ar : category.name_en;
          const imageUrl = category.image_storage_path
            ? getPublicStorageUrl("category-images", category.image_storage_path)
            : null;

          return (
            <Link
              key={category.id}
              href={`/categories/${category.slug}`}
              className="relative aspect-[4/5] w-32 flex-none snap-start overflow-hidden rounded-card bg-brand-surface sm:w-40 md:w-44"
            >
              {imageUrl ? (
                <>
                  <Image
                    src={imageUrl}
                    alt=""
                    fill
                    sizes="(min-width: 768px) 176px, (min-width: 640px) 160px, 128px"
                    className="object-cover"
                  />
                  {/* Same dark-gradient-over-image overlay technique as
                      HeroSlider.tsx's own text-over-image treatment
                      (Prompt 8) -- reused verbatim, not a new overlay
                      invented for this component. */}
                  <div className="absolute inset-0 flex items-end bg-gradient-to-t from-brand-black/60 via-transparent to-transparent">
                    <span className="w-full px-3 pb-3 text-sm font-bold text-brand-white md:text-base">
                      {name}
                    </span>
                  </div>
                </>
              ) : (
                // Graceful placeholder -- same empty-state SVG glyph and
                // treatment as ProductCard.tsx's own "no image yet" state
                // (a category should eventually have a real image, but
                // this must never crash/look broken if one doesn't). Dark
                // text here, not white -- the placeholder's own
                // background is light (bg-brand-surface, set on the Link
                // above), so white text would fail contrast; the
                // gradient overlay used for real images doesn't apply
                // since there's no image underneath it to darken.
                <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-brand-gray">
                  <svg
                    viewBox="0 0 24 24"
                    className="h-8 w-8"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={1.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M3 16.5V6a1 1 0 011-1h16a1 1 0 011 1v12a1 1 0 01-1 1H4a1 1 0 01-1-1zm0 0l6-6 4 4 3-3 5 5"
                    />
                    <circle cx="8" cy="8" r="1.5" />
                  </svg>
                  <span className="px-2 text-center text-sm font-bold text-brand-black">
                    {name}
                  </span>
                </div>
              )}
            </Link>
          );
        })}
      </div>
    </section>
  );
}
