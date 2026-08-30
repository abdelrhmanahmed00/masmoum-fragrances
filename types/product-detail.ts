export type ProductDetailImage = {
  storagePath: string;
  isPrimary: boolean;
  sortOrder: number;
};

export type ProductDetailSize = {
  id: string;
  sizeLabel: string;
  sortOrder: number;
  /** Prompt 33 -- already RESOLVED (lib/stock.ts's resolveAvailableStock),
   *  not the size's raw column: this size's own stock_quantity if it has
   *  one, else the product's stock_quantity (shared with every other
   *  size that also has no override), else null/unlimited. This is what
   *  ProductPurchasePanel must use once this size is selected -- never
   *  the whole-product stockQuantity below, which only applies when no
   *  size is selected (a product with zero sizes). */
  stockQuantity: number | null;
};

export type ProductDetail = {
  id: string;
  slug: string;
  name_en: string;
  name_ar: string;
  description_en: string | null;
  description_ar: string | null;
  gender: "men" | "women" | "unisex" | "not_applicable";
  fragrance_top_notes_en: string | null;
  fragrance_top_notes_ar: string | null;
  fragrance_middle_notes_en: string | null;
  fragrance_middle_notes_ar: string | null;
  fragrance_base_notes_en: string | null;
  fragrance_base_notes_ar: string | null;
  moq: number;
  /** The product's own raw stock_quantity (Prompt 28) -- null = unlimited,
   *  0 = sold out. Same "binary signal only, never the raw number
   *  publicly" reasoning as ProductCardData.stockQuantity. As of Prompt
   *  33, ProductPurchasePanel only uses this value directly when there's
   *  no size selected (a product with zero sizes) -- once a size is
   *  selected, ProductDetailSize.stockQuantity (already resolved against
   *  this same field) governs instead. */
  stockQuantity: number | null;
  categoryName: { en: string; ar: string } | null;
  /** Prompt 87 (Phase B) -- same "null until an admin assigns one" shape
   *  as ProductCardData.brandName. */
  brandName: { en: string; ar: string } | null;
  /** The category's own id (Prompt 75) -- distinct from categoryName
   *  above, which is already-localized display text. Needed so the
   *  product detail page can fetch "You May Also Like" products sharing
   *  this same category without a second round-trip just to look up the
   *  id from the name. null when the product has no category, same as
   *  categoryName. */
  categoryId: string | null;
  images: ProductDetailImage[];
  sizes: ProductDetailSize[];
};
