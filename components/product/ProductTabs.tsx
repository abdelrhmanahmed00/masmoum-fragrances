"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import ProductCard from "./ProductCard";
import type { ProductTabData } from "@/types/product";

// CONFIRMED from the reference site (re-fetched shop-gulforchid.com and
// inspected its "vikst-ftabs" section directly): ALL tab panels are
// pre-rendered server-side in the initial HTML; clicking a tab is a pure
// client-side CSS class toggle (`.vikst-ftabs__panel{display:none}` /
// `.is-active{display:block}`) with NO network request. That's the
// pattern replicated here: every tab's products are fetched once
// server-side (see ProductsSection.tsx) and passed in as plain data;
// switching tabs is local React state, not a refetch.
//
// Prompt 61: this row's own visual treatment was originally a plain-text
// underline tab (border-bottom-color on the active tab) -- restyled to
// bordered "chip" boxes per the client's request, which explicitly asked
// to borrow the LOOK of the reference's *second* row (its
// `.vikst-ftabs__families` fragrance-family chips: Sweet/Oriental/
// Gourmand/etc, still NOT built here -- that row remains out of scope,
// per Prompt 9/60) for THIS row (the real "All" + category tabs), not to
// replace this row's own function/behavior with that other row's. Its
// real, re-fetched CSS (inline in the reference's page HTML, same
// <style> block Prompt 60 found the heading highlight in):
//
//   .vikst-family__chip {
//     border: 1px solid #e3e3e3;
//     border-radius: 5px;
//     padding: 5px 10px;
//     font-size: 14px;
//     cursor: pointer;
//     color: #222;
//   }
//   .vikst-family__chip.is-active {
//     background: #fff;
//     border-color: var(--underline);              /* #dcb689 */
//     box-shadow: inset 0 -3px 0 var(--underline);  /* extra accent, see below */
//   }
//
// Mapped onto this project's own tokens:
//   - border-radius: 5px is an EXACT match for this project's own
//     `--radius-btn` token (already `rounded-btn`, used for every other
//     button in the app) -- no new radius invented.
//   - inactive border #e3e3e3 vs. this project's `brand-border` (#dedede):
//     close enough (a few hex units apart, visually identical) to reuse
//     the existing token rather than add a near-duplicate one.
//   - active border: literally `var(--underline)` = `#dcb689`, i.e. this
//     project's own `brand-gold` value -- confirms the client's ask
//     ("outlined in brand-gold when active") precisely, replicated as
//     `border-brand-gold` with NO width change from the inactive state
//     (both are a plain 1px border, only the color swaps -- the
//     reference does NOT thicken the active border).
//   - the `box-shadow: inset 0 -3px 0 var(--underline)` on `.is-active`
//     is a real extra accent in the reference (an inner gold line hugging
//     the bottom edge inside the border) that the client's own task text
//     didn't ask for (only "box outlined in gold") -- intentionally
//     skipped to stay scoped to what was actually requested, same
//     discipline as skipping the family-chip row itself.
//   - font-weight: the reference's `.vikst-family__chip` rule has NO
//     font-weight of its own; its element is a plain `<button>`, and this
//     theme's global reset sets `button{font-weight:inherit}` with no
//     body-level override found in theme.css/chunk.css either -- so the
//     reference's real computed chip text is NOT bold (browser default,
//     ~400). The client's own instruction explicitly asks for bold text
//     regardless ("Bold black text... font-weight increased from
//     current") -- honored as a deliberate customization beyond
//     reference-matching, not a copy of the reference's actual weight.
//     `font-semibold` (600) is used rather than `font-bold` (700): a
//     clear step up from the previous `font-medium` (500) that reads as
//     "bold" in a compact pill without looking heavier than this
//     project's own other font-semibold usages (e.g. the Header
//     wordmark).
//   - text color: reference's `color:#222` applies to `.vikst-family__chip`
//     unscoped (i.e. the SAME color for active and inactive, confirmed --
//     no separate active-state text-color rule exists), which matches
//     the client's own explicit instruction ("Bold black text... for
//     every tab", not just the active one) -- so unlike the old
//     underline design (gray inactive / black active), text color is now
//     `text-brand-black` uniformly; only the border communicates active
//     state. A subtle `hover:border-brand-gold/50` on inactive tabs keeps
//     a hover affordance without reintroducing a text-color difference.
//   - padding: reference's real `5px 10px` is quite tight (sized for its
//     own short, fixed, single-word family names). This project's tabs
//     can hold longer/dynamic category names (client-authored, any
//     length, either locale) and the client's own instruction explicitly
//     asked for "comfortable padding so the box doesn't look cramped" --
//     so padding is intentionally scaled up from the reference's literal
//     value to `px-4 py-2` (16px/8px) rather than copied verbatim; the
//     reference's own 5px/10px is cited above as the real baseline this
//     was deliberately widened from, not guessed independently of it.
//   - font-size: left at the existing `text-base` (16px) -- not something
//     the client's task asked to change (its own checklist covers weight/
//     color, border/radius, border color, padding only), even though the
//     reference's real chip text is smaller (14px/text-sm).
//
// "See more" is a plain <a> to a full listing page, not pagination or
// "load more".
//
// Tab data source: category-driven as of Prompt 24 (was collection-driven,
// Prompt 9) -- this component itself is unchanged by that switch, it only
// ever consumed generic ProductTabData; see ProductsSection.tsx for what
// changed. seeMoreHref can be null (currently just the "All" tab -- no
// site-wide listing page exists, a flagged gap, not an oversight) and
// must suppress the link entirely, not point it at a 404.

