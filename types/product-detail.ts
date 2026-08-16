export type ProductDetailImage = {
  storagePath: string;
  isPrimary: boolean;
  sortOrder: number;
};

export type ProductDetailSize = {
  id: string;
  sizeLabel: string;
  sortOrder: number;
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
  categoryName: { en: string; ar: string } | null;
  images: ProductDetailImage[];
  sizes: ProductDetailSize[];
};
