import Image from "next/image";
import { getTranslations } from "next-intl/server";
import Reveal from "@/components/private-label/Reveal";

/**
 * Prompt 96 (Phase 5, FINAL) -- re-inspected the reference fresh
 * (gulforchid.com/private-label). Real structure found: TWO separate
 * closing sections, not one --
 *
 *   1. A 3-item counter grid (element `5af6aa6`): `display:grid`,
 *      `grid-template-columns:repeat(3, 1fr)` at desktop, single column
 *      at a narrower breakpoint; real container margin `5%` top / `10%`
 *      bottom. Each item is a giant animated digit (real: "15 Millions
 *      Perfumes", "50M Bottles Manufactured Annually", "37 Years of
 *      Manufacturing Excellence") with a 13px/weight-500 label
 *      underneath. Per this project's OWN established discipline (same
 *      reasoning as Phase 2's rejection of the reference's "+37"
 *      giant-stat-number treatment), these are NOT reused -- this
 *      task's own 3 highlights are qualitative, original claims instead
 *      (`highlight1..3Title/Text`), styled as a simple title+description
 *      pair rather than the reference's digit-first layout (there's no
 *      real number to size a giant digit around here).
 *
 *   2. A closing CTA band (element `9fbe990`): real background
 *      `#000000` base + a `background-image` overlay at
 *      `opacity:0.31`, `background-size:cover`, centered -- a genuine
 *      real photo band, not a solid color alone. Per this prompt's own
 *      instruction, an admin slot WAS added for this (`cta_background`,
 *      0031 migration) rather than substituting a flat color, for
 *      consistency with every other real photo section already on this
 *      page (hero, 6 tiles, experience, 2 feature blocks) -- skipping
 *      an image here would have been the one inconsistent exception on
 *      an otherwise fully admin-photo-driven page. Gracefully degrades
 *      to the reference's own real BASE color (`#000000` ->
 *      `bg-brand-black`) when unset -- unlike this page's other image
 *      slots, there's no "broken placeholder icon" state needed here:
 *      a plain solid-black band is itself a real, intentional look the
 *      reference already uses as its own fallback layer.
 *      Real content typography: heading 62px white centered; this
 *      project's own already-established 30px/44px heading scale is
 *      reused instead (same "reuse this page's own tokens for a full
 *      sentence, don't introduce a 3rd size band" reasoning as Phase 2/
 *      Phase 4). Subtext 17px, white at ~93% opacity -- mapped to
 *      `text-brand-white/90`. Button: padding `24px 60px`,
 *      background `#C8A27D` (this project's own `brand-gold`), white
 *      text, `border-radius:4px`, no uppercase/tracking on THIS
 *      specific button (real, confirmed via computed styles -- unlike
 *      the Hero's own real button, which IS uppercase+tracked). Content
 *      column real `max-width:720px`, centered -- replicated via
 *      `max-w-[720px] mx-auto text-center`.
 *
 *      Button STYLE reuses this project's own established prominent-CTA
 *      button family (solid gold pill, `rounded-full`, `shadow-lg` --
 *      same one used by PrivateLabelHero/HeroSlider/HeroEmptyState)
 *      rather than the reference's own distinct square-cornered style,
 *      for visual consistency with this same page's own Hero CTA --
 *      with one deliberate adjustment: Hero's button border
 *      (`border-brand-black/60`) is dropped and its hover state changed
 *      to `hover:bg-brand-white` instead of `hover:bg-brand-black` --
 *      both existed to contrast against Hero's WHITE section background,
 *      and would go invisible (black border, black hover fill) against
 *      this section's black band, so they're swapped for the minimum
 *      change that keeps the button visible in both states while
 *      keeping every other part of the same signature style.
 *
 *      Button HREF reuses the exact `ctaHref` already computed once in
 *      page.tsx (WhatsApp pre-filled message, falling back to /quote) --
 *      not reimplemented, per this prompt's own instruction.
 *
 * The reference's own real "All queries are replied within 24hrs" line
 * is NOT reused -- an unverifiable specific promise this project has no
 * basis to make, same "no fabricated/unverifiable claims" discipline
 * applied throughout this whole rebuild (Phase 4's "Varies" column,
 * Phase 2/5's rejected stat numbers).
 *
 * Prompt 102 -- scroll-reveal added via components/private-label/
 * Reveal.tsx (see that file's own top comment for the real reference
 * animation research + dependency-free decision): the 3 highlight
 * items stagger-reveal as a set; in the CTA band, the background photo
 * reveals from a slightly zoomed + offset state while heading -> subtext
 * -> button stagger-reveal in that reading order.
 */
