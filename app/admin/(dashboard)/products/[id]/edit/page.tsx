import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createSessionClient } from "@/lib/supabase/server";
import { getCategoryOptions } from "@/lib/admin/products";
import { getProductSizes } from "@/lib/admin/product-sizes";
import { getProductImages } from "@/lib/admin/product-images";
import ProductForm from "@/components/admin/ProductForm";
import ProductSizesSection from "@/components/admin/ProductSizesSection";
import ProductImagesSection from "@/components/admin/ProductImagesSection";
import type { AdminProductRow } from "@/types/admin-product";

export const metadata: Metadata = {
  title: "Edit Product — Masmoum Admin",
  robots: { index: false, follow: false },
};

const PRODUCT_COLUMNS =
  "id, slug, category_id, name_en, name_ar, description_en, description_ar, " +
  "gender, fragrance_top_notes_en, fragrance_top_notes_ar, " +
  "fragrance_middle_notes_en, fragrance_middle_notes_ar, " +
  "fragrance_base_notes_en, fragrance_base_notes_ar, moq, stock_quantity, " +
  "is_active, is_featured, sort_order, created_at";

export default async function AdminEditProductPage({
  params,
}: PageProps<"/admin/products/[id]/edit">) {
  const { id } = await params;

  const supabase = await createSessionClient();
  const [{ data, error }, categories, sizes, images] = await Promise.all([
    supabase.from("products").select(PRODUCT_COLUMNS).eq("id", id).maybeSingle(),
    getCategoryOptions(supabase),
    getProductSizes(supabase, id),
    getProductImages(supabase, id),
  ]);

  if (error || !data) notFound();

  const product = data as unknown as AdminProductRow;

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <h1 className="text-xl font-semibold text-brand-black">Edit Product</h1>
      <div className="mt-6">
        <ProductForm mode="edit" product={product} categories={categories} />
        <ProductSizesSection
          productId={product.id}
          sizes={sizes}
          productStockQuantity={product.stock_quantity}
        />
        <ProductImagesSection productId={product.id} images={images} />
      </div>
    </div>
  );
}
