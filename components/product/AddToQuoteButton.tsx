"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useQuote } from "@/components/quote/QuoteProvider";

type AddToQuoteButtonProps = {
  productId: string;
  productSlug: string;
  productNameEn: string;
  productNameAr: string;
  /** For the quote line item's snapshot only (Prompt 19's summary-page
   *  category subtitle) -- not shown by this button itself. */
  categoryNameEn: string | null;
  categoryNameAr: string | null;
  imageUrl: string | null;
  /** Captured into the quote line item's own snapshot (Prompt 29 -- fixes
   *  the "added 4 when only 3 in stock" bug) so QuoteProvider can enforce
   *  the same cap from the sidebar/summary page's own stepper, not just
   *  at the moment of adding. null = unlimited. */
  stockQuantity: number | null;
  /** Card usage (Prompt 9) passes the product's default size since there's
   *  no size-selection UI there; the detail page (Prompt 12) passes
   *  whatever's currently selected in ProductPurchasePanel. Both are
   *  nullable — a product could in principle have zero sizes. */
  sizeId?: string | null;
  sizeLabel?: string | null;
  /** Defaults to 1 (card usage). The detail page passes the quantity
   *  stepper's current value. */
  quantity?: number;
  /** Card and detail-page contexts need different layout (block vs. flex-1
   *  next to a quantity stepper) — override when the default doesn't fit. */
  className?: string;
  /** Sold out (stockQuantity === 0, Prompt 28) -- can't meaningfully
   *  request a quote for zero stock, see the Prompt 28 report for the
   *  explicit reasoning. Defaults to false so every existing call site
   *  (products with null/positive stock) is unaffected. */
  disabled?: boolean;
};

const DEFAULT_CLASS_NAME =
  "w-full rounded-btn border border-brand-black bg-brand-black px-4 py-2.5 text-sm font-medium text-brand-white transition-colors hover:bg-brand-white hover:text-brand-black";

/**
 * Adds a line item to the quote (Prompt 14's QuoteProvider) and gives
 * brief inline feedback ("Added ✓" for ~1.5s) rather than a full toast
 * system, per this prompt's explicit scope. Reused as-is (not duplicated)
 * by both ProductCard and the product detail page's purchase panel.
 */
export default function AddToQuoteButton({
  productId,
  productSlug,
  productNameEn,
  productNameAr,
  categoryNameEn,
  categoryNameAr,
  imageUrl,
  stockQuantity,
  sizeId = null,
  sizeLabel = null,
  quantity = 1,
  className,
  disabled = false,
}: AddToQuoteButtonProps) {
  const t = useTranslations("Products");
  const { addItem } = useQuote();
  const [justAdded, setJustAdded] = useState(false);

  // Reset the "just added" feedback if this button unmounts mid-timeout
  // (e.g. navigating away right after clicking).
  useEffect(() => {
    if (!justAdded) return;
    const id = window.setTimeout(() => setJustAdded(false), 1500);
    return () => window.clearTimeout(id);
  }, [justAdded]);

  const handleClick = () => {
    // Native `disabled` on the button already prevents this click from
    // firing at all -- this guard is defense-in-depth, not the primary
    // mechanism (same belt-and-suspenders standard as the rest of this
    // project's forms).
    if (disabled) return;
    addItem({
      productId,
      productSlug,
      productSizeId: sizeId,
      sizeLabel,
      productNameEn,
      productNameAr,
      categoryNameEn,
      categoryNameAr,
      imageUrl,
      stockQuantity,
      quantity,
    });
    setJustAdded(true);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled}
      className={
        (className ?? DEFAULT_CLASS_NAME) +
        (disabled ? " cursor-not-allowed opacity-50" : "")
      }
    >
      {justAdded ? t("addedToQuote") : t("addToQuote")}
    </button>
  );
}
