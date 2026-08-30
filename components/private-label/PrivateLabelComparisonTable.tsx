import { getTranslations } from "next-intl/server";

/**
 * Prompt 95 (Phase 4) -- re-inspected the reference fresh
 * (gulforchid.com/private-label). Real widget found: a "wpr-data-table"
 * (Royal Elementor Addons' data-table widget), inside a section titled
 * "Gulf Orchid vs." / "Other Manufacturers" (2 stacked heading lines,
 * 50px, centered, black -- real computed values via Playwright, not
 * estimated). Section background `#F1F1F1` -- this project's own
 * `bg-brand-surface` (#f5f5f5) is a near-identical existing token, reused
 * here rather than a new gray -- the FIRST non-white section background
 * on this page, matching the reference's own real (only) non-white
 * section here.
 *
 * Real table structure (3 columns): "Others" | "Features" | "Gulf
 * Orchid" -- Others/Gulf Orchid columns hold a circular check/x icon per
 * row, Features holds the plain row label. Real computed values:
 *   - wrapper: `overflow-x:auto` on `.wpr-table-inner-container`, table
 *     itself `min-width:600px` -- CONFIRMED (not guessed) via a real
 *     390px-viewport render: table stayed 600px wide inside a 370px
 *     visible container, genuinely scrolling horizontally. This is the
 *     reference's real mobile answer -- horizontal scroll, not stacked
 *     cards -- replicated below via the same `overflow-x-auto` +
 *     `min-width` mechanism.
 *   - wrapper border-radius 16px, border 1px solid #E4E4E4 (mapped to
 *     this project's own `border-brand-black/10`, consistent with the
 *     opacity-based border convention already used for this page's own
 *     CTA button, rather than a new literal gray)
 *   - header cells: background `#C8A27D` (gold -- the SAME real gold
 *     already found and reused as this project's own `bg-brand-gold`
 *     throughout this page), white text, 16px, weight 600, padding 10px,
 *     centered
 *   - body cells: padding 15px, centered; feature-label text `#7A7A7A`
 *     (muted gray) 16px regular -- mapped to this project's own
 *     `text-brand-gray`
 *   - row striping: real (confirmed visually + via a real screenshot),
 *     alternating white/light-gray rows -- despite BOTH inspected body
 *     rows literally sharing the class `wpr-odd` in the real markup (a
 *     quirk of the reference's own generated class names), the actual
 *     striping is nth-child based, not class based -- replicated below
 *     via `even:bg-brand-surface`
 *   - check icon: real Font Awesome "check-circle" (regular) glyph,
 *     25x25px, fill `#C8A27D` (gold) -- x icon: same circular outline
 *     shape ("times-circle"), 25x25px, fill `#7A7A7A` (muted GRAY, not
 *     red) -- confirmed via computed styles, a real and deliberate
 *     "no alarming red" choice already made by the reference itself.
 *
 * OTHER MANUFACTURERS COLUMN -- deliberate deviation from the
 * reference's own literal content (not its structure): the reference
 * marks its "Others" column with real x/check icons per row (e.g. "x"
 * for "Global compliance", "Dedicated B2B specialist", etc.) -- that is
 * an unverifiable claim about unnamed competitors this project has no
 * basis to make. Per this task's own explicit instruction, every row in
 * the "Other Manufacturers" column instead shows a neutral "Varies" text
 * badge (`comparisonVaries`) -- honest (competitors genuinely differ,
 * some may offer any given feature and some may not) and defensible
 * (asserts nothing false or unverifiable about a specific competitor),
 * while the "Masmoum Fragrances" column keeps a real check mark for
 * every row -- these are this project's own actual capabilities, not a
 * claim about anyone else.
 *
 * Column order matches the reference's own real order (Others, Feature,
 * Us) -- a deliberate real design choice (ending the row on the brand's
 * own affirmative column reads stronger than opening with it), kept
 * as-is; native `<table>` + the page's own `dir` attribute (not a manual
 * reorder) handles the RTL mirror, same as every other browser default
 * this project relies on elsewhere.
 */
const ROW_KEYS = [
  "comparisonRow1",
  "comparisonRow2",
  "comparisonRow3",
  "comparisonRow4",
  "comparisonRow5",
  "comparisonRow6",
] as const;

function CheckIcon() {
  return (
    <svg
      viewBox="0 0 512 512"
      aria-hidden="true"
      className="mx-auto h-6 w-6 fill-brand-gold"
    >
      <path d="M256 8C119.033 8 8 119.033 8 256s111.033 248 248 248 248-111.033 248-248S392.967 8 256 8zm0 48c110.532 0 200 89.451 200 200 0 110.532-89.451 200-200 200-110.532 0-200-89.451-200-200 0-110.532 89.451-200 200-200m140.204 130.267l-22.536-22.718c-4.667-4.705-12.265-4.736-16.97-.068L215.346 303.697l-59.792-60.277c-4.667-4.705-12.265-4.736-16.97-.069l-22.719 22.536c-4.705 4.667-4.736 12.265-.068 16.971l90.781 91.516c4.667 4.705 12.265 4.736 16.97.068l172.589-171.204c4.704-4.668 4.734-12.266.067-16.971z" />
    </svg>
  );
}

export default async function PrivateLabelComparisonTable() {
  const t = await getTranslations("PrivateLabel");

  return (
    <section className="bg-brand-surface px-[5%] py-[10%]">
      <h2 className="text-center text-[30px] leading-[1.1] tracking-[-0.02em] text-brand-black md:text-[44px]">
        {t("comparisonHeading")}
      </h2>

      <div className="mx-auto mt-8 max-w-4xl overflow-x-auto rounded-[16px] border border-brand-black/10 md:mt-12">
        <table className="w-full min-w-[600px] border-collapse bg-brand-white text-center">
          <thead>
            <tr>
              <th className="bg-brand-gold px-2.5 py-2.5 text-sm font-semibold text-brand-white">
                {t("comparisonColOthers")}
              </th>
              <th className="bg-brand-gold px-2.5 py-2.5 text-sm font-semibold text-brand-white">
                {t("comparisonColFeature")}
              </th>
              <th className="bg-brand-gold px-2.5 py-2.5 text-sm font-semibold text-brand-white">
                {t("comparisonColUs")}
              </th>
            </tr>
          </thead>
          <tbody>
            {ROW_KEYS.map((key) => (
              <tr key={key} className="even:bg-brand-surface">
                <td className="px-2.5 py-[15px]">
                  <span className="inline-block rounded-full border border-brand-gray/40 px-3 py-1 text-xs text-brand-gray">
                    {t("comparisonVaries")}
                  </span>
                </td>
                <td className="px-2.5 py-[15px] text-sm text-brand-gray">
                  {t(key)}
                </td>
                <td className="px-2.5 py-[15px]">
                  <CheckIcon />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
