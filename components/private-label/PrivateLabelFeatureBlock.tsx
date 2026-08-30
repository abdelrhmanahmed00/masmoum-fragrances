import Image from "next/image";
import { getTranslations } from "next-intl/server";
import Reveal from "@/components/private-label/Reveal";

/**
 * Prompt 94 (Phase 3) -- re-inspected the reference fresh
 * (gulforchid.com/private-label, page CSS post-18751.css) for these
 * exact two sections. Real structure found: elements `7d55df23` (Block
 * A) and `766278cd` (Block B), each a two-column flex row -- one column
 * a large square "parallax image" widget, the other a `qodef-m-subtitle`
 * eyebrow ("Crafted with Precision") above a 3-item ACCORDION widget
 * (title + paragraph per item, first item open by default, others
 * collapsed on click).
 *
 * Real column layout (measured via actual getBoundingClientRect at a
 * 1440px viewport, not guessed from the CSS custom-property soup alone):
 * image column ~570px, text column ~560px inside an effective ~1140px
 * content width -- essentially a 50/50 split, same real proportion
 * already reused for PrivateLabelExperience.tsx's own column split.
 * Column gap: 10px at >1024px (base rule), but 32px at the
 * max-width:1024px breakpoint -- since this project's own two-column
 * breakpoint is 768px (`md:`), the 32px value is what's actually visible
 * right at that transition, so that's the one reused here
 * (`md:gap-8` = 32px), not the desktop-only 10px value.
 *
 * CONFIRMED real alternation: Block A's image column comes FIRST in the
 * source (x=150, left) with the text column second (x=730, right); Block
 * B's text column comes FIRST (x=150, left) with the image column second
 * (x=725, right) -- a genuine mirrored alternation between the two
 * blocks, replicated below via DOM source order (image-first vs.
 * text-first) rather than `flex-row-reverse`, so RTL's own native row-
 * reversal still lands correctly for both blocks without double-
 * flipping.
 *
 * Real section padding: Block A (`7d55df23`) padding-top 8%, padding-
 * bottom 0%, left/right 5%; Block B (`766278cd`) padding-top 12%,
 * padding-bottom 12%, left/right 5% -- a real, deliberate difference
 * (Block B carries its own bottom breathing room since Block A's is 0),
 * not smoothed to match.
 *
 * Real typography, computed on the live page:
 *   subtitle (.qodef-m-subtitle): font-size 14px, font-weight 500,
 *     letter-spacing 1.68px (~0.12em), uppercase, color #C8A27D --
 *     this is the EXACT SAME eyebrow-subtitle component already found
 *     and reused for this page's own Hero tagline (Prompt 92,
 *     PrivateLabelHero.tsx's `text-[12px]/[14px] font-medium
 *     tracking-[0.12em] uppercase text-brand-gold`), so reused here
 *     verbatim rather than re-encoded as a new value.
 *   accordion item title: font-size 19px, font-weight 700 (bold), color
 *     #000, line-height 26.6px (~1.4)
 *   accordion item paragraph: font-size 16px, color rgba(0,0,0,.73),
 *     line-height 27.2px (~1.7) -- the partial-opacity black is NOT
 *     reused (no other body copy in this project uses a translucent
 *     text color); mapped to this project's own established
 *     text-brand-black body-copy convention instead (same choice already
 *     made for PrivateLabelExperience.tsx's bullet text).
 *
 * Content is this project's own (task-specified headings + original 1-2
 * sentence copy), NOT the reference's real paragraph text, though the 3
 * item HEADINGS happen to match the reference's own real headings
 * verbatim per this task's explicit instruction.
 *
 * The reference renders these 3 items as an interactive click-to-expand
 * accordion (only one open at a time). This task explicitly asks for "3
 * short sub-headings + a brief paragraph EACH" -- read as always-visible
 * content, not a collapsed interactive widget -- so all 3 items render
 * fully expanded here, matching this same page's own established
 * pattern of flattening the reference's interactive widgets into plain
 * static content (Phase 2 did the same for the reference's icon-list).
 *
 * Prompt 102 -- scroll-reveal added via components/private-label/
 * Reveal.tsx (see that file's own top comment for the real reference
 * animation research + dependency-free decision): the eyebrow reveals
 * first, each of the 3 items stagger-reveals after it, the image
 * reveals from a slightly zoomed + offset state in parallel.
 *
 * Prompt 104 -- `background` prop added (this component is shared by
 * both Block A and Block B, per-instance variant, not hardcoded
 * duplication). One of this page's 3 large-image sections (this one x2,
 * Experience) gets white/black/beige each for scroll rhythm as you
 * scroll top to bottom:
 *
 *   Hero(white) -> Experience(BEIGE, cream) -> Block A(WHITE, unchanged)
 *   -> Block B(BLACK) -> Comparison Table(gray/surface, fixed, Prompt 95)
 *   -> Closing Highlights(white, fixed) -> Closing CTA(black, fixed,
 *   Prompt 96)
 *
 * Reasoning: Hero's own text half is already white, so keeping
 * Experience white too would repeat the exact monotony this prompt
 * exists to fix -- Experience gets the softer cream instead, a gentle
 * first beat right after Hero. Block A stays white (task's own explicit
 * "keep this one unchanged"), which also gives a clean white/cream
 * alternation with Experience right above it. Block B is the one
 * carrying black, deliberately placed LAST of the 3 (not first): it
 * creates the strongest, most dramatic beat directly into the
 * Comparison Table's own lighter gray/surface background right after it
 * (black -> light, a real "reveal" moment) -- a stronger transition than
 * white/beige -> gray would have been. Checked explicitly for adjacent
 * repeats across the full real sequence above: white, beige, white,
 * black, gray, white, black -- no two consecutive sections share the
 * same token.
 *
 * Contrast (real math, both meet WCAG AA 4.5:1 -- see this prompt's own
 * report for the full luminance derivation):
 *   white variant (unchanged): black text/#000 on white/#fff = 21:1.
 *   black variant: white text/#fff on black/#000 = 21:1 (item titles);
 *     white/90% opacity effectively renders as rgb(229,229,229) on
 *     black = 16.67:1 (item paragraphs, same text-brand-white/90 token
 *     already used by PrivateLabelClosingCta.tsx's own dark-background
 *     subtext, reused here rather than a new opacity value); the gold
 *     eyebrow (#dcb689) on black = 11.09:1 -- actually STRONGER than
 *     gold's own 1.89:1 on white, so it stays text-brand-gold
 *     unchanged in both variants.
 */
