"use client";

import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useQuote } from "./QuoteProvider";
import QuoteQuantityStepper from "./QuoteQuantityStepper";
import QuoteRemoveButton from "./QuoteRemoveButton";

// Interaction pattern reused from Header.tsx's mobile nav (Prompt 5) —
// confirmed there against the reference site's own off-canvas drawer:
// full-screen backdrop + panel sliding in via translate-x, mirrored in RTL
// via Tailwind's rtl: variant. The reference's actual cart-drawer markup
// itself isn't present in a static fetch of the live site (its JS only
// references possible opener selectors like [aria-controls="CartDrawer"];
// enable_cart_drawer:true is set, but no #CartDrawer element is ever
// rendered server-side, only presumably injected after a real add-to-cart
// interaction we can't trigger via a static HTML fetch) — so this reuses
// our own already-confirmed pattern rather than guessing at markup that
// was never actually observed, per this prompt's own instruction.
//
// Slides in from the logical END edge — the opposite of the mobile nav's
// start edge — matching the Quote pill's position on the header's end
// side (Header.tsx: "opposite side from the logo"). Closed state is the
// mirror image of the mobile nav's: off-screen to the right in LTR,
// off-screen to the left in RTL.

export default function QuoteSidebar() {
  const locale = useLocale();
  const t = useTranslations("Quote");
  const { items, totalItems, totalQuantity, isSidebarOpen, closeSidebar } =
    useQuote();

  return (
    <div
      className={
        "fixed inset-0 z-70 " +
        (isSidebarOpen ? "pointer-events-auto" : "pointer-events-none")
      }
      aria-hidden={!isSidebarOpen}
    >
      <div
        className={
          "absolute inset-0 bg-brand-black/50 transition-opacity duration-300 " +
          (isSidebarOpen ? "opacity-100" : "opacity-0")
        }
        onClick={closeSidebar}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label={t("title")}
        className={
          "absolute inset-y-0 end-0 flex w-full max-w-sm flex-col bg-brand-white shadow-brand transition-transform duration-300 " +
          (isSidebarOpen
            ? "translate-x-0"
            : "translate-x-full rtl:-translate-x-full")
        }
      >
        <div className="flex items-center justify-between border-b border-brand-border px-4 py-4">
          <span className="text-base font-semibold text-brand-black">
            {t("title")}
          </span>
          <button
            type="button"
            onClick={closeSidebar}
            className="p-2 text-brand-black"
          >
            <span className="sr-only">{t("close")}</span>
            <svg
              viewBox="0 0 24 24"
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
            <p className="text-brand-gray">{t("empty")}</p>
            <button
              type="button"
              onClick={closeSidebar}
              className="rounded-btn border border-brand-black bg-brand-black px-6 py-2.5 text-sm font-medium text-brand-white transition-colors hover:bg-brand-white hover:text-brand-black"
            >
              {t("continueShopping")}
            </button>
          </div>
        ) : (
          <>
            <ul className="flex-1 overflow-y-auto px-4">
              {items.map((item) => {
                const name =
                  locale === "ar" ? item.productNameAr : item.productNameEn;
                return (
                  <li
                    key={item.id}
                    className="flex gap-3 border-b border-brand-border py-4"
                  >
                    <Link
                      href={`/products/${item.productSlug}`}
                      onClick={closeSidebar}
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
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-brand-gray">
                          <svg
                            viewBox="0 0 24 24"
                            className="h-6 w-6"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth={1.5}
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
                    </Link>

                    <div className="flex flex-1 flex-col gap-1">
                      <div className="flex items-start justify-between gap-2">
                        <Link
                          href={`/products/${item.productSlug}`}
                          onClick={closeSidebar}
                          className="text-sm font-medium text-brand-black hover:text-brand-gray"
                        >
                          {name}
                        </Link>
                        <QuoteRemoveButton itemId={item.id} />
                      </div>

                      {item.sizeLabel ? (
                        <p className="text-xs text-brand-gray">
                          {item.sizeLabel}
                        </p>
                      ) : null}

                      <div className="mt-auto">
                        <QuoteQuantityStepper
                          itemId={item.id}
                          quantity={item.quantity}
                          size="sm"
                        />
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>

            <div className="space-y-3 border-t border-brand-border px-4 py-4">
              <div className="flex justify-between text-sm uppercase">
                <span className="text-brand-gray">
                  {t("totalItems", { count: totalItems })}
                </span>
              </div>
              <div className="flex justify-between text-sm uppercase">
                <span className="text-brand-gray">
                  {t("totalQuantity", { count: totalQuantity })}
                </span>
              </div>

              <Link
                href="/quote"
                onClick={closeSidebar}
                className="block rounded-btn border border-brand-black bg-brand-black px-4 py-2.5 text-center text-sm font-medium text-brand-white transition-colors hover:bg-brand-white hover:text-brand-black"
              >
                {t("requestQuote")}
              </Link>
              <button
                type="button"
                onClick={closeSidebar}
                className="block w-full rounded-btn border border-brand-border px-4 py-2.5 text-center text-sm font-medium text-brand-black transition-colors hover:border-brand-black"
              >
                {t("continueShopping")}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
