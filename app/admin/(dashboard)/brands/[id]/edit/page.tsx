import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createSessionClient } from "@/lib/supabase/server";
import BrandForm from "@/components/admin/BrandForm";
import type { AdminBrandRow } from "@/types/admin-brand";

export const metadata: Metadata = {
  title: "Edit Brand — Masmoum Admin",
  robots: { index: false, follow: false },
};

export default async function AdminEditBrandPage({
  params,
}: PageProps<"/admin/brands/[id]/edit">) {
  const { id } = await params;

  const supabase = await createSessionClient();
  const { data, error } = await supabase
    .from("brands")
    .select("id, slug, name_en, name_ar, sort_order, is_active, created_at")
    .eq("id", id)
    .maybeSingle();

  if (error || !data) notFound();

  const brand = data as AdminBrandRow;

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <h1 className="text-xl font-semibold text-brand-black">Edit Brand</h1>
      <div className="mt-6">
        <BrandForm mode="edit" brand={brand} />
      </div>
    </div>
  );
}
