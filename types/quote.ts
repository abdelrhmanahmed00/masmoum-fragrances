/**
 * A denormalized snapshot, not a live reference — stores everything needed
 * to render a line item (name in both locales, image, size label, slug to
 * link back to the product) without re-fetching from Supabase. This is a
 * deliberate choice over "store only IDs and re-fetch fresh": the quote is
 * a pre-submission browsing session kept in localStorage with no server
 * round-trip, so there's no session to attach a "live" re-fetch to anyway,
 * and a wholesale buyer building a quote over several visits should see a
 * stable list of what they picked, not have items silently change (or
 * break) if a product's name/image/sort order changes while their quote
 * sits in localStorage. Staleness risk (e.g. a size later being renamed)
 * is minor and resolved at submission time, when the real IDs
 * (productId/productSizeId) are re-validated server-side against current
 * data — the snapshot is for *display* only.
 */
export type QuoteLineItem = {
  /** Composite key `${productId}::${productSizeId ?? "none"}` — also used
   *  to detect "same product + size" and increment quantity instead of
   *  creating a duplicate line. */
  id: string;
  productId: string;
  productSlug: string;
  productSizeId: string | null;
  sizeLabel: string | null;
  productNameEn: string;
  productNameAr: string;
  imageUrl: string | null;
  quantity: number;
};

export type AddQuoteItemInput = Omit<QuoteLineItem, "id">;
