export type AdminPageRow = {
  id: string;
  slug: string;
  title_en: string;
  title_ar: string;
  content_en: string;
  content_ar: string;
  /** Prompt 91 -- optional, unlike content_en/ar: a short, purpose-built
   *  blurb shown in the Footer's "Contact Us" accordion (currently only
   *  populated on the "about" row), NOT a required field on every page.
   *  See the 0027 migration's own comment for the full reasoning. */
  footer_summary_en: string | null;
  footer_summary_ar: string | null;
  is_active: boolean;
  created_at: string;
};

export type PageFieldErrors = Partial<
  Record<"title_en" | "title_ar" | "slug" | "content_en" | "content_ar", string>
>;

export type PageActionState =
  | { status: "idle" }
  | { status: "success" }
  | { status: "error"; message: string; fieldErrors?: PageFieldErrors };

export const PAGE_ACTION_INITIAL_STATE: PageActionState = {
  status: "idle",
};
