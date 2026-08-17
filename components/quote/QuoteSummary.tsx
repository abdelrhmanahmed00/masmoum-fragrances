"use client";

import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useQuote } from "./QuoteProvider";
import QuoteQuantityStepper from "./QuoteQuantityStepper";
import QuoteRemoveButton from "./QuoteRemoveButton";

// Full-page counterpart to QuoteSidebar (Prompt 18) -- same data source
// (QuoteProvider), same empty-by-default SSR behavior (see the Prompt 18
// report's hydration reasoning, unchanged here), same shared
// QuoteQuantityStepper/QuoteRemoveButton controls (Prompt 19) rather than
// a second copy of that logic.
//
// Responsive table strategy: a real <table> for md+ (columns per the
// client's spec: PRODUCT / SIZE / QTY / ACTION) and a stacked-card list
// below md, toggled with Tailwind's hidden/md:table + md:hidden pair
// rather than a horizontally-scrolling table on narrow screens (explicit
// task requirement). Both are rendered and CSS-toggled, not
// conditionally mounted, so there's no extra client JS/layout-detection
// needed and no hydration-sensitive branching on viewport size.
export default function QuoteSummary() {
  const locale = useLocale();
  const t = useTranslations("Quote");
  const { items, totalItems, totalQuantity } = useQuote();

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 md:py-12 lg:px-8">
      <Link
        href="/"
        className="inline-flex items-center gap-2 text-sm text-brand-black transition-colors hover:text-brand-gray"
      >
        <svg
          viewBox="0 0 24 24"
          className="h-4 w-4 rtl:rotate-180"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15 6l-6 6 6 6"
          />
        </svg>
        {t("backToHome")}
      </Link>

      <h1 className="mt-4 mb-8 text-2xl font-medium text-brand-black md:text-3xl">
        {t("title")}
      </h1>

      {items.length === 0 ? (
        <div className="flex flex-col items-center gap-4 py-16 text-center">
          <p className="text-brand-gray">{t("empty")}</p>
          <Link
            href="/"
            className="rounded-btn border border-brand-black bg-brand-black px-6 py-2.5 text-sm font-medium text-brand-white transition-colors hover:bg-brand-white hover:text-brand-black"
          >
            {t("continueShopping")}
          </Link>
        </div>
      ) : (
        <>
          {/* Desktop / tablet: real table */}
          <table className="hidden w-full border-collapse md:table">
            <thead>
              <tr className="border-b border-brand-border text-start text-xs tracking-wide text-brand-gray uppercase">
                <th className="py-3 text-start font-medium">
                  {t("columnProduct")}
                </th>
                <th className="py-3 text-start font-medium">
                  {t("columnSize")}
                </th>
                <th className="py-3 text-start font-medium">
                  {t("columnQty")}
                </th>
                <th className="py-3 text-start font-medium">
                  {t("columnAction")}
                </th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => {
                const name =
                  locale === "ar" ? item.productNameAr : item.productNameEn;
                const categoryLabel =
                  locale === "ar"
                    ? (item.categoryNameAr ?? null)
                    : (item.categoryNameEn ?? null);
                return (
                  <tr
                    key={item.id}
                    className="border-b border-brand-border align-top"
                  >
                    <td className="py-4 pe-4">
                      <div className="flex gap-3">
                        <Link
                          href={`/products/${item.productSlug}`}
                          className="relative h-16 w-16 shrink-0 overflow-hidden rounded-btn bg-brand-surface"
                        >
                          {item.imageUrl ? (
                            <Image
                              src={item.imageUrl}
                              alt={name}
                              fill
                              sizes="64px"
                              className="object-cover"
                            />
                          ) : null}
                        </Link>
                        <div className="flex flex-col gap-1 pt-1">
                          {categoryLabel ? (
                            <p className="text-xs tracking-wide text-brand-gray uppercase">
                              {categoryLabel}
                            </p>
                          ) : null}
                          <Link
                            href={`/products/${item.productSlug}`}
                            className="text-sm font-medium text-brand-black hover:text-brand-gray"
                          >
                            {name}
                          </Link>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 pe-4 pt-5 text-sm text-brand-gray">
                      {item.sizeLabel ?? "—"}
                    </td>
                    <td className="py-4 pe-4 pt-4">
                      <QuoteQuantityStepper
                        itemId={item.id}
                        quantity={item.quantity}
                        size="md"
                        maxQuantity={item.stockQuantity ?? null}
                      />
                    </td>
                    <td className="py-4 pt-5">
                      <QuoteRemoveButton itemId={item.id} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Mobile: stacked cards */}
          <ul className="md:hidden">
            {items.map((item) => {
              const name =
                locale === "ar" ? item.productNameAr : item.productNameEn;
              const categoryLabel =
                locale === "ar"
                  ? (item.categoryNameAr ?? null)
                  : (item.categoryNameEn ?? null);
              return (
                <li
                  key={item.id}
                  className="flex gap-3 border-b border-brand-border py-4"
                >
                  <Link
                    href={`/products/${item.productSlug}`}
                    className="relative h-20 w-20 shrink-0 overflow-hidden rounded-btn bg-brand-surface"
                  >
                    {item.imageUrl ? (
                      <Image
                        src={item.imageUrl}
                        alt={name}
                        fill
                        sizes="80px"
                        className="object-cover"
                      />
                    ) : null}
                  </Link>

                  <div className="flex flex-1 flex-col gap-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex flex-col gap-1">
                        {categoryLabel ? (
                          <p className="text-xs tracking-wide text-brand-gray uppercase">
                            {categoryLabel}
                          </p>
                        ) : null}
                        <Link
                          href={`/products/${item.productSlug}`}
                          className="text-sm font-medium text-brand-black hover:text-brand-gray"
                        >
                          {name}
                        </Link>
                      </div>
                      <QuoteRemoveButton itemId={item.id} />
                    </div>

                    {item.sizeLabel ? (
                      <p className="text-xs text-brand-gray">
                        {t("columnSize")}: {item.sizeLabel}
                      </p>
                    ) : null}

                    <div className="mt-auto">
                      <QuoteQuantityStepper
                        itemId={item.id}
                        quantity={item.quantity}
                        size="sm"
                        maxQuantity={item.stockQuantity ?? null}
                      />
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>

          <div className="mt-8 flex flex-col items-end gap-1 border-t border-brand-border pt-6 text-sm uppercase">
            <span className="text-brand-gray">
              {t("totalItems", { count: totalItems })}
            </span>
            <span className="text-brand-gray">
              {t("totalQuantity", { count: totalQuantity })}
            </span>
          </div>

          <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Link
              href="/"
              className="rounded-btn border border-brand-border px-6 py-2.5 text-center text-sm font-medium text-brand-black transition-colors hover:border-brand-black"
            >
              {t("continueShopping")}
            </Link>
            <Link
              href="/quote/request"
              className="rounded-btn border border-brand-black bg-brand-black px-6 py-2.5 text-center text-sm font-medium text-brand-white transition-colors hover:bg-brand-white hover:text-brand-black"
            >
              {t("requestQuote")}
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
