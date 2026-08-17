export type ProductCardData = {
  id: string;
  slug: string;
  name_en: string;
  name_ar: string;
  categoryName: { en: string; ar: string } | null;
  imageUrl: string | null;
  /** First active size by sort_order, or null if the product has none.
   *  Cards have no size-selection UI (Prompt 12), so "Add to Quote" from
   *  a card needs a default to add (Prompt 14). */
  defaultSize: { id: string; label: string } | null;
  /** null = unlimited/always available (no badge, no restriction). A
   *  number = real stock; 0 = sold out (Prompt 28). Never rendered as
   *  the raw number publicly -- see ProductCard's own comment for why
   *  only a binary available/sold-out signal is shown. */
  stockQuantity: number | null;
};

export type ProductTabData = {
  /** "all" for the baseline tab, otherwise the category's id (Prompt 24 —
   *  previously the collection's id; the homepage tabs are category-driven
   *  now, see ProductsSection.tsx's own comment for why). */
  id: string;
  /** null for the "all" tab — its label is a fixed UI string the client
   *  component translates itself (Products.allTab), not DB content that
   *  needs both languages carried from the server in one request. */
  label_en: string | null;
  label_ar: string | null;
  products: ProductCardData[];
  /** Total matching count (not just this page) — drives "See more" visibility. */
  totalCount: number;
  /** Nullable defensively rather than because any tab currently needs it:
   *  as of Prompt 25 every tab (including "all", now /products) has a
   *  real destination. Kept nullable so a future tab type with genuinely
   *  nowhere to send "See more" degrades safely — ProductTabs must not
   *  render the link at all when this is null, even if totalCount exceeds
   *  the shown products, rather than ever pointing at a 404. */
  seeMoreHref: string | null;
};
