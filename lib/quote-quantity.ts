// Pure, framework-agnostic quantity-capping logic for the quote system
// (Prompt 29 -- fixes "a product with stock_quantity = 3 allowed adding 4
// units"). Extracted out of QuoteProvider.tsx's addItem/updateQuantity
// specifically so this is directly testable: it has no "use client", no
// React, no DOM -- a plain Node script can import and call these exact
// functions, not a hand-copied reimplementation of them, the same
// discipline as every DB-touching verification since Prompt 3. See the
// Prompt 29 report for the actual verification run.

/** Floors to 1 (existing rule, unchanged), then caps at stockQuantity if
 *  it's not null (Prompt 29's new rule). Used by QuoteProvider's
 *  updateQuantity -- the sidebar/summary page's own +/- stepper. */
export function clampQuantity(
  quantity: number,
  stockQuantity: number | null
): number {
  const floored = Math.max(1, quantity);
  return stockQuantity != null
    ? Math.min(floored, stockQuantity)
    : floored;
}

/** For adding to an already-existing line (re-clicking "Add to Quote" for
 *  a product+size combo already in the quote): sums the two quantities,
 *  then caps at stockQuantity -- this is what actually closes the
 *  original bug report's exact scenario when it happens across multiple
 *  add clicks/visits, not just a single overshoot. Both inputs are
 *  assumed already >= 1 (enforced upstream by the add-to-quote UI and by
 *  clampQuantity itself), so there's no separate floor here. */
export function mergeQuantity(
  existingQuantity: number,
  incomingQuantity: number,
  stockQuantity: number | null
): number {
  const summed = existingQuantity + incomingQuantity;
  return stockQuantity != null ? Math.min(summed, stockQuantity) : summed;
}