const ITEM_BASE_DELAY_MS = 150;
const ITEM_STAGGER_STEP_MS = 120;

export type FeatureBlockBackground = "white" | "black";

const BACKGROUND_CLASSES: Record<
  FeatureBlockBackground,
  { section: string; heading: string; paragraph: string }
> = {
  white: {
    section: "bg-brand-white",
    heading: "text-brand-black",
    paragraph: "text-brand-black",
  },
  black: {
    section: "bg-brand-black",
    heading: "text-brand-white",
    paragraph: "text-brand-white/90",
  },
};

export type FeatureBlockItem = {
  titleKey: string;
  textKey: string;
};

export default async function PrivateLabelFeatureBlock({
  imageUrl,
  imagePosition,
  items,
  paddingClassName,
  background,
}: {
  imageUrl: string | null;
  imagePosition: "start" | "end";
  items: readonly FeatureBlockItem[];
  paddingClassName: string;
  background: FeatureBlockBackground;
}) {
  const t = await getTranslations("PrivateLabel");
  const colors = BACKGROUND_CLASSES[background];

  const imageColumn = (
    <div className="relative aspect-square w-full overflow-hidden rounded-card bg-brand-surface md:w-[50%]">
      {imageUrl ? (
        <Reveal variant="image" className="absolute inset-0">
          <Image
            src={imageUrl}
            alt=""
            fill
            sizes="(min-width: 768px) 50vw, 100vw"
            className="object-cover"
          />
        </Reveal>
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
  );

  const textColumn = (
    <div className="mt-8 md:mt-0 md:w-[50%]">
      <Reveal variant="fade-up">
        <p className="text-[14px] font-medium tracking-[0.12em] text-brand-gold uppercase">
          {t("craftedSubtitle")}
        </p>
      </Reveal>
      <ul className="mt-6 space-y-6 md:mt-8">
        {items.map(({ titleKey, textKey }, index) => (
          <li key={titleKey}>
            <Reveal
              variant="fade-up"
              delayMs={ITEM_BASE_DELAY_MS + index * ITEM_STAGGER_STEP_MS}
            >
              <h3
                className={`text-[19px] leading-[1.4] font-bold ${colors.heading}`}
              >
                {t(titleKey)}
              </h3>
              <p className={`mt-1 text-base leading-[1.7] ${colors.paragraph}`}>
                {t(textKey)}
              </p>
            </Reveal>
          </li>
        ))}
      </ul>
    </div>
  );

  return (
    <section
      className={`${colors.section} px-[5%] md:flex md:items-center md:gap-8 ${paddingClassName}`}
    >
      {imagePosition === "start" ? (
        <>
          {imageColumn}
          {textColumn}
        </>
      ) : (
        <>
          {textColumn}
          {imageColumn}
        </>
      )}
    </section>
  );
}
