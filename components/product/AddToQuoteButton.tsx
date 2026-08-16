"use client";

import { useTranslations } from "next-intl";

/**
 * Visual placeholder only — the real quote system (adding line items,
 * quote sidebar/summary state, etc.) is a later dedicated phase. Styled
 * to match the reference's confirmed .vikst-btn--atc: black bg, white
 * text, 1px black border, inverts to white bg/black text on hover.
 */
export default function AddToQuoteButton({
  productSlug,
}: {
  productSlug: string;
}) {
  const t = useTranslations("Products");

  return (
    <button
      type="button"
      onClick={() =>
        console.log("Add to quote (not yet implemented):", productSlug)
      }
      className="w-full rounded-btn border border-brand-black bg-brand-black px-4 py-2.5 text-sm font-medium text-brand-white transition-colors hover:bg-brand-white hover:text-brand-black"
    >
      {t("addToQuote")}
    </button>
  );
}
