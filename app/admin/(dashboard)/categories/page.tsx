import type { Metadata } from "next";
import Link from "next/link";
import { createSessionClient } from "@/lib/supabase/server";
import DeleteCategoryButton from "@/components/admin/DeleteCategoryButton";
import type { AdminCategoryRow } from "@/types/admin-category";

export const metadata: Metadata = {
  title: "Categories — Masmoum Admin",
  robots: { index: false, follow: false },
};

// createSessionClient (not createPublicClient): the admin needs to see
// EVERY category, including inactive ones, which the RLS admin policy
// (0014 migration's "categories_admin_all", OR'd with the public
// is_active-only policy) already grants to an authenticated session --
// no separate "include inactive" query flag needed, RLS handles it.
// Calling cookies() inside createSessionClient makes this route
// dynamically rendered automatically (confirmed in the build output --
// see the Prompt 23 report), which is correct: an admin list must never
// serve a stale cached response, unlike the public ISR-cached pages.
async function getAllCategories(): Promise<AdminCategoryRow[]> {
  const supabase = await createSessionClient();
  const { data, error } = await supabase
    .from("categories")
    .select("id, slug, name_en, name_ar, sort_order, is_active, created_at")
    .order("sort_order", { ascending: true });

  if (error || !data) return [];
  return data;
}

export default async function AdminCategoriesPage() {
  const categories = await getAllCategories();

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-brand-black">Categories</h1>
        <Link
          href="/admin/categories/new"
          className="rounded-btn border border-brand-black bg-brand-black px-4 py-2 text-sm font-medium text-brand-white transition-colors hover:bg-brand-white hover:text-brand-black"
        >
          Add Category
        </Link>
      </div>

      {categories.length === 0 ? (
        <p className="mt-8 text-sm text-brand-gray">No categories yet.</p>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-card border border-brand-border bg-brand-white">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-brand-border text-xs tracking-wide text-brand-gray uppercase">
                <th className="px-4 py-3 text-start font-medium">Name</th>
                <th className="px-4 py-3 text-start font-medium">Slug</th>
                <th className="px-4 py-3 text-start font-medium">Sort</th>
                <th className="px-4 py-3 text-start font-medium">Status</th>
                <th className="px-4 py-3 text-start font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((category) => (
                <tr
                  key={category.id}
                  className="border-b border-brand-border last:border-0"
                >
                  <td className="px-4 py-3">
                    <div className="font-medium text-brand-black">
                      {category.name_en}
                    </div>
                    <div className="text-xs text-brand-gray" dir="rtl">
                      {category.name_ar}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-brand-gray">
                    {category.slug}
                  </td>
                  <td className="px-4 py-3 text-brand-gray">
                    {category.sort_order}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={
                        "rounded-full px-2 py-0.5 text-xs font-medium " +
                        (category.is_active
                          ? "bg-green-100 text-green-700"
                          : "bg-brand-border text-brand-gray")
                      }
                    >
                      {category.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Link
                        href={`/admin/categories/${category.id}/edit`}
                        className="text-brand-black underline-offset-2 hover:underline"
                      >
                        Edit
                      </Link>
                      <DeleteCategoryButton
                        id={category.id}
                        name={category.name_en}
                      />
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
