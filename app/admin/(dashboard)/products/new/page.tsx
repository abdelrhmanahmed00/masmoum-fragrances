import type { Metadata } from "next";
import { createSessionClient } from "@/lib/supabase/server";
import { getCategoryOptions } from "@/lib/admin/products";
import ProductForm from "@/components/admin/ProductForm";

export const metadata: Metadata = {
  title: "Add Product — Masmoum Admin",
  robots: { index: false, follow: false },
};

export default async function AdminNewProductPage() {
  const supabase = await createSessionClient();
  const categories = await getCategoryOptions(supabase);

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <h1 className="text-xl font-semibold text-brand-black">Add Product</h1>
      <div className="mt-6">
        <ProductForm mode="create" categories={categories} />
      </div>
    </div>
  );
}
