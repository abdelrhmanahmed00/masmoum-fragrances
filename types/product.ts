export type ProductCardData = {
  id: string;
  slug: string;
  name_en: string;
  name_ar: string;
  categoryName: { en: string; ar: string } | null;
  imageUrl: string | null;
};

export type ProductTabData = {
  /** "all" for the baseline tab, otherwise the collection's id. */
  id: string;
  /** null for the "all" tab — its label is a fixed UI string the client
   *  component translates itself (Products.allTab), not DB content that
   *  needs both languages carried from the server in one request. */
  label_en: string | null;
  label_ar: string | null;
  products: ProductCardData[];
  /** Total matching count (not just this page) — drives "See more" visibility. */
  totalCount: number;
  seeMoreHref: string;
};
