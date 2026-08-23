"use server";

import { updateTag } from "next/cache";
import { createSessionClient } from "@/lib/supabase/server";
import {
  createProductSize,
  updateProductSize,
  deleteProductSize,
} from "@/lib/admin/product-sizes";
import {
  uploadProductImage,
  updateProductImageSortOrder,
  setPrimaryProductImage,
  deleteProductImage,
} from "@/lib/admin/product-images";
import type {
  ProductSizeActionState,
  ProductImageActionState,
} from "@/types/admin-product";

/**
 * Product sizes (Prompt 32) are a nested resource of one product's edit
 * page, not a top-level admin section -- these live colocated with that
 * page rather than in products/actions.ts, which stays scoped to the
 * product resource itself. Same createSessionClient/least-privilege
 * reasoning as every other admin action (0014 migration already grants
 * `authenticated` full CRUD on product_sizes -- confirmed by re-reading
 * that migration, no new RLS policy needed for this prompt).
 *
 * No redirect() after success, unlike createProductAction/updateProductAction
 * in products/actions.ts -- the admin stays on the same edit page to keep
 * managing more sizes. ProductSizesSection.tsx calls router.refresh() on
 * success instead, which re-runs this route's Server Component tree. That
 * alone is enough for the admin's OWN view to pick up the change (no
 * separate cache to invalidate there): the edit page's data read goes
 * through createSessionClient, which awaits cookies() internally, and any
 * use of cookies() opts the whole route into dynamic rendering -- so the
 * admin's read is already uncached/fresh on every request.
 *
 * updateTag("products") is still required, and is the ONLY tag needed:
 * sizes are embedded in the public product detail page's single
 * getProductBySlug() read (lib/catalog.ts), which already carries the
 * "products" tag (confirmed by re-reading that function for this prompt)
 * -- no new/separate tag to add.
 */

export async function createProductSizeAction(
  productId: string,
  _prevState: ProductSizeActionState,
  formData: FormData
): Promise<ProductSizeActionState> {
  const supabase = await createSessionClient();
  const result = await createProductSize(supabase, productId, formData);

  if (result.status === "success") {
    updateTag("products");
  }

  return result;
}

export async function updateProductSizeAction(
  productId: string,
  sizeId: string,
  _prevState: ProductSizeActionState,
  formData: FormData
): Promise<ProductSizeActionState> {
  const supabase = await createSessionClient();
  const result = await updateProductSize(supabase, productId, sizeId, formData);

  if (result.status === "success") {
    updateTag("products");
  }

  return result;
}

export async function deleteProductSizeAction(
  productId: string,
  sizeId: string
): Promise<ProductSizeActionState> {
  const supabase = await createSessionClient();
  const result = await deleteProductSize(supabase, productId, sizeId);

  if (result.status === "success") {
    updateTag("products");
  }

  return result;
}

/**
 * Product images (Prompt 34) -- same nested-resource pattern as sizes
 * above, colocated for the same reasons. createSessionClient is also
 * what authorizes the Storage upload/delete calls inside
 * lib/admin/product-images.ts, not a separate client -- see the 0019
 * migration's own comment for why session-based (RLS-governed) Storage
 * access was chosen over a service-role client here.
 */

export async function uploadProductImageAction(
  productId: string,
  _prevState: ProductImageActionState,
  formData: FormData
): Promise<ProductImageActionState> {
  const supabase = await createSessionClient();
  const result = await uploadProductImage(supabase, productId, formData);

  if (result.status === "success") {
    updateTag("products");
  }

  return result;
}

export async function updateProductImageSortOrderAction(
  productId: string,
  imageId: string,
  _prevState: ProductImageActionState,
  formData: FormData
): Promise<ProductImageActionState> {
  const supabase = await createSessionClient();
  const result = await updateProductImageSortOrder(supabase, productId, imageId, formData);

  if (result.status === "success") {
    updateTag("products");
  }

  return result;
}

export async function setPrimaryProductImageAction(
  productId: string,
  imageId: string
): Promise<ProductImageActionState> {
  const supabase = await createSessionClient();
  const result = await setPrimaryProductImage(supabase, productId, imageId);

  if (result.status === "success") {
    updateTag("products");
  }

  return result;
}

export async function deleteProductImageAction(
  productId: string,
  imageId: string
): Promise<ProductImageActionState> {
  const supabase = await createSessionClient();
  const result = await deleteProductImage(supabase, productId, imageId);

  if (result.status === "success") {
    updateTag("products");
  }

  return result;
}
