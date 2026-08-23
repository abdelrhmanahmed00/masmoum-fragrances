export type AdminHeroSlideRow = {
  id: string;
  storage_path: string;
  headline_en: string | null;
  headline_ar: string | null;
  subheadline_en: string | null;
  subheadline_ar: string | null;
  cta_label_en: string | null;
  cta_label_ar: string | null;
  cta_href: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
};

export type HeroSlideFieldErrors = Partial<
  Record<
    | "file"
    | "headline_en"
    | "headline_ar"
    | "subheadline_en"
    | "subheadline_ar"
    | "cta_label_en"
    | "cta_label_ar"
    | "cta_href"
    | "sort_order",
    string
  >
>;

export type HeroSlideActionState =
  | { status: "idle" }
  | { status: "success" }
  | { status: "error"; message: string; fieldErrors?: HeroSlideFieldErrors };

export const HERO_SLIDE_ACTION_INITIAL_STATE: HeroSlideActionState = {
  status: "idle",
};
