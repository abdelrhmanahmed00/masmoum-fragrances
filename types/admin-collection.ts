// Exact mirror of types/admin-category.ts (Prompt 23) -- same shape,
// same reasoning, s/Category/Collection/.

export type AdminCollectionRow = {
  id: string;
  slug: string;
  name_en: string;
  name_ar: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
};

export type CollectionFieldErrors = Partial<
  Record<"name_en" | "name_ar" | "slug" | "sort_order", string>
>;

export type CollectionActionState =
  | { status: "idle" }
  | { status: "success" }
  | { status: "error"; message: string; fieldErrors?: CollectionFieldErrors };

export const COLLECTION_ACTION_INITIAL_STATE: CollectionActionState = {
  status: "idle",
};
