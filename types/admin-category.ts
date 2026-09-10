export type AdminCategoryRow = {
  id: string;
  slug: string;
  name_en: string;
  name_ar: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  /** Prompt 125 -- nullable, the object's path within the
   *  "category-images" Storage bucket, not a full URL (see
   *  lib/supabase/storage.ts). Null until an admin uploads one; the
   *  homepage strip renders a graceful placeholder tile until then. */
  image_storage_path: string | null;
};

export type CategoryFieldErrors = Partial<
  Record<"name_en" | "name_ar" | "slug" | "sort_order" | "image", string>
>;

export type CategoryActionState =
  | { status: "idle" }
  | { status: "success" }
  | { status: "error"; message: string; fieldErrors?: CategoryFieldErrors };

export const CATEGORY_ACTION_INITIAL_STATE: CategoryActionState = {
  status: "idle",
};
