import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createSessionClient } from "@/lib/supabase/server";
import CategoryForm from "@/components/admin/CategoryForm";
import type { AdminCategoryRow } from "@/types/admin-category";

export const metadata: Metadata = {
  title: "Edit Category — Masmoum Admin",
  robots: { index: false, follow: false },
};

export default async function AdminEditCategoryPage({
  params,
}: PageProps<"/admin/categories/[id]/edit">) {
  const { id } = await params;

  const supabase = await createSessionClient();
  const { data, error } = await supabase
    .from("categories")
    .select("id, slug, name_en, name_ar, sort_order, is_active, created_at")
    .eq("id", id)
    .maybeSingle();

  if (error || !data) notFound();

  const category = data as AdminCategoryRow;

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <h1 className="text-xl font-semibold text-brand-black">
        Edit Category
      </h1>
      <div className="mt-6">
        <CategoryForm mode="edit" category={category} />
      </div>
    </div>
  );
}
