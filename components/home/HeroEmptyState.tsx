import { getTranslations } from "next-intl/server";

// Same brand wordmark placeholder used in Header/Footer — not translated,
// it's a proper noun/logotype.
const BRAND_NAME = "MASMOUM FRAGRANCES";

/**
 * Renders while hero_slides has 0 rows (no real photography from the
 * client yet). Intentionally a clean, deliberate-looking brand panel —
 * not a broken/empty gap, and not a placeholder stock photo. Gets
 * replaced automatically by HeroSlider the moment a real slide exists,
 * with no code changes needed.
 */
export default async function HeroEmptyState() {
  const t = await getTranslations("Hero");

  return (
    <section className="flex h-[280px] items-center justify-center bg-brand-black px-4 text-center md:h-[420px]">
      <div className="space-y-3">
        <p className="text-2xl font-semibold tracking-wide text-brand-white md:text-4xl">
          {BRAND_NAME}
        </p>
        <p className="text-sm text-brand-white/80 md:text-base">
          {t("emptyStateTagline")}
        </p>
      </div>
    </section>
  );
}
