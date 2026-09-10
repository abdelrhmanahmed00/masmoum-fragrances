import { getTranslations } from "next-intl/server";
import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { getPerfumeGenderImageMap } from "@/lib/perfume-gender";
import { VALID_GENDERS } from "@/lib/catalog";

/**
 * Prompt 127 (Phase 3) -- the "Perfumes" category's special intermediate
 * sub-template: 3 large gender tiles (Men / Women / Unisex), shown INSTEAD
 * of the normal product grid when /categories/perfumes is visited with no
 * ?gender= param. Scoped entirely to the "perfumes" slug -- every other
 * category page is completely unaffected, since this component is only
 * ever rendered by that one page's own slug check (see
 * app/[locale]/(marketing)/categories/[slug]/page.tsx).
 *
 * Deliberately reuses `VALID_GENDERS` (lib/catalog.ts, Prompt 9) for the
 * tile ORDER/VALUES rather than hardcoding ["men","women","unisex"] a
 * second time -- if that array's order or membership ever changes, this
 * template follows automatically, same "single source of truth" reasoning
 * as PERFUME_GENDER_SLOTS itself using the identical string values.
 *
 * Each tile links to `${basePath}?gender=<value>` -- PURE navigation into
 * the category page's own already-working gender-filtered product grid
 * (Prompt 9/24) and brand filter row (Prompt 126, Phase 2). No new
 * filtering logic exists here or needs to: this component never fetches
 * products at all, only the 3 tile images.
 *
 * Dark-gradient-over-image overlay technique reused verbatim from
 * HeroSlider.tsx (Prompt 8) / CategoryTemplatesStrip.tsx (Prompt 125) --
 * not reinvented a third time. Text is CENTERED (not bottom-anchored like
 * those two) -- a deliberate difference for this "luxury full-tile"
 * composition (3 large, evenly-weighted panels) vs. a caption-style
 * overlay on a smaller card/banner.
 */
export default async function PerfumeGenderTemplate({
  basePath,
}: {
  basePath: string;
}) {
  const t = await getTranslations("Products");
  const images = await getPerfumeGenderImageMap();

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {VALID_GENDERS.map((gender) => {
        const imageUrl = images[gender];
        return (
          <Link
            key={gender}
            href={`${basePath}?gender=${gender}`}
            className="group relative flex h-[280px] items-center justify-center overflow-hidden rounded-card bg-brand-surface sm:h-[420px]"
          >
            {imageUrl ? (
              <>
                <Image
                  src={imageUrl}
                  alt=""
                  fill
                  sizes="(min-width: 640px) 33vw, 100vw"
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                />
                {/* Same dark-gradient overlay technique as HeroSlider.tsx/
                    CategoryTemplatesStrip.tsx, reused verbatim -- see this
                    file's own top comment. */}
                <div className="absolute inset-0 bg-gradient-to-t from-brand-black/70 via-brand-black/20 to-transparent" />
              </>
            ) : (
              // Graceful placeholder -- same empty-state SVG glyph as
              // every other "not yet uploaded" image in this project
              // (ProductCard.tsx, CategoryTemplatesStrip.tsx).
              <svg
                viewBox="0 0 24 24"
                className="absolute h-12 w-12 text-brand-gray"
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
            )}

            <div className="relative flex flex-col items-center gap-4 px-6 text-center">
              <span
                className={
                  "text-2xl font-bold tracking-wide uppercase sm:text-3xl " +
                  (imageUrl ? "text-brand-white" : "text-brand-black")
                }
              >
                {t(`gender.${gender}`)}
              </span>
              <span
                className={
                  "rounded-full border px-6 py-2 text-sm font-semibold tracking-wide uppercase transition-colors " +
                  (imageUrl
                    ? "border-brand-white text-brand-white group-hover:bg-brand-white group-hover:text-brand-black"
                    : "border-brand-black text-brand-black group-hover:bg-brand-black group-hover:text-brand-white")
                }
              >
                {t("enter")}
              </span>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
