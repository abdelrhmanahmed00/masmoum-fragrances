// Mirrors types/admin-category.ts exactly -- same taxonomy shape, same
// admin CRUD conventions (Prompt 86, Phase A).

export type AdminBrandRow = {
  id: string;
  slug: string;
  name_en: string;
  name_ar: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
};

export type BrandFieldErrors = Partial<
  Record<"name_en" | "name_ar" | "slug" | "sort_order", string>
>;

export type BrandActionState =
  | { status: "idle" }
  | { status: "success" }
  | { status: "error"; message: string; fieldErrors?: BrandFieldErrors };

export const BRAND_ACTION_INITIAL_STATE: BrandActionState = {
  status: "idle",
};
