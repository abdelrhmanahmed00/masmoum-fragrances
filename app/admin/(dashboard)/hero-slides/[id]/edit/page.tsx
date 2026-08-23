import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createSessionClient } from "@/lib/supabase/server";
import HeroSlideForm from "@/components/admin/HeroSlideForm";
import type { AdminHeroSlideRow } from "@/types/admin-hero";

export const metadata: Metadata = {
  title: "Edit Hero Slide — Masmoum Admin",
  robots: { index: false, follow: false },
};

const HERO_SLIDE_COLUMNS =
  "id, storage_path, headline_en, headline_ar, subheadline_en, subheadline_ar, " +
  "cta_label_en, cta_label_ar, cta_href, sort_order, is_active, created_at";

export default async function AdminEditHeroSlidePage({
  params,
}: PageProps<"/admin/hero-slides/[id]/edit">) {
  const { id } = await params;

  const supabase = await createSessionClient();
  const { data, error } = await supabase
    .from("hero_slides")
    .select(HERO_SLIDE_COLUMNS)
    .eq("id", id)
    .maybeSingle();

  if (error || !data) notFound();

  const slide = data as unknown as AdminHeroSlideRow;

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <h1 className="text-xl font-semibold text-brand-black">
        Edit Hero Slide
      </h1>
      <div className="mt-6">
        <HeroSlideForm mode="edit" slide={slide} />
      </div>
    </div>
  );
}
