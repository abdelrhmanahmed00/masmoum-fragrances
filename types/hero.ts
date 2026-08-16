export type HeroSlide = {
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
};
