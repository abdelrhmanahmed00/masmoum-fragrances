"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import AddToQuoteButton from "./AddToQuoteButton";

type Size = { id: string; sizeLabel: string };

// CONFIRMED from the reference site: quantity stepper (minus button /
// number input / plus button, bordered box, 46px tall) sits directly next
// to the Add to Cart button, which is flex-grow (takes remaining width).
// Replicated here with "Add to Quote" in place of "Add to Cart" per the
// project's core requirement. Size selection itself has no confirmed
// visual pattern from the reference (see the page's own comment for why)
// — styled as pills matching this project's own established chip language
// (Header's Quote pill, ProductTabs, FilterGroup).
export default function ProductPurchasePanel({
  productId,
  productSlug,
  productNameEn,
  productNameAr,
  categoryName,
  imageUrl,
  sizes,
}: {
  productId: string;
  productSlug: string;
  productNameEn: string;
  productNameAr: string;
  /** For the quote line item's snapshot only (Prompt 19's summary-page
   *  category subtitle) -- this panel doesn't display it itself, the page
   *  already shows the category label above the product title. */
  categoryName: { en: string; ar: string } | null;
  imageUrl: string | null;
  sizes: Size[];
}) {
  const t = useTranslations("ProductDetail");
  const [selectedSizeId, setSelectedSizeId] = useState<string | undefined>(
    sizes[0]?.id
  );
  const [quantity, setQuantity] = useState(1);

  const selectedSize = sizes.find((s) => s.id === selectedSizeId) ?? null;

  return (
    <div className="mt-6 space-y-6">
      {sizes.length > 0 ? (
        <div>
          <p className="mb-2 text-sm font-medium text-brand-black">
            {t("size")}
          </p>
          <div className="flex flex-wrap gap-2">
            {sizes.map((size) => {
              const isActive = selectedSizeId === size.id;
              return (
                <button
                  key={size.id}
                  type="button"
                  onClick={() => setSelectedSizeId(size.id)}
                  aria-pressed={isActive}
                  className={
                    "rounded-btn border px-4 py-2 text-sm transition-colors " +
                    (isActive
                      ? "border-brand-black bg-brand-black text-brand-white"
                      : "border-brand-border text-brand-black hover:border-brand-black")
                  }
                >
                  {size.sizeLabel}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      <div className="flex items-stretch gap-3">
        <div className="flex h-[46px] items-stretch rounded-btn border border-brand-border">
          <button
            type="button"
            onClick={() => setQuantity((q) => Math.max(1, q - 1))}
            aria-label={t("decreaseQuantity")}
            className="flex w-11 items-center justify-center text-brand-black"
          >
            −
          </button>
          <input
            type="number"
            min={1}
            value={quantity}
            onChange={(e) =>
              setQuantity(Math.max(1, Number(e.target.value) || 1))
            }
            aria-label={t("quantity")}
            className="w-12 shrink grow-0 border-x border-brand-border text-center [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          />
          <button
            type="button"
            onClick={() => setQuantity((q) => q + 1)}
            aria-label={t("increaseQuantity")}
            className="flex w-11 items-center justify-center text-brand-black"
          >
            +
          </button>
        </div>

        <AddToQuoteButton
          productId={productId}
          productSlug={productSlug}
          productNameEn={productNameEn}
          productNameAr={productNameAr}
          categoryNameEn={categoryName?.en ?? null}
          categoryNameAr={categoryName?.ar ?? null}
          imageUrl={imageUrl}
          sizeId={selectedSize?.id ?? null}
          sizeLabel={selectedSize?.sizeLabel ?? null}
          quantity={quantity}
          className="flex-1 rounded-btn border border-brand-black bg-brand-black px-4 text-sm font-medium text-brand-white transition-colors hover:bg-brand-white hover:text-brand-black"
        />
      </div>
    </div>
  );
}
