import type { Metadata } from "next";
import Link from "next/link";
import { createSessionClient } from "@/lib/supabase/server";
import DeletePageButton from "@/components/admin/DeletePageButton";
import type { AdminPageRow } from "@/types/admin-page";

export const metadata: Metadata = {
  title: "Pages — Masmoum Admin",
  robots: { index: false, follow: false },
};

// Mirrors categories'/collections' list pages -- createSessionClient
// (admin sees inactive rows too via the 0025 RLS admin policy),
// dynamically rendered via cookies().
async function getAllPages(): Promise<AdminPageRow[]> {
  const supabase = await createSessionClient();
  const { data, error } = await supabase
    .from("pages")
    .select("id, slug, title_en, title_ar, content_en, content_ar, is_active, created_at")
    .order("created_at", { ascending: true });

  if (error || !data) return [];
  return data;
}

export default async function AdminPagesPage() {
  const pages = await getAllPages();

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-brand-black">Pages</h1>
        <Link
          href="/admin/pages/new"
          className="rounded-btn border border-brand-black bg-brand-black px-4 py-2 text-sm font-medium text-brand-white transition-colors hover:bg-brand-white hover:text-brand-black"
        >
          Add Page
        </Link>
      </div>

      {pages.length === 0 ? (
        <p className="mt-8 text-sm text-brand-gray">No pages yet.</p>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-card border border-brand-border bg-brand-white">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-brand-border text-xs tracking-wide text-brand-gray uppercase">
                <th className="px-4 py-3 text-start font-medium">Title</th>
                <th className="px-4 py-3 text-start font-medium">Slug</th>
                <th className="px-4 py-3 text-start font-medium">Status</th>
                <th className="px-4 py-3 text-start font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {pages.map((page) => (
                <tr
                  key={page.id}
                  className="border-b border-brand-border last:border-0"
                >
                  <td className="px-4 py-3">
                    <div className="font-medium text-brand-black">
                      {page.title_en}
                    </div>
                    <div className="text-xs text-brand-gray" dir="rtl">
                      {page.title_ar}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-brand-gray">/pages/{page.slug}</td>
                  <td className="px-4 py-3">
                    <span
                      className={
                        "rounded-full px-2 py-0.5 text-xs font-medium " +
                        (page.is_active
                          ? "bg-green-100 text-green-700"
                          : "bg-brand-border text-brand-gray")
                      }
                    >
                      {page.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Link
                        href={`/admin/pages/${page.id}/edit`}
                        className="text-brand-black underline-offset-2 hover:underline"
                      >
                        Edit
                      </Link>
                      <DeletePageButton id={page.id} title={page.title_en} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
