"use client";

import { useTranslations } from "next-intl";
import { useQuote } from "./QuoteProvider";

// Extracted from QuoteSidebar (Prompt 18) in Prompt 19 so the summary page
// doesn't reimplement the same -/count/+ control against the same
// updateQuantity action -- single source of truth for both. Reads/writes
// through QuoteProvider directly (itemId + updateQuantity) rather than
// taking onIncrease/onDecrease callback props, since every caller wants
// the exact same behavior (clamped to min 1, per QuoteProvider) -- there's
// no variation to parameterize.
//
// Two size presets: "sm" matches the sidebar's original compact 32px
// boxes; "md" matches ProductPurchasePanel's 44px stepper (Prompt 12),
// used on the summary page's table where rows have more room and (per
// this prompt's task) qty controls should be reasonably touch-friendly.
// Both class names are full literal strings below (not built via string
// interpolation) so Tailwind's scanner picks them up regardless of which
// branch runs at runtime.
const SIZE_CLASSES = {
  sm: { box: "h-8", cell: "w-8" },
  md: { box: "h-11", cell: "w-11" },
} as const;

export default function QuoteQuantityStepper({
  itemId,
  quantity,
  size = "sm",
}: {
  itemId: string;
  quantity: number;
  size?: "sm" | "md";
}) {
  const t = useTranslations("Quote");
  const { updateQuantity } = useQuote();
  const { box, cell } = SIZE_CLASSES[size];

  return (
    <div
      className={`flex ${box} w-fit items-stretch rounded-btn border border-brand-border`}
    >
      <button
        type="button"
        onClick={() => updateQuantity(itemId, quantity - 1)}
        aria-label={t("decreaseQuantity")}
        className={`flex ${cell} items-center justify-center text-brand-black`}
      >
        −
      </button>
      <span
        className={`flex ${cell} items-center justify-center text-sm text-brand-black`}
      >
        {quantity}
      </span>
      <button
        type="button"
        onClick={() => updateQuantity(itemId, quantity + 1)}
        aria-label={t("increaseQuantity")}
        className={`flex ${cell} items-center justify-center text-brand-black`}
      >
        +
      </button>
    </div>
  );
}
