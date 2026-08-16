"use client";

import { useTranslations } from "next-intl";
import { useQuote } from "./QuoteProvider";

// Extracted from QuoteSidebar (Prompt 18) in Prompt 19 -- same remove icon
// and removeItem call, now shared with the summary page's ACTION column
// instead of being reimplemented there.
export default function QuoteRemoveButton({
  itemId,
  className,
}: {
  itemId: string;
  className?: string;
}) {
  const t = useTranslations("Quote");
  const { removeItem } = useQuote();

  return (
    <button
      type="button"
      onClick={() => removeItem(itemId)}
      aria-label={t("remove")}
      className={
        className ??
        "shrink-0 text-brand-gray transition-colors hover:text-brand-black"
      }
    >
      <svg
        viewBox="0 0 24 24"
        className="h-4 w-4"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M4 7h16M9 7V5a1 1 0 011-1h4a1 1 0 011 1v2m2 0-1 12a1 1 0 01-1 1H8a1 1 0 01-1-1L6 7h12z"
        />
      </svg>
    </button>
  );
}
