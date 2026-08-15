const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;

export type StorageBucket = "hero-images" | "product-images";

/**
 * Builds the public URL for an object in a public Supabase Storage bucket
 * from its storage_path (as stored in hero_slides.storage_path,
 * product_images.storage_path, etc.) — the database only ever stores the
 * path within the bucket, never a full URL, so every component that
 * renders a Storage-backed image goes through this instead of repeating
 * the URL shape itself.
 *
 * Safe to call from both Server and Client Components — it only reads the
 * public env var and does plain string construction, no Supabase client
 * instance needed.
 */
export function getPublicStorageUrl(
  bucket: StorageBucket,
  storagePath: string
): string {
  if (!SUPABASE_URL) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL environment variable."
    );
  }

  const encodedPath = storagePath
    .replace(/^\/+/, "")
    .split("/")
    .map(encodeURIComponent)
    .join("/");

  return `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${encodedPath}`;
}
