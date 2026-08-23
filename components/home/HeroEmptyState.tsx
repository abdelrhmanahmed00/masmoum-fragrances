import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

// Same brand wordmark placeholder used in Header/Footer — not translated,
// it's a proper noun/logotype.
const BRAND_NAME = "MASMOUM FRAGRANCES";

/**
 * Renders while hero_slides has 0 rows (no real photography from the
 * client yet). Intentionally a clean, deliberate-looking brand panel —
 * not a broken/empty gap, and not a placeholder stock photo. Gets
 * replaced automatically by HeroSlider the moment a real slide exists,
 * with no code changes needed.
 *
 * Prompt 58: includes the same fixed "Shop Now" button HeroSlider now
 * always shows -- deliberately NOT excluded here. "Shop Now" is a
 * site-wide, always-real action (unlike headline/subheadline/CTA, which
 * are per-slide data this component has none of), and this panel fills
 * the exact same layout role as the real slider (the Hero area,
 * whichever variant is currently rendering) -- a visitor landing here
 * (no hero photography yet) can still browse the real product catalog,
 * and leaving this panel without any action while the real slider always
 * has one would make the fallback state feel incomplete relative to the
 * content state, not just visually different. Centered (`text-center` on
 * the parent) rather than start-aligned like the slider's own overlay --
 * this panel's whole layout is already centered, matching that instead
 * of importing the slider's start-aligned convention into a differently-
 * laid-out component.
 *
 * Prompt 59 kept this in sync with HeroSlider's then-current glass/gold
 * restyle. Prompt 68 does the same for the header's now-FINAL gold/black
 * language (solid gold bg + black border/text at rest, inverts to solid
 * black bg + gold text on hover, reusing the Quote pill's exact pattern
 * from HeaderClient.tsx) -- see HeroSlider.tsx's own comment for the
 * full reasoning on why the old glass/backdrop-blur treatment was
 * dropped entirely, not adapted. Kept byte-for-byte identical to
 * HeroSlider's own button classes here too, same as every prior restyle
 * of this button -- this panel's own bg-brand-black backdrop doesn't
 * change that decision: a solid gold pill reads clearly against solid
 * black either way (in fact this panel's own background already IS the
 * exact same brand-black the button now inverts TO on hover).
 *
 * Prompt 72: pt-header-offset, same reasoning as HeroSlider.tsx's own
 * comment (the header no longer floats transparently over the Hero, so
 * the homepage's exemption from this token is gone) -- but applied via a
 * WRAPPING div here instead of directly on this component's own
 * <section>, unlike HeroSlider. This section has an explicit total
 * height (h-[280px]/md:h-[420px]) AND centers its content within that
 * exact height (`flex items-center`) -- adding padding-top to that SAME
 * element would eat into its own fixed height (Tailwind's border-box
 * default means padding is subtracted from, not added to, a fixed
 * height), squeezing the centered brand panel into less vertical room
 * and visibly shifting it off-center. A wrapping div sidesteps that
 * entirely: the offset pushes the whole panel down without touching the
 * panel's own carefully-tuned height/centering at all.
 *
 * Prompt 73: pt-header-offset lg:pt-header-offset-lg -- the two exact
 * (not rounded) per-breakpoint values, see globals.css's own comment for
 * the full arithmetic.
 *
 * Prompt 84: same two classes, unchanged -- the header's real per-width,
 * per-direction (LTR vs RTL genuinely differ) height is now handled by
 * extra CSS cascade rules on these same tokens in globals.css. See
 * globals.css for the real measurements/reasoning.
 */
export default async function HeroEmptyState() {
  const t = await getTranslations("Hero");

  return (
    <div className="pt-header-offset lg:pt-header-offset-lg">
      <section className="flex h-[280px] items-center justify-center bg-brand-black px-4 text-center md:h-[420px]">
        <div className="space-y-3">
          <p className="text-2xl font-semibold tracking-wide text-brand-white md:text-4xl">
            {BRAND_NAME}
          </p>
          <p className="text-sm text-brand-white/80 md:text-base">
            {t("emptyStateTagline")}
          </p>
          <Link
            href="/products"
            className="mt-2 inline-block rounded-full border border-brand-black/60 bg-brand-gold px-8 py-3 text-sm font-medium text-brand-black shadow-lg transition-colors hover:border-brand-black hover:bg-brand-black hover:text-brand-gold"
          >
            {t("shopNow")}
          </Link>
        </div>
      </section>
    </div>
  );
}
