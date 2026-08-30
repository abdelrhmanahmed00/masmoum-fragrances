import Image from "next/image";
import { getTranslations } from "next-intl/server";
import Reveal from "@/components/private-label/Reveal";

// Same checkmark glyph shape as the reference's own icon-list widget
// (a plain, generic checkmark path -- brand-neutral, not reference-
// branded content, safe to reuse as-is) -- confirmed via its real SVG:
// viewBox="0 0 512 512", a single filled check path.
//
// Prompt 104 -- fill changed from fill-brand-gold to fill-brand-black.
// Real contrast math: gold (#dcb689, relative luminance 0.5045) against
// this section's new cream background (#f7f2e9, luminance 0.8917) is
// only (0.8917+0.05)/(0.5045+0.05) = 1.70:1 -- already below the 3:1
// WCAG 1.4.11 non-text-contrast floor for a meaningful graphical icon
// (and a real regression from gold-on-white's own already-marginal
// 1.89:1). Black (#000000) against the same cream background is
// (0.8917+0.05)/(0+0.05) = 18.83:1 -- reusing this section's own body-
// text color, not a new one, for a clean, unambiguous checkmark.
function CheckIcon() {
  return (
    <svg
      viewBox="0 0 512 512"
      aria-hidden="true"
      className="h-4 w-4 shrink-0 fill-brand-black"
    >
      <path d="M173.898 439.404l-166.4-166.4c-9.997-9.997-9.997-26.206 0-36.204l36.203-36.204c9.997-9.998 26.207-9.998 36.204 0L192 312.69 432.095 72.596c9.997-9.997 26.207-9.997 36.204 0l36.203 36.204c9.997 9.997 9.997 26.206 0 36.204l-294.4 294.401c-9.998 9.997-26.207 9.997-36.204-.001z" />
    </svg>
  );
}

const BULLET_KEYS = [
  "experienceBullet1",
  "experienceBullet2",
  "experienceBullet3",
  "experienceBullet4",
  "experienceBullet5",
  "experienceBullet6",
  "experienceBullet7",
] as const;

