import "server-only";
import { put, del } from "@vercel/blob";
import type { SupabaseClient } from "@supabase/supabase-js";

// Prompt 192 -- moves image/video BYTES off Supabase Storage entirely,
// onto Vercel Blob (same Vercel account/project this client already
// controls, no new external dependency). The DATABASE rows/schema stay on
// Supabase unchanged -- only what each storage_path-shaped column
// actually points at changes, from a bucket-relative path to a full
// Blob URL (see getPublicStorageUrl's own comment for how reads handle
// both shapes transparently during the migration).
//
// 1 year, matching this project's original Supabase Cache-Control intent
// (lib/config.ts's STORAGE_UPLOAD_CACHE_CONTROL_SECONDS) -- reused here
// as a plain local constant rather than importing that one, since this is
// a DIFFERENT storage backend's own cache setting, not a shared value the
// two systems need to stay in sync on. Vercel Blob's own CDN caching is
// NOT gated behind a paid plan (confirmed directly against Vercel's docs
// before this migration started) -- unlike Supabase's Smart CDN, this
// value will actually take effect.
const BLOB_CACHE_CONTROL_MAX_AGE_SECONDS = 31536000;

/**
 * Uploads a file to Vercel Blob, returning its full public URL. Every
 * caller passes a path shaped exactly like the bucket-relative path it
 * used to pass to Supabase's `.storage.from(bucket).upload(path, ...)` --
 * prefixed with the old bucket name so paths stay globally unique across
 * every former bucket now that they all share one Blob store (e.g.
 * `product-images/${productId}/${uuid}.webp`, `hero-images/${uuid}.jpg`).
 * `addRandomSuffix: false` -- every caller already generates its own
 * crypto.randomUUID()-based unique path, same collision-avoidance
 * reasoning already established for Supabase uploads; a second random
 * suffix layered on top would just make the stored path not match what
 * the caller thinks it uploaded.
 */
export async function uploadToBlob(
  path: string,
  file: File | Blob | ArrayBuffer | Buffer,
  contentType: string
): Promise<string> {
  const { url } = await put(path, file, {
    access: "public",
    addRandomSuffix: false,
    contentType,
    cacheControlMaxAge: BLOB_CACHE_CONTROL_MAX_AGE_SECONDS,
  });
  return url;
}

/**
 * Removes whatever a storage_path-shaped column currently holds --
 * transparently handling BOTH a row already migrated to Blob (an
 * absolute URL -> del()) and a row not yet migrated (still a plain
 * Supabase-relative path -> the old supabase.storage.remove()) -- same
 * dual-shape reasoning as getPublicStorageUrl. Every one of the 7 upload
 * modules' existing cleanup call sites swaps its old
 * `supabase.storage.from(BUCKET).remove([path])` for this, unchanged
 * otherwise -- this is the ONLY other place that needs to know about the
 * two possible shapes.
 */
export async function removeStorageValue(
  supabase: SupabaseClient,
  bucket: string,
  value: string
): Promise<void> {
  if (/^https?:\/\//.test(value)) {
    await del(value);
  } else {
    await supabase.storage.from(bucket).remove([value]);
  }
}

export async function removeStorageValues(
  supabase: SupabaseClient,
  bucket: string,
  values: string[]
): Promise<void> {
  const blobUrls = values.filter((v) => /^https?:\/\//.test(v));
  const supabasePaths = values.filter((v) => !/^https?:\/\//.test(v));

  if (blobUrls.length > 0) await del(blobUrls);
  if (supabasePaths.length > 0) {
    await supabase.storage.from(bucket).remove(supabasePaths);
  }
}
