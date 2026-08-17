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
  /** null when there's genuinely nowhere to send "See more" (currently
   *  just the "all" tab — no site-wide /products listing page exists yet,
   *  Prompt 24's own flagged gap). ProductTabs must not render a "See
   *  more" link at all when this is null, even if totalCount exceeds the
   *  shown products — no 404 link. */
  seeMoreHref: string | null;
};
