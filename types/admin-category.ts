export type AdminCategoryRow = {
  id: string;
  slug: string;
  name_en: string;
  name_ar: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
};

export type CategoryFieldErrors = Partial<
  Record<"name_en" | "name_ar" | "slug" | "sort_order", string>
>;

export type CategoryActionState =
  | { status: "idle" }
  | { status: "success" }
  | { status: "error"; message: string; fieldErrors?: CategoryFieldErrors };

export const CATEGORY_ACTION_INITIAL_STATE: CategoryActionState = {
  status: "idle",
};
