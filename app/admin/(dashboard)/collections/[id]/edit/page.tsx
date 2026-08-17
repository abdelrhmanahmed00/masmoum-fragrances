import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createSessionClient } from "@/lib/supabase/server";
import CollectionForm from "@/components/admin/CollectionForm";
import type { AdminCollectionRow } from "@/types/admin-collection";

export const metadata: Metadata = {
  title: "Edit Collection — Masmoum Admin",
  robots: { index: false, follow: false },
};

export default async function AdminEditCollectionPage({
  params,
}: PageProps<"/admin/collections/[id]/edit">) {
  const { id } = await params;

  const supabase = await createSessionClient();
  const { data, error } = await supabase
    .from("collections")
    .select("id, slug, name_en, name_ar, sort_order, is_active, created_at")
    .eq("id", id)
    .maybeSingle();

  if (error || !data) notFound();

  const collection = data as AdminCollectionRow;

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <h1 className="text-xl font-semibold text-brand-black">
        Edit Collection
      </h1>
      <div className="mt-6">
        <CollectionForm mode="edit" collection={collection} />
      </div>
    </div>
  );
}
