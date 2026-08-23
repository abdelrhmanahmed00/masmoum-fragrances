import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  AdminProductImageRow,
  ProductImageActionState,
  ProductImageFieldErrors,
} from "@/types/admin-product";

// Same plain-function-taking-a-client split as lib/admin/product-sizes.ts
// (Prompt 32) / products.ts -- see products.ts's own comment for the full
// reasoning. Every function scopes its query to the given productId
// (`.eq("product_id", productId)`), same defense-in-depth as sizes.

const BUCKET = "product-images";

// Must match the bucket's own real limits (0012 migration:
// file_size_limit = 5242880, allowed_mime_types = the same three keys
// below) -- re-checked here so a rejection gets a clear message instead
// of a raw Storage API error, not because the bucket itself doesn't
// already enforce this (it does, and remains the real backstop -- same
// "DB/storage constraints are the backstop, not the only check"
// philosophy used everywhere else in this project).
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;
const EXTENSION_BY_MIME_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export async function getProductImages(
  supabase: SupabaseClient,
  productId: string
): Promise<AdminProductImageRow[]> {
  const { data, error } = await supabase
    .from("product_images")
    .select("id, product_id, storage_path, sort_order, is_primary")
    .eq("product_id", productId)
    .order("sort_order", { ascending: true });

  return error || !data ? [] : data;
}

/**
 * Upload a new image. Order of operations is deliberate: Storage upload
 * FIRST, product_images row SECOND -- never insert a DB row pointing at
 * a file that didn't actually make it into the bucket. If the DB insert
 * then fails for any reason, the now-orphaned Storage object is cleaned
 * up immediately (not left to be caught later) since we still have the
 * path in hand at that exact moment -- the only case this function
 * doesn't (can't) fully protect against is the reverse failure a moment
 * later (process killed between insert success and function return),
 * which is an inherent limit of two separate systems with no shared
 * transaction, same class of tradeoff already accepted elsewhere in this
 * project (e.g. the old quote_requests/quote_request_items two-insert
 * design before Prompt 30's RPC) -- not worth a full RPC here since
 * nothing about this is a race-safety concern (single-admin model, see
 * the 0019 migration's own comment).
 */
export async function uploadProductImage(
  supabase: SupabaseClient,
  productId: string,
  formData: FormData
): Promise<ProductImageActionState> {
  const file = formData.get("file");

  if (!(file instanceof File) || file.size === 0) {
    const fieldErrors: ProductImageFieldErrors = { file: "Choose an image file." };
    return {
      status: "error",
      message: "Please choose an image file.",
      fieldErrors,
    };
  }

  // Real server-side re-check of the file's actual type/size from the
  // FormData File object itself -- not trusting the client-side
  // pre-check (UI only, easy to bypass) or any hidden field the client
  // might have sent alongside it.
  const extension = EXTENSION_BY_MIME_TYPE[file.type];
  if (!extension) {
    return {
      status: "error",
      message: "Unsupported file type -- only JPEG, PNG, and WEBP images are allowed.",
      fieldErrors: { file: "Only JPEG, PNG, or WEBP images are allowed." },
    };
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return {
      status: "error",
      message: "File is too large -- the limit is 5MB.",
      fieldErrors: { file: "Must be 5MB or smaller." },
    };
  }

  // Fresh, unique path every upload -- crypto.randomUUID(), never a fixed
  // name that could be overwritten. Deliberate, not incidental: Prompt 7
  // found Supabase's CDN can keep serving a STALE cached response for a
  // path that gets overwritten in place, so a replaced image could show
  // old bytes to some visitors for a while. A brand-new path every time
  // sidesteps that entirely -- there's never anything to invalidate,
  // because the URL itself always changes.
  const path = `${productId}/${crypto.randomUUID()}.${extension}`;

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { contentType: file.type, upsert: false });

  if (uploadError) {
    return {
      status: "error",
      message: "Something went wrong uploading the image. Please try again.",
    };
  }

  // First image for this product auto-becomes primary -- part of the
  // "exactly one primary once at least one image exists" invariant (see
  // this file's other functions for the other two legs: deleting the
  // primary auto-promotes another, explicit set-primary unsets the old
  // one first).
  const { count } = await supabase
    .from("product_images")
    .select("id", { count: "exact", head: true })
    .eq("product_id", productId);

  const isFirstImage = !count;
  const nextSortOrder = count ?? 0;

  const { error: insertError } = await supabase.from("product_images").insert({
    product_id: productId,
    storage_path: path,
    sort_order: nextSortOrder,
    is_primary: isFirstImage,
  });

  if (insertError) {
    // The file DID upload -- clean up the now-orphaned object rather
    // than leave a permanent leak no product_images row will ever
    // reference.
    await supabase.storage.from(BUCKET).remove([path]);
    return {
      status: "error",
      message: "Something went wrong saving the image. Please try again.",
    };
  }

  return { status: "success" };
}

