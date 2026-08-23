/**
 * The single shared stock-resolution rule (Prompt 33). Every surface that
 * needs to know "is this specific size available" -- the product detail
 * page's size selector, ProductCard's badge, the admin's own hint text --
 * must go through this function, not re-derive the precedence inline.
 *
 * Precedence (exact spec):
 *   1. The size's own stock_quantity, if set (not null) -- governs that
 *      size independently, regardless of the product-level number.
 *   2. Else, the product's stock_quantity, if set -- a SHARED pool across
 *      every size that has no override of its own.
 *   3. Else (both null) -- unlimited.
 *
 * Deliberately trivial (three lines) -- the value of this function isn't
 * algorithmic complexity, it's having exactly ONE place this rule is
 * written down, so the product detail page, ProductCard, and the RPC's
 * plpgsql logic (which can't literally import this -- see the 0018
 * migration's own comment for the hand-mirrored equivalent, verified
 * side by side in the Prompt 33 report) can never quietly drift apart.
 *
 * Pure, framework-agnostic, no "use client"/server-only -- safe to import
 * from a Server Component (lib/catalog.ts), a Client Component
 * (ProductPurchasePanel.tsx), or a plain Node verification script alike,
 * same portability reasoning as lib/quote-quantity.ts.
 */
export function resolveAvailableStock(
  productStockQuantity: number | null,
  sizeStockQuantity: number | null
): number | null {
  if (sizeStockQuantity !== null) return sizeStockQuantity;
  if (productStockQuantity !== null) return productStockQuantity;
  return null;
}
