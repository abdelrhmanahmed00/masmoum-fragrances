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
// Also confirmed: active tab styling is `color:#000` (brand-black) with a
// `border-bottom-color` in the brand gold accent; inactive tabs are
// brand-gray with a transparent border. "See more" is a plain <a> to a
// full listing page, not pagination or "load more".
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
        className="mb-8 flex justify-start gap-6 overflow-x-auto border-b border-brand-border [-ms-overflow-style:none] [scrollbar-width:none] md:justify-center [&::-webkit-scrollbar]:hidden"
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
                "shrink-0 border-b-2 pb-3 pt-1 text-base font-medium whitespace-nowrap transition-colors " +
                (isActive
                  ? "border-brand-gold text-brand-black"
                  : "border-transparent text-brand-gray hover:text-brand-black")
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
                soldOutLabel={t("soldOut")}
              />
            ))}
          </div>

          {activeTab.totalCount > activeTab.products.length &&
          activeTab.seeMoreHref ? (
            <div className="mt-8 text-center">
              <Link
                href={activeTab.seeMoreHref}
                className="inline-block rounded-btn border border-brand-black px-6 py-2.5 text-sm font-medium text-brand-black transition-colors hover:bg-brand-black hover:text-brand-white"
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
