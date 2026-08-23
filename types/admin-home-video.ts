export type AdminHomeVideoRow = {
  id: string;
  storage_path: string | null;
  external_url: string | null;
  thumbnail_storage_path: string | null;
  caption_en: string | null;
  caption_ar: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
};

export type HomeVideoFieldErrors = Partial<
  Record<
    | "file"
    | "external_url"
    | "thumbnail"
    | "caption_en"
    | "caption_ar"
    | "sort_order",
    string
  >
>;

export type HomeVideoActionState =
  | { status: "idle" }
  | { status: "success" }
  | { status: "error"; message: string; fieldErrors?: HomeVideoFieldErrors };

export const HOME_VIDEO_ACTION_INITIAL_STATE: HomeVideoActionState = {
  status: "idle",
};