export default function ProductTabs({ tabs }: { tabs: ProductTabData[] }) {
  const locale = useLocale();
  const t = useTranslations("Products");
  const [activeId, setActiveId] = useState(tabs[0]?.id ?? "all");

  const activeTab = tabs.find((tab) => tab.id === activeId) ?? tabs[0];

  if (!activeTab) return null;

  return (
    <div>
      <div
        role="tablist"
        aria-label={t("heading")}
        className="mb-8 flex justify-start gap-2.5 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] md:justify-center [&::-webkit-scrollbar]:hidden"
      >
        {tabs.map((tab) => {
          const label =
            tab.id === "all"
              ? t("allTab")
              : (locale === "ar" ? tab.label_ar : tab.label_en) ?? "";
          const isActive = tab.id === activeTab.id;

          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setActiveId(tab.id)}
              className={
                "shrink-0 rounded-btn border px-4 py-2 text-base font-semibold whitespace-nowrap text-brand-black transition-colors " +
                (isActive
                  ? "border-brand-gold"
                  : "border-brand-border hover:border-brand-gold/50")
              }
            >
              {label}
            </button>
          );
        })}
      </div>

      {activeTab.products.length === 0 ? (
        <div className="py-16 text-center text-brand-gray" role="tabpanel">
          <p>{t("emptyState")}</p>
        </div>
      ) : (
        <div role="tabpanel">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
            {activeTab.products.map((product) => (
              <ProductCard
                key={product.id}
                id={product.id}
                slug={product.slug}
                name={locale === "ar" ? product.name_ar : product.name_en}
                name_en={product.name_en}
                name_ar={product.name_ar}
                categoryLabel={
                  product.categoryName
                    ? (locale === "ar"
                        ? product.categoryName.ar
                        : product.categoryName.en)
                    : null
                }
                categoryName={product.categoryName}
                imageUrl={product.imageUrl}
                defaultSize={product.defaultSize}
                stockQuantity={product.stockQuantity}
                moq={product.moq}
                soldOutLabel={t("soldOut")}
                unavailableLabel={t("unavailable")}
              />
            ))}
          </div>

          {activeTab.totalCount > activeTab.products.length &&
          activeTab.seeMoreHref ? (
            // Prompt 78: restyled from a small black-outline button
            // (border-brand-black, transparent fill, hover-invert-to-
            // solid) to solid black bg/white text AT REST -- more
            // prominent, per the client's own explicit ask. Sizing
            // (px-8/py-3) reused from this project's own established
            // "prominent CTA" scale -- Hero's "Shop Now" button
            // (HeroSlider.tsx/HeroEmptyState.tsx, Prompts 58/68) already
            // uses this exact px-8/py-3 pairing, deliberately BIGGER than
            // the Quote pill's px-4/py-1.5 or Add to Quote's px-4/py-2.5
            // -- reused here rather than inventing a new size, since this
            // button needed the same "bigger, prominent" treatment those
            // buttons were already tuned for. border dropped entirely --
            // it existed only to keep this button's edge visible against
            // the page when its fill was transparent-to-white; a solid
            // black fill is already strongly visible against any page
            // background here without one.
            // Hover: bg-brand-black/90, not an invert-to-outline (the
            // mirror of the OLD rest/hover pair) -- inverting back to a
            // lighter/outline state on hover would make the button read
            // as LESS prominent on interaction, backwards for a hover
            // state. Full black can't get visually "darker" via opacity
            // (alpha-blending over the page's white background only ever
            // lightens it), so a subtle /90 dim is the standard, safe
            // "this is interactive" signal for an already-solid-dark
            // button -- text stays text-brand-white throughout (contrast
            // against black at 90% opacity over white is still ~19:1,
            // nowhere near a legibility concern).
            <div className="mt-8 text-center">
              <Link
                href={activeTab.seeMoreHref}
                className="inline-block rounded-btn bg-brand-black px-8 py-3 text-sm font-medium text-brand-white transition-colors hover:bg-brand-black/90"
              >
                {t("seeMore")}
              </Link>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
