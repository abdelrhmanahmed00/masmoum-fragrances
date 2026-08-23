"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import AddToQuoteButton from "./AddToQuoteButton";
import { clampQuantity } from "@/lib/quote-quantity";

type Size = {
  id: string;
  sizeLabel: string;
  /** Prompt 33: already RESOLVED per size (lib/stock.ts's
   *  resolveAvailableStock, applied in lib/catalog.ts) -- this size's own
   *  override if it has one, else the product-level pool shared with
   *  every other size that has none, else null/unlimited. This is what
   *  actually governs THIS size, independent of every other size's own
   *  resolved value. */
  stockQuantity: number | null;
};

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
  stockQuantity,
  moq,
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
  /** The product's own resolved-with-no-size-selected value (i.e. just
   *  its raw stock_quantity -- resolveAvailableStock with a null size
   *  input returns exactly that). Prompt 33: this is now ONLY the
   *  governing number when there's no size to select at all (sizes is
   *  empty) -- once a size is selected, that size's OWN resolved
   *  stockQuantity (above) takes over entirely, never blended with this
   *  one. null = unlimited/always available; 0 = sold out (Prompt 28) --
   *  same binary signal as ProductCard, not the exact count. */
  stockQuantity: number | null;
  /** Prompt 29: used only to detect the MOQ-vs-stock edge case (moq >
   *  effective stock -- no quantity satisfies both, treated as
   *  unavailable). NOT used to raise the stepper's own floor -- MOQ has
   *  never been enforced as the stepper's minimum (it only ever starts at
   *  1 and decrements to 1); the informational "Minimum Order Quantity: N
   *  units" text on the page is the only place MOQ has ever been
   *  surfaced. */
  moq: number;
}) {
  const t = useTranslations("ProductDetail");
  const [selectedSizeId, setSelectedSizeId] = useState<string | undefined>(
    sizes[0]?.id
  );
  const [quantity, setQuantity] = useState(1);

  const selectedSize = sizes.find((s) => s.id === selectedSizeId) ?? null;

  // Prompt 33: the number that actually governs right now -- the
  // SELECTED size's own resolved stock if there is one, else the
  // product-level fallback prop (which is exactly what a product with no
  // sizes at all should use). Every isSoldOut/clamp/cap calculation below
  // reads this, never the raw stockQuantity prop directly, so switching
  // sizes recomputes availability correctly on its own.
  const effectiveStock = selectedSize ? selectedSize.stockQuantity : stockQuantity;

  const isSoldOut = effectiveStock === 0;
  // moq > effectiveStock: e.g. MOQ 10 but only 3 in stock -- no quantity
  // satisfies both constraints at once. Treated the same as sold out
  // (stepper + Add to Quote disabled) rather than left as a stepper
  // stuck between a floor of 1 and a cap of 3 while still implying the
  // product is orderable.
  const isMoqUnavailable =
    effectiveStock !== null && effectiveStock > 0 && moq > effectiveStock;
  const isUnavailable = isSoldOut || isMoqUnavailable;
  // Distinct wording from "Sold Out" on purpose -- stock genuinely isn't
  // zero in the MOQ case, so calling it "Sold Out" would be inaccurate.
  const unavailableMessage = isSoldOut
    ? t("soldOut")
    : isMoqUnavailable
      ? t("unavailable")
      : null;

  // Same clampQuantity used by QuoteProvider (Prompt 29) -- one shared
  // definition of "what does capping a quantity at stock mean", not a
  // second copy of the same formula. Re-clamps against the newly
  // effective stock whenever the selected size changes, in case the
  // previous quantity now exceeds the new size's own cap.
  const updateQuantity = (next: number) => {
    setQuantity(clampQuantity(next, effectiveStock));
  };
  const atMax = effectiveStock != null && quantity >= effectiveStock;

  return (
    <div className="mt-6 space-y-6">
      {unavailableMessage ? (
        <p
          role="status"
          className="inline-block rounded-full bg-brand-black px-3 py-1 text-sm font-medium text-brand-white"
        >
          {unavailableMessage}
        </p>
      ) : null}
      {sizes.length > 0 ? (
        <div>
          <p className="mb-2 text-sm font-medium text-brand-black">
            {t("size")}
          </p>
          <div className="flex flex-wrap gap-2">
            {sizes.map((size) => {
              const isActive = selectedSizeId === size.id;
              // Prompt 33: each pill reflects ITS OWN resolved
              // availability -- a size drawing from a depleted
              // product-level pool shows as sold out here even though its
              // own row has never had a number set, exactly the same as a
              // size with its own override at 0.
              const sizeSoldOut = size.stockQuantity === 0;
              return (
                <button
                  key={size.id}
                  type="button"
                  onClick={() => {
                    if (sizeSoldOut) return;
                    setSelectedSizeId(size.id);
                    // Re-clamp immediately against the newly selected
                    // size's own cap -- otherwise a quantity picked while
                    // a generously-stocked size was selected could stay
                    // above a more limited size's cap until the stepper
                    // was touched again.
                    setQuantity((current) =>
                      clampQuantity(current, size.stockQuantity)
                    );
                  }}
                  disabled={sizeSoldOut}
                  aria-pressed={isActive}
                  aria-disabled={sizeSoldOut}
                  className={
                    "rounded-btn border px-4 py-2 text-sm transition-colors " +
                    (sizeSoldOut
                      ? "cursor-not-allowed border-brand-border text-brand-gray line-through opacity-50"
                      : isActive
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
            onClick={() => updateQuantity(quantity - 1)}
            aria-label={t("decreaseQuantity")}
            disabled={isUnavailable}
            className="flex w-11 items-center justify-center text-brand-black disabled:cursor-not-allowed disabled:opacity-50"
          >
            −
          </button>
          <input
            type="number"
            min={1}
            max={effectiveStock ?? undefined}
            value={quantity}
            onChange={(e) => updateQuantity(Number(e.target.value) || 1)}
            aria-label={t("quantity")}
            disabled={isUnavailable}
            className="w-12 shrink grow-0 border-x border-brand-border text-center [appearance:textfield] disabled:cursor-not-allowed disabled:opacity-50 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          />
          <button
            type="button"
            onClick={() => updateQuantity(quantity + 1)}
            aria-label={t("increaseQuantity")}
            disabled={isUnavailable || atMax}
            className="flex w-11 items-center justify-center text-brand-black disabled:cursor-not-allowed disabled:opacity-50"
          >
            +
          </button>
        </div>

        {/* Prompt 71: same gold/black restyle as AddToQuoteButton.tsx's
            own DEFAULT_CLASS_NAME (see that file's comment for the full
            reasoning) -- this className override only exists for this
            panel's own layout needs (flex-1 next to the quantity
            stepper, no w-full/py-2.5 since it shares a row instead of
            stacking alone); the color classes themselves are copied
            verbatim, not reinterpreted. */}
        <AddToQuoteButton
          productId={productId}
          productSlug={productSlug}
          productNameEn={productNameEn}
          productNameAr={productNameAr}
          categoryNameEn={categoryName?.en ?? null}
          categoryNameAr={categoryName?.ar ?? null}
          imageUrl={imageUrl}
          stockQuantity={effectiveStock}
          disabled={isUnavailable}
          sizeId={selectedSize?.id ?? null}
          sizeLabel={selectedSize?.sizeLabel ?? null}
          quantity={quantity}
          className="flex-1 rounded-btn border border-brand-gold bg-brand-gold px-4 text-sm font-medium text-brand-black transition-colors hover:border-brand-black hover:bg-brand-black hover:text-brand-gold"
        />
      </div>
    </div>
  );
}