/**
 * Prompt 93 (Phase 2) -- re-inspected the reference fresh
 * (gulforchid.com/private-label). Real structure found: this is actually
 * TWO separate reference sections, not one -- (1) a full-bleed section
 * with a solid gold (#C8A27D) background + a cover photo
 * (background-attachment:fixed at desktop, a parallax effect) containing
 * a giant "+37" / "Years" stat number (font-size 121px/119px/107px
 * across breakpoints) + an "expertise in the beauty industry" subheading
 * + the 7-item checkmark bullet list, split 50%/50% between the number/
 * subheading and the bullets (elements c837e8c/1449a33, both
 * `--width:50%`); (2) a SEPARATE, later "parallax images" section
 * (element 7d55df23, margin-top:20% -- genuinely below, not beside, the
 * text). This task explicitly asks for ONE composition -- headline +
 * bullets ALONGSIDE a large image -- so that's what's built here,
 * reusing the real 50%/50% column-split value found for the FIRST
 * section's own internal split (heading vs. bullets), now applied to
 * text-block vs. image instead.
 *
 * The reference's own giant 121px stat-number treatment is deliberately
 * NOT reused -- it was built for a single numeral ("+37"), and this
 * task's own heading is a full sentence ("Built On Real Manufacturing
 * Experience", no fabricated years/numbers per the task's own
 * instruction) -- reusing a 121px numeral size for a full sentence would
 * wrap awkwardly and isn't what that size was ever measuring. Reused
 * instead: THIS SAME PAGE's own already-established heading scale from
 * PrivateLabelHero.tsx (30px/44px, leading-[1em], tracking-[-0.04em]) --
 * "this project's established tokens, not new values" per the task,
 * read as reusing values already established on this same page over
 * inventing a third distinct heading treatment.
 *
 * Colors: the reference's white-on-gold-photo text (#FFFFFF throughout,
 * since it sits on their solid-gold/photo background) is inverted to
 * this project's own light-section convention (text-brand-black body
 * copy, text-brand-gold checkmark accent) -- matching Phase 1's own
 * white-background choice, not the reference's colored-background block
 * (no other page in this project uses a solid-color section background;
 * introducing one here just for this section would be a new pattern,
 * not a reused token).
 *
 * Real cited spacing: section padding-top 15%, padding-bottom 16%,
 * padding-left/right 5% (element c35bff1) -- MORE generous than the
 * Hero's own 8%/5% (Phase 1), a real, deliberate difference in the
 * reference itself, not smoothed away to match Hero.
 *
 * Bullet list real values: icon size ~17px (--e-icon-list-icon-size),
 * icon-to-text gap 10px (padding-inline-end), ~7px vertical gap between
 * items (14px/2) -- mapped to this project's existing Tailwind scale
 * (h-4/w-4 = 16px, gap-2.5 = 10px, space-y-2 = 8px) rather than encoded
 * as odd arbitrary values, since these round comfortably to existing
 * steps unlike the more structurally distinctive percentage/font-size
 * values above.
 *
 * Prompt 102 -- scroll-reveal added via components/private-label/
 * Reveal.tsx (see that file's own top comment for the real reference
 * animation research + dependency-free decision): heading reveals
 * first (no delay), each bullet stagger-reveals after it (BULLET_BASE_DELAY_MS
 * + index * BULLET_STAGGER_STEP_MS), the image reveals from a slightly
 * zoomed + offset state in parallel with the heading.
 *
 * Prompt 104 -- background changed from bg-brand-white to bg-brand-cream
 * (#f7f2e9), one of 3 large-image sections (this one, Feature Block A,
 * Feature Block B) each getting a distinct white/black/beige background
 * for scroll rhythm -- see PrivateLabelFeatureBlock.tsx's own top
 * comment for the full section-order reasoning across all 3 (+
 * Comparison Table/Closing CTA). brand-cream (not brand-surface) chosen
 * for "beige": it's a genuinely warm-toned near-white (already used
 * elsewhere as text-brand-cream, e.g. HeaderSearch.tsx's dark-dropdown
 * text), unlike brand-surface's neutral cool gray (#f5f5f5, already the
 * Comparison Table's own background right after these 3 sections --
 * reusing it here too would read as a near-repeat two sections later).
 * Text stays text-brand-black throughout (real contrast: black vs.
 * cream = 18.83:1, comfortably AAA) -- only the checkmark fill changed
 * (see CheckIcon's own comment above).
 */
const BULLET_BASE_DELAY_MS = 150;
const BULLET_STAGGER_STEP_MS = 90;
export default async function PrivateLabelExperience({
  imageUrl,
}: {
  imageUrl: string | null;
}) {
  const t = await getTranslations("PrivateLabel");

  return (
    <section className="bg-brand-cream px-[5%] pt-[15%] pb-[16%] md:flex md:items-center md:gap-[5%]">
      <div className="md:w-[50%]">
        <Reveal variant="fade-up">
          <h2 className="text-[30px] leading-[1em] tracking-[-0.04em] text-brand-black md:text-[44px]">
            {t("experienceHeading")}
          </h2>
        </Reveal>
        <ul className="mt-6 space-y-2 md:mt-8">
          {BULLET_KEYS.map((key, index) => (
            <li key={key}>
              <Reveal
                variant="fade-up"
                delayMs={BULLET_BASE_DELAY_MS + index * BULLET_STAGGER_STEP_MS}
                className="flex items-start gap-2.5"
              >
                <span className="mt-1">
                  <CheckIcon />
                </span>
                <span className="text-sm text-brand-black md:text-base">
                  {t(key)}
                </span>
              </Reveal>
            </li>
          ))}
        </ul>
      </div>

      <div className="relative mt-8 aspect-[4/5] w-full overflow-hidden rounded-card bg-brand-surface md:mt-0 md:w-[50%]">
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
    </section>
  );
}
