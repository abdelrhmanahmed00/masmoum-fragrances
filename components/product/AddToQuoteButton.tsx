"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useQuote } from "@/components/quote/QuoteProvider";
import { trackMetaEvent } from "@/lib/meta-pixel-client";

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

// Prompt 71: restyled to the header's established gold/black language
// (Prompt 67), reusing its exact token pair -- not new colors, not a
// blind find/replace. The OLD scheme (border-brand-black bg-brand-black
// text-white, hover swaps bg to white/text to black, border staying
// CONSTANT black through both states) kept its border fixed specifically
// so a white hover-fill would still have a visible edge against a
// typically-white/light page background. That concern doesn't apply
// here: the new hover fill is solid BLACK, which is already a strong,
// distinct shape against any page background this button ever sits on
// (white marketing pages, product photography) with no border needed to
// define its edge -- so the border is free to track the SAME color as
// the fill in both states instead (border-brand-gold at rest, matching
// the gold fill; hover:border-brand-black, matching the black fill) --
// a genuinely solid button, same "outline -> filled" interaction SHAPE
// as the header's own Quote pill (HeaderClient.tsx, Prompt 67), just
// applied to an already-solid (not outline-style) button here.
// Contrast: both directions reuse the exact math already verified for
// the header's Quote pill (black-on-gold and gold-on-black both ~11.1:1,
// WCAG AAA) -- no new contrast check needed, same token pair, same
// relationship.
// disabled/sold-out (Prompt 28/29) and the "Added ✓" feedback (Prompt 14)
// are UNCHANGED by this restyle -- see this component's own JSX below:
// disabled is a plain `opacity-50` multiply applied on top of whichever
// base classes are active, which is color-scheme-agnostic (it already
// worked identically against the old black scheme and continues to read
// as visibly muted against gold), and "Added ✓" only ever swaps the
// button's TEXT content, never its own styling, so it inherits whichever
// color state (rest gold/black or hover black/gold) is already active,
// with no separate contrast case to check.
const DEFAULT_CLASS_NAME =
  "w-full rounded-btn border border-brand-gold bg-brand-gold px-4 py-2.5 text-sm font-medium text-brand-black transition-colors hover:border-brand-black hover:bg-brand-black hover:text-brand-gold";

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

    // Meta Pixel AddToCart (Prompt 47) -- this single component is the
    // real "both call sites" the task asks about: ProductCard and
    // ProductPurchasePanel both render THIS component rather than having
    // their own separate "add" logic (see this file's own header
    // comment, "Reused as-is ... by both"), so firing the event here
    // covers both without duplicating the call. No value/currency
    // parameters -- this site never shows pricing anywhere (the whole
    // "Request a Quote" model), and Meta only strictly requires
    // value/currency on the Purchase event, not AddToCart (confirmed
    // during this prompt's research, see the Prompt 47 report). No
    // event_id -- AddToCart is browser-only in this design (no
    // server-side CAPI mirror), so there's nothing to deduplicate
    // against.
    trackMetaEvent("AddToCart", {
      content_ids: [productId],
      content_name: productNameEn,
      content_type: "product",
      contents: [{ id: productId, quantity }],
    });
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
