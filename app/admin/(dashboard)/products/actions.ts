"use server";

import { redirect } from "next/navigation";
import { updateTag } from "next/cache";
import { createSessionClient } from "@/lib/supabase/server";
import { createProduct, updateProduct, deleteProduct } from "@/lib/admin/products";
import type { ProductActionState } from "@/types/admin-product";

/**
 * Mirrors categories'/collections' actions.ts (Prompts 23/26) exactly --
 * same createSessionClient/least-privilege reasoning (0014 migration
 * grants `authenticated` full CRUD on products), same updateTag-over-
 * revalidateTag reasoning.
 *
 * Tag is "products" -- a NEW, broader tag than categories'/collections'
 * were, because products feed more surfaces than either: the homepage
 * tabs (ProductsSection.tsx), every category page, every collection
 * page, the site-wide /products listing, AND the product's own detail
 * page. Every one of those reads is now tagged "products" in addition to
 * whatever it already carried (lib/catalog.ts and ProductsSection.tsx --
 * see the Prompt 27 report for the full list of call sites). One
 * updateTag("products") call after a successful mutation invalidates all
 * of them at once.
 */

export async function createProductAction(
  _prevState: ProductActionState,
  formData: FormData
): Promise<ProductActionState> {
  const supabase = await createSessionClient();
  const result = await createProduct(supabase, formData);

  if (result.status === "success") {
    updateTag("products");
    redirect("/admin/products");
  }

  return result;
}

export async function updateProductAction(
  id: string,
  _prevState: ProductActionState,
  formData: FormData
): Promise<ProductActionState> {
  const supabase = await createSessionClient();
  const result = await updateProduct(supabase, id, formData);

  if (result.status === "success") {
    updateTag("products");
    redirect("/admin/products");
  }

  return result;
}

export async function deleteProductAction(
  id: string
): Promise<ProductActionState> {
  const supabase = await createSessionClient();
  const result = await deleteProduct(supabase, id);

  if (result.status === "success") {
    updateTag("products");
  }

  return result;
}
