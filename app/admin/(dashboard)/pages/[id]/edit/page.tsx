import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createSessionClient } from "@/lib/supabase/server";
import PageForm from "@/components/admin/PageForm";
import type { AdminPageRow } from "@/types/admin-page";

export const metadata: Metadata = {
  title: "Edit Page — Masmoum Admin",
  robots: { index: false, follow: false },
};

export default async function AdminEditPagePage({
  params,
}: PageProps<"/admin/pages/[id]/edit">) {
  const { id } = await params;

  const supabase = await createSessionClient();
  const { data, error } = await supabase
    .from("pages")
    .select("id, slug, title_en, title_ar, content_en, content_ar, is_active, created_at")
    .eq("id", id)
    .maybeSingle();

  if (error || !data) notFound();

  const page = data as AdminPageRow;

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <h1 className="text-xl font-semibold text-brand-black">Edit Page</h1>
      <div className="mt-6">
        <PageForm mode="edit" page={page} />
      </div>
    </div>
  );
}