const HIGHLIGHT_BASE_DELAY_MS = 0;
const HIGHLIGHT_STAGGER_STEP_MS = 120;
const CTA_HEADING_DELAY_MS = 0;
const CTA_SUBTEXT_DELAY_MS = 150;
const CTA_BUTTON_DELAY_MS = 280;

const HIGHLIGHT_KEYS = [
  { titleKey: "highlight1Title", textKey: "highlight1Text" },
  { titleKey: "highlight2Title", textKey: "highlight2Text" },
  { titleKey: "highlight3Title", textKey: "highlight3Text" },
] as const;

export default async function PrivateLabelClosingCta({
  imageUrl,
  ctaHref,
}: {
  imageUrl: string | null;
  ctaHref: string;
}) {
  const t = await getTranslations("PrivateLabel");

  return (
    <>
      {/* Section 1: 3-item qualitative highlight grid */}
      <section className="bg-brand-white px-[5%] pt-[5%] pb-[10%]">
        <div className="mx-auto grid max-w-6xl gap-10 text-center md:grid-cols-3 md:gap-8">
          {HIGHLIGHT_KEYS.map(({ titleKey, textKey }, index) => (
            <Reveal
              key={titleKey}
              variant="fade-up"
              delayMs={HIGHLIGHT_BASE_DELAY_MS + index * HIGHLIGHT_STAGGER_STEP_MS}
            >
              <h3 className="text-lg font-semibold text-brand-black md:text-xl">
                {t(titleKey)}
              </h3>
              <p className="mt-2 text-sm text-brand-gray">{t(textKey)}</p>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Section 2: closing CTA band -- solid black base (matches the
          reference's own real base color, a genuine fallback look, not
          a broken placeholder), optional dark-overlaid photo on top. */}
      <section className="relative overflow-hidden bg-brand-black px-[5%] py-[7%]">
        {imageUrl && (
          <Reveal variant="image" className="absolute inset-0">
            <Image
              src={imageUrl}
              alt=""
              fill
              sizes="100vw"
              className="object-cover opacity-30"
            />
          </Reveal>
        )}
        <div className="relative mx-auto max-w-[720px] text-center">
          <Reveal variant="fade-up" delayMs={CTA_HEADING_DELAY_MS}>
            <h2 className="text-[30px] leading-[1.1] tracking-[-0.02em] text-brand-white md:text-[44px]">
              {t("closingCtaHeading")}
            </h2>
          </Reveal>
          <Reveal variant="fade-up" delayMs={CTA_SUBTEXT_DELAY_MS}>
            <p className="mt-4 text-[15px] leading-[1.4em] text-brand-white/90 md:text-[17px]">
              {t("closingCtaSubtext")}
            </p>
          </Reveal>
          <Reveal variant="fade-up" delayMs={CTA_BUTTON_DELAY_MS} className="mt-8">
            <a
              href={ctaHref}
              target={ctaHref.startsWith("http") ? "_blank" : undefined}
              rel={ctaHref.startsWith("http") ? "noreferrer" : undefined}
              className="inline-block w-fit rounded-full bg-brand-gold px-8 py-3 text-[13px] font-medium tracking-[0.1em] text-brand-black uppercase shadow-lg transition-colors hover:bg-brand-white"
            >
              {t("closingCtaButton")}
            </a>
          </Reveal>
        </div>
      </section>
    </>
  );
}
