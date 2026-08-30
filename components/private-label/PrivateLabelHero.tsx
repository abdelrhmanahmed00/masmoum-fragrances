import Image from "next/image";
import { getTranslations } from "next-intl/server";

/**
 * Prompt 92 (Phase 1) -- re-inspected the reference (gulforchid.com/
 * private-label) fresh via its real page-specific Elementor CSS
 * (wp-content/uploads/elementor/css/post-18751.css), not a screenshot.
 * Real structure confirmed: this is TWO stacked parts, not one section
 * with text overlaid on the image --
 *
 *   1. A plain full-bleed background-image band, no text on it at all
 *      (confirmed: its `bdt-prime-slider-content`/`-desc` wrapper divs
 *      are empty in the real markup). Real slideshow config:
 *      `{"ratio":"16:6","min-height":374,...}` -- aspect-[16/6] with a
 *      374px floor, replicated below via `aspect-[16/6] min-h-[374px]`.
 *
 *   2. A separate white-background text section immediately below it,
 *      split into two flex columns (real CSS vars, element
 *      -5fd79b6f/-1749c7a/-1b3ad21b):
 *        section padding: 8% top/bottom, 5% left/right desktop;
 *          15%/16% top/bottom, 5% left/right at max-width:767px
 *        left column (tagline + heading): 40% width at min-width:768px
 *        right column (subtext + CTA): 50% width at min-width:768px,
 *          padding-top 4%, padding-bottom 2%, padding-left 6%,
 *          justify-content:flex-end (bottom-aligned)
 *      Typography (real, cited, not estimated):
 *        tagline (.qodef-m-subtitle): font-size 14px (12px <=1024px),
 *          font-weight 500, uppercase, letter-spacing 0.12em
 *        heading (.qodef-m-title): font-size 44px (30px at their own
 *          mobile breakpoint), line-height 1em, letter-spacing -0.04em
 *        subtext (.elementor-heading-title): font-size 17px (15px at
 *          their own breakpoint), line-height 1.4em
 *        CTA (.qodef-qi-button): font-size 13px, font-weight 500,
 *          uppercase, letter-spacing 0.1em
 *      Colors are THIS project's own gold/black tokens throughout, not
 *      the reference's -- tagline text-brand-gold (they use #C8A27D,
 *      close to this project's own brand-gold #dcb689 in role/warmth,
 *      not copied verbatim), heading/subtext text-brand-black. The CTA
 *      itself reuses this project's OWN established prominent-button
 *      convention (solid gold pill, inverts to black on hover -- Hero's
 *      "Shop Now", Prompts 58/68/71) rather than the reference's plain
 *      text+arrow link style, per this project's "own gold/black brand
 *      tokens... not the reference's" instruction.
 *
 * Copy is this project's own (task-specified), not the reference's --
 * the reference's real heading here is actually "Why Work With Us" with
 * "We help businesses worldwide create premium perfumes..." underneath,
 * confirmed via the real markup, but explicitly NOT reused verbatim per
 * this prompt's own instruction.
 */
export default async function PrivateLabelHero({
  imageUrl,
  ctaHref,
}: {
  imageUrl: string | null;
  ctaHref: string;
}) {
  const t = await getTranslations("PrivateLabel");

  return (
    // pt-header-offset lg:pt-header-offset-lg -- same "flush against the
    // fixed header, zero deliberate gap" treatment as the homepage's own
    // Hero (HeroSlider.tsx, Prompt 72/73/84), not the other marketing
    // pages' "clear it with real breathing room" convention: this is a
    // full-bleed image band at the very top of the page, the same kind
    // of element the homepage precedent was established for.
    <section className="pt-header-offset lg:pt-header-offset-lg">
      {/* Part 1: full-bleed image band, no text overlay (matches the
          reference's own real structure -- see this file's top comment).
          Graceful placeholder when no image has been uploaded yet
          (admin section, Prompt 92) -- never a broken/empty band. */}
      <div className="relative aspect-[16/6] min-h-[374px] w-full bg-brand-surface">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-brand-gray">
            <svg
              viewBox="0 0 24 24"
              className="h-12 w-12"
              fill="none"
              stroke="currentColor"
              strokeWidth={1}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 16.5V6a1 1 0 011-1h16a1 1 0 011 1v12a1 1 0 01-1 1H4a1 1 0 01-1-1zm0 0l6-6 4 4 3-3 5 5"
              />
              <circle cx="8" cy="8" r="1.5" />
            </svg>
          </div>
        )}
      </div>

      {/* Part 2: the real text section -- white background, two columns
          at md+ (768px, matching the reference's own 768px breakpoint),
          stacked on mobile. Real percentage padding/widths cited above,
          encoded via Tailwind arbitrary values rather than rounded to
          the nearest standard scale step, matching this project's own
          established "encode real measured values precisely" precedent
          (e.g. Prompt 60's gold-highlight technique). */}
      <div className="bg-brand-white px-[5%] py-[15%] md:flex md:py-[8%]">
        <div className="md:flex md:w-[40%] md:flex-col">
          <p className="text-[12px] font-medium tracking-[0.12em] text-brand-gold uppercase md:text-[14px]">
            {t("tagline")}
          </p>
          <h1 className="mt-2 text-[30px] leading-[1em] tracking-[-0.04em] text-brand-black md:mt-3 md:text-[44px]">
            {t("heading")}
          </h1>
        </div>

        <div className="mt-6 md:mt-0 md:flex md:w-[50%] md:flex-col md:justify-end md:ps-[6%] md:pt-[4%] md:pb-[2%]">
          <p className="text-[15px] leading-[1.4em] text-brand-black md:text-[17px]">
            {t("subtext")}
          </p>
          <a
            href={ctaHref}
            target={ctaHref.startsWith("http") ? "_blank" : undefined}
            rel={ctaHref.startsWith("http") ? "noreferrer" : undefined}
            className="mt-5 inline-block w-fit rounded-full border border-brand-black/60 bg-brand-gold px-8 py-3 text-[13px] font-medium tracking-[0.1em] text-brand-black uppercase shadow-lg transition-colors hover:border-brand-black hover:bg-brand-black hover:text-brand-gold"
          >
            {t("cta")}
          </a>
        </div>
      </div>
    </section>
  );
}