export async function updateProductImageSortOrder(
  supabase: SupabaseClient,
  productId: string,
  imageId: string,
  formData: FormData
): Promise<ProductImageActionState> {
  const raw = formData.get("sort_order");
  const fieldErrors: ProductImageFieldErrors = {};
  let sort_order = 0;
  if (typeof raw === "string" && raw.trim() !== "") {
    const parsed = Number(raw);
    if (!Number.isInteger(parsed)) {
      fieldErrors.sort_order = "Sort order must be a whole number.";
    } else {
      sort_order = parsed;
    }
  }

  if (Object.keys(fieldErrors).length > 0) {
    return {
      status: "error",
      message: "Please fix the highlighted field.",
      fieldErrors,
    };
  }

  const { error } = await supabase
    .from("product_images")
    .update({ sort_order })
    .eq("id", imageId)
    .eq("product_id", productId);

  if (error) {
    return {
      status: "error",
      message: "Something went wrong saving the sort order. Please try again.",
    };
  }

  return { status: "success" };
}

/**
 * Set a different image as primary. Order matters here too: unset
 * whatever is CURRENTLY primary first, then set the new one -- never the
 * reverse. product_images_one_primary_per_product (0006 migration) is a
 * partial unique index on (product_id) WHERE is_primary -- at most one
 * true row per product at any instant. Unsetting first guarantees this
 * two-step sequence never asks Postgres to have two rows both true at
 * once, which the reverse order could, briefly, if a second call
 * happened to run between the steps (single-admin model, so genuinely
 * unlikely in practice -- but the ordering costs nothing and removes the
 * question entirely rather than relying on the rarity of the race).
 */
export async function setPrimaryProductImage(
  supabase: SupabaseClient,
  productId: string,
  imageId: string
): Promise<ProductImageActionState> {
  const { error: unsetError } = await supabase
    .from("product_images")
    .update({ is_primary: false })
    .eq("product_id", productId)
    .eq("is_primary", true);

  if (unsetError) {
    return {
      status: "error",
      message: "Something went wrong updating the primary image. Please try again.",
    };
  }

  const { error: setError, data } = await supabase
    .from("product_images")
    .update({ is_primary: true })
    .eq("id", imageId)
    .eq("product_id", productId)
    .select("id");

  if (setError || !data || data.length === 0) {
    return {
      status: "error",
      message: "Something went wrong setting this image as primary. Please try again.",
    };
  }

  return { status: "success" };
}

/**
 * Delete one image -- both the DB row AND the actual Storage object
 * (Prompt 34 closes the gap Prompt 27 flagged: a DB cascade has no way
 * to reach an external Storage bucket, so this always has to be done
 * explicitly, never just relied on).
 *
 * Ordering: DB row deleted FIRST, Storage object removed AFTER.
 * Deliberate, not arbitrary -- if the Storage removal fails partway
 * (network blip, etc.), the worst outcome is an orphaned file nobody can
 * see or reference: wasted space, but harmless. Doing it in the other
 * order and having the DB delete then fail would be worse -- a live
 * product_images row left pointing at a file that's already gone, which
 * breaks a real image on the public site immediately. A failed Storage
 * cleanup is logged (console.warn), not silently swallowed -- same "don't
 * leave zero trace" reasoning as the honeypot warning (Prompt 31) -- but
 * does NOT fail the overall delete, since the part that actually matters
 * for correctness (the DB row, what buyers see) already succeeded.
 *
 * Primary invariant: if the deleted image WAS primary and other images
 * remain, auto-promote the next one (lowest sort_order) -- never leave
 * zero images primary while at least one still exists.
 */
export async function deleteProductImage(
  supabase: SupabaseClient,
  productId: string,
  imageId: string
): Promise<ProductImageActionState> {
  const { data: image, error: fetchError } = await supabase
    .from("product_images")
    .select("id, storage_path, is_primary")
    .eq("id", imageId)
    .eq("product_id", productId)
    .maybeSingle();

  if (fetchError || !image) {
    return { status: "error", message: "This image no longer exists." };
  }

  const { error: deleteError } = await supabase
    .from("product_images")
    .delete()
    .eq("id", imageId)
    .eq("product_id", productId);

  if (deleteError) {
    return {
      status: "error",
      message: "Something went wrong deleting the image. Please try again.",
    };
  }

  if (image.is_primary) {
    const { data: remaining } = await supabase
      .from("product_images")
      .select("id")
      .eq("product_id", productId)
      .order("sort_order", { ascending: true })
      .limit(1);

    if (remaining && remaining.length > 0) {
      await supabase
        .from("product_images")
        .update({ is_primary: true })
        .eq("id", remaining[0].id);
    }
  }

  const { error: storageError } = await supabase.storage
    .from(BUCKET)
    .remove([image.storage_path]);

  if (storageError) {
    console.warn(
      `[product-images] Storage object cleanup failed for "${image.storage_path}" after deleting product_images row ${imageId}. File is now orphaned in the bucket.`,
      storageError
    );
  }

  return { status: "success" };
}
