import type { Metadata } from "next";
import Link from "next/link";
import { createSessionClient } from "@/lib/supabase/server";
import DeleteProductButton from "@/components/admin/DeleteProductButton";
import type { AdminProductListRow } from "@/types/admin-product";

// Mirrors categories'/collections' list pages (Prompts 23/26) --
// createSessionClient (admin sees inactive rows too via the 0014 RLS
// admin policy), dynamically rendered automatically via cookies().
export const metadata: Metadata = {
  title: "Products — Masmoum Admin",
  robots: { index: false, follow: false },
};

const GENDER_LABEL: Record<string, string> = {
  men: "Men",
  women: "Women",
  unisex: "Unisex",
  not_applicable: "N/A",
};

// Joined category name (task requirement), not just category_id -- a
// product with zero sizes/images (true for every product this prompt
// can create, since those tables/UI don't exist until Parts 2/3) needs
// nothing special here: this query never touches product_sizes/
// product_images at all.
async function getAllProducts(): Promise<AdminProductListRow[]> {
  const supabase = await createSessionClient();
  const { data, error } = await supabase
    .from("products")
    .select(
      "id, slug, name_en, name_ar, gender, is_active, is_featured, sort_order, category:categories(name_en)"
    )
    .order("sort_order", { ascending: true });

  if (error || !data) return [];
  return data as unknown as AdminProductListRow[];
}

export default async function AdminProductsPage() {
  const products = await getAllProducts();

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-brand-black">Products</h1>
        <Link
          href="/admin/products/new"
          className="rounded-btn border border-brand-black bg-brand-black px-4 py-2 text-sm font-medium text-brand-white transition-colors hover:bg-brand-white hover:text-brand-black"
        >
          Add Product
        </Link>
      </div>

      {products.length === 0 ? (
        <p className="mt-8 text-sm text-brand-gray">No products yet.</p>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-card border border-brand-border bg-brand-white">
          <table className="w-full min-w-[820px] text-sm">
            <thead>
              <tr className="border-b border-brand-border text-xs tracking-wide text-brand-gray uppercase">
                <th className="px-4 py-3 text-start font-medium">Name</th>
                <th className="px-4 py-3 text-start font-medium">Category</th>
                <th className="px-4 py-3 text-start font-medium">Gender</th>
                <th className="px-4 py-3 text-start font-medium">Sort</th>
                <th className="px-4 py-3 text-start font-medium">Status</th>
                <th className="px-4 py-3 text-start font-medium">Featured</th>
                <th className="px-4 py-3 text-start font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => (
                <tr
                  key={product.id}
                  className="border-b border-brand-border last:border-0"
                >
                  <td className="px-4 py-3">
                    <div className="font-medium text-brand-black">
                      {product.name_en}
                    </div>
                    <div className="text-xs text-brand-gray" dir="rtl">
                      {product.name_ar}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-brand-gray">
                    {product.category?.name_en ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-brand-gray">
                    {GENDER_LABEL[product.gender] ?? product.gender}
                  </td>
                  <td className="px-4 py-3 text-brand-gray">
                    {product.sort_order}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={
                        "rounded-full px-2 py-0.5 text-xs font-medium " +
                        (product.is_active
                          ? "bg-green-100 text-green-700"
                          : "bg-brand-border text-brand-gray")
                      }
                    >
                      {product.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-brand-gray">
                    {product.is_featured ? "★" : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Link
                        href={`/admin/products/${product.id}/edit`}
                        className="text-brand-black underline-offset-2 hover:underline"
                      >
                        Edit
                      </Link>
                      <DeleteProductButton
                        id={product.id}
                        name={product.name_en}
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
