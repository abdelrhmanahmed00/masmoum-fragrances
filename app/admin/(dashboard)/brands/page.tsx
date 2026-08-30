import type { Metadata } from "next";
import Link from "next/link";
import { createSessionClient } from "@/lib/supabase/server";
import DeleteBrandButton from "@/components/admin/DeleteBrandButton";
import type { AdminBrandRow } from "@/types/admin-brand";

export const metadata: Metadata = {
  title: "Brands — Masmoum Admin",
  robots: { index: false, follow: false },
};

// createSessionClient (not createPublicClient): same reasoning as the
// categories list page -- the admin needs to see every brand, including
// inactive ones, which the RLS admin policy (0026 migration's
// "brands_admin_all", OR'd with the public is_active-only policy)
// already grants.
async function getAllBrands(): Promise<AdminBrandRow[]> {
  const supabase = await createSessionClient();
  const { data, error } = await supabase
    .from("brands")
    .select("id, slug, name_en, name_ar, sort_order, is_active, created_at")
    .order("sort_order", { ascending: true });

  if (error || !data) return [];
  return data;
}

export default async function AdminBrandsPage() {
  const brands = await getAllBrands();

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-brand-black">Brands</h1>
        <Link
          href="/admin/brands/new"
          className="rounded-btn border border-brand-black bg-brand-black px-4 py-2 text-sm font-medium text-brand-white transition-colors hover:bg-brand-white hover:text-brand-black"
        >
          Add Brand
        </Link>
      </div>

      {brands.length === 0 ? (
        <p className="mt-8 text-sm text-brand-gray">No brands yet.</p>
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
              {brands.map((brand) => (
                <tr
                  key={brand.id}
                  className="border-b border-brand-border last:border-0"
                >
                  <td className="px-4 py-3">
                    <div className="font-medium text-brand-black">
                      {brand.name_en}
                    </div>
                    <div className="text-xs text-brand-gray" dir="rtl">
                      {brand.name_ar}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-brand-gray">{brand.slug}</td>
                  <td className="px-4 py-3 text-brand-gray">
                    {brand.sort_order}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={
                        "rounded-full px-2 py-0.5 text-xs font-medium " +
                        (brand.is_active
                          ? "bg-green-100 text-green-700"
                          : "bg-brand-border text-brand-gray")
                      }
                    >
                      {brand.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Link
                        href={`/admin/brands/${brand.id}/edit`}
                        className="text-brand-black underline-offset-2 hover:underline"
                      >
                        Edit
                      </Link>
                      <DeleteBrandButton id={brand.id} name={brand.name_en} />
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
