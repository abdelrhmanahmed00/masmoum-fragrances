export type ProductGenderValue = "men" | "women" | "unisex" | "not_applicable";

/** Row shape for the list page -- includes the joined category name
 *  (task requirement: "category (joined name, not just category_id)"). */
export type AdminProductListRow = {
  id: string;
  slug: string;
  name_en: string;
  name_ar: string;
  gender: ProductGenderValue;
  is_active: boolean;
  is_featured: boolean;
  sort_order: number;
  category: { name_en: string } | null;
};

/** Full row shape for the edit form -- every core-field column (Part 1:
 *  no sizes/images, those are separate tables/prompts). */
export type AdminProductRow = {
  id: string;
  slug: string;
  category_id: string;
  name_en: string;
  name_ar: string;
  description_en: string | null;
  description_ar: string | null;
  gender: ProductGenderValue;
  fragrance_top_notes_en: string | null;
  fragrance_top_notes_ar: string | null;
  fragrance_middle_notes_en: string | null;
  fragrance_middle_notes_ar: string | null;
  fragrance_base_notes_en: string | null;
  fragrance_base_notes_ar: string | null;
  moq: number;
  is_active: boolean;
  is_featured: boolean;
  sort_order: number;
  created_at: string;
};

/** Category options for the form's category_id <select> -- id + both
 *  names (for the label) + is_active (to visually mark inactive ones,
 *  see lib/admin/products.ts's getCategoryOptions for why inactive
 *  categories are deliberately included, not filtered out). */
export type CategoryOption = {
  id: string;
  name_en: string;
  name_ar: string;
  is_active: boolean;
};

export type ProductFieldErrors = Partial<
  Record<
    | "name_en"
    | "name_ar"
    | "slug"
    | "category_id"
    | "gender"
    | "description_en"
    | "description_ar"
    | "moq"
    | "sort_order",
    string
  >
>;

export type ProductActionState =
  | { status: "idle" }
  | { status: "success" }
  | { status: "error"; message: string; fieldErrors?: ProductFieldErrors };

export const PRODUCT_ACTION_INITIAL_STATE: ProductActionState = {
  status: "idle",
};
