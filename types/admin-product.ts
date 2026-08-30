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
  /** null = unlimited; a number = real stock (Prompt 28). Unlike the
   *  public site, the admin list DOES show the exact number -- this is
   *  the operator's own inventory view, not a competitor-facing page. */
  stock_quantity: number | null;
};

/** Full row shape for the edit form -- every core-field column (Part 1:
 *  no sizes/images, those are separate tables/prompts). */
export type AdminProductRow = {
  id: string;
  slug: string;
  category_id: string;
  /** Prompt 86 (Phase A) -- nullable, unlike category_id: a product may
   *  have no brand assigned at all, a fully valid state, not an error. */
  brand_id: string | null;
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
  stock_quantity: number | null;
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

/** Same shape as CategoryOption, for the form's optional brand_id
 *  <select> (Prompt 86, Phase A) -- see lib/admin/products.ts's
 *  getBrandOptions for the same "include inactive, mark them" reasoning. */
export type BrandOption = {
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
    | "brand_id"
    | "gender"
    | "description_en"
    | "description_ar"
    | "moq"
    | "stock_quantity"
    | "sort_order",
    string
  >
>;

export type ProductActionState =
  | { status: "idle" }
  /** `id` present on a successful CREATE only (Prompt 32) -- lets
   *  createProductAction redirect straight to the new product's own edit
   *  page instead of the list, since sizes (this prompt) and images
   *  (Prompt 33) can only be added to a product that already exists.
   *  Absent on update/delete success -- the caller already knows the id. */
  | { status: "success"; id?: string }
  | { status: "error"; message: string; fieldErrors?: ProductFieldErrors };

export const PRODUCT_ACTION_INITIAL_STATE: ProductActionState = {
  status: "idle",
};

/** Sizes are a nested resource of one product's edit page (Prompt 32),
 *  not a top-level admin section -- no slug (never looked up by slug
 *  anywhere, unlike categories/collections/products). */
export type AdminProductSizeRow = {
  id: string;
  product_id: string;
  size_label: string;
  sort_order: number;
  is_active: boolean;
  /** Prompt 33 -- this size's OWN override, null = none set (falls back
   *  to the product-level pool, or unlimited -- see lib/stock.ts's
   *  resolveAvailableStock). The raw column, not resolved -- the admin
   *  list needs to distinguish "this size has no number of its own" from
   *  "this size is at 0", which a resolved value would collapse. */
  stock_quantity: number | null;
  /** Count of quote_request_items rows historically referencing this
   *  size -- informational only, computed in lib/admin/product-sizes.ts's
   *  getProductSizes, not a real column. Shown in the UI so the admin
   *  knows before deleting; does NOT block deletion (see
   *  deleteProductSize's own comment for why: product_size_id is ON
   *  DELETE SET NULL, unlike products.id's ON DELETE RESTRICT). */
  historicalQuoteCount: number;
};

export type ProductSizeFieldErrors = Partial<
  Record<"size_label" | "sort_order" | "stock_quantity", string>
>;

export type ProductSizeActionState =
  | { status: "idle" }
  | { status: "success" }
  | {
      status: "error";
      message: string;
      fieldErrors?: ProductSizeFieldErrors;
    };

export const PRODUCT_SIZE_ACTION_INITIAL_STATE: ProductSizeActionState = {
  status: "idle",
};

/** Images are a nested resource of one product's edit page (Prompt 34),
 *  same pattern as AdminProductSizeRow above. storage_path only -- the
 *  public URL is computed at render time via getPublicStorageUrl
 *  (lib/supabase/storage.ts), never stored. */
export type AdminProductImageRow = {
  id: string;
  product_id: string;
  storage_path: string;
  sort_order: number;
  /** Exactly one row per product has this true whenever the product has
   *  at least one image -- see lib/admin/product-images.ts's own comment
   *  for how upload/delete/setPrimary all cooperate to guarantee that
   *  invariant (first upload auto-primary, deleting the primary
   *  auto-promotes another, explicit set-primary unsets the old one
   *  first). */
  is_primary: boolean;
};

export type ProductImageFieldErrors = Partial<
  Record<"file" | "sort_order", string>
>;

export type ProductImageActionState =
  | { status: "idle" }
  | { status: "success" }
  | {
      status: "error";
      message: string;
      fieldErrors?: ProductImageFieldErrors;
    };

export const PRODUCT_IMAGE_ACTION_INITIAL_STATE: ProductImageActionState = {
  status: "idle",
};
