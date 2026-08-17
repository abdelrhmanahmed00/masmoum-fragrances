import type { Metadata } from "next";
import Link from "next/link";
import { createSessionClient } from "@/lib/supabase/server";
import DeleteCollectionButton from "@/components/admin/DeleteCollectionButton";
import type { AdminCollectionRow } from "@/types/admin-collection";

// Mirrors app/admin/(dashboard)/categories/page.tsx (Prompt 23) exactly --
// same createSessionClient reasoning (admin sees inactive rows too via
// the 0014 RLS admin policy, route is dynamically rendered automatically
// because of the cookies() call inside createSessionClient).

export const metadata: Metadata = {
  title: "Collections — Masmoum Admin",
  robots: { index: false, follow: false },
};

async function getAllCollections(): Promise<AdminCollectionRow[]> {
  const supabase = await createSessionClient();
  const { data, error } = await supabase
    .from("collections")
    .select("id, slug, name_en, name_ar, sort_order, is_active, created_at")
    .order("sort_order", { ascending: true });

  if (error || !data) return [];
  return data;
}

export default async function AdminCollectionsPage() {
  const collections = await getAllCollections();

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-brand-black">
          Collections
        </h1>
        <Link
          href="/admin/collections/new"
          className="rounded-btn border border-brand-black bg-brand-black px-4 py-2 text-sm font-medium text-brand-white transition-colors hover:bg-brand-white hover:text-brand-black"
        >
          Add Collection
        </Link>
      </div>

      {collections.length === 0 ? (
        <p className="mt-8 text-sm text-brand-gray">No collections yet.</p>
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
              {collections.map((collection) => (
                <tr
                  key={collection.id}
                  className="border-b border-brand-border last:border-0"
                >
                  <td className="px-4 py-3">
                    <div className="font-medium text-brand-black">
                      {collection.name_en}
                    </div>
                    <div className="text-xs text-brand-gray" dir="rtl">
                      {collection.name_ar}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-brand-gray">
                    {collection.slug}
                  </td>
                  <td className="px-4 py-3 text-brand-gray">
                    {collection.sort_order}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={
                        "rounded-full px-2 py-0.5 text-xs font-medium " +
                        (collection.is_active
                          ? "bg-green-100 text-green-700"
                          : "bg-brand-border text-brand-gray")
                      }
                    >
                      {collection.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Link
                        href={`/admin/collections/${collection.id}/edit`}
                        className="text-brand-black underline-offset-2 hover:underline"
                      >
                        Edit
                      </Link>
                      <DeleteCollectionButton
                        id={collection.id}
                        name={collection.name_en}
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
