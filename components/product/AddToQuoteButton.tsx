"use client";

import { useTranslations } from "next-intl";

type AddToQuoteButtonProps = {
  productSlug: string;
  /** Only meaningful on the product detail page (Prompt 12) — ProductCard's
   *  grid usage (Prompt 9) omits these entirely. Real quote state/logic is
   *  Phase 10; for now these just flow into the console.log placeholder so
   *  the selection UI has somewhere real to report to. */
  selectedSizeId?: string;
  quantity?: number;
  /** Card and detail-page contexts need different layout (block vs. flex-1
   *  next to a quantity stepper) — override when the default doesn't fit. */
  className?: string;
};

/**
 * Visual placeholder only — the real quote system (adding line items,
 * quote sidebar/summary state, etc.) is a later dedicated phase. Styled
 * to match the reference's confirmed .vikst-btn--atc / .sf__btn-primary:
 * black bg, white text, 1px black border, inverts to white bg/black text
 * on hover. Reused as-is (not duplicated) by both ProductCard and the
 * product detail page's purchase panel.
 */
export default function AddToQuoteButton({
  productSlug,
  selectedSizeId,
  quantity,
  className,
}: AddToQuoteButtonProps) {
  const t = useTranslations("Products");

  return (
    <button
      type="button"
      onClick={() =>
        console.log("Add to quote (not yet implemented):", {
          productSlug,
          selectedSizeId,
          quantity,
        })
      }
      className={
        className ??
        "w-full rounded-btn border border-brand-black bg-brand-black px-4 py-2.5 text-sm font-medium text-brand-white transition-colors hover:bg-brand-white hover:text-brand-black"
      }
    >
      {t("addToQuote")}
    </button>
  );
}
