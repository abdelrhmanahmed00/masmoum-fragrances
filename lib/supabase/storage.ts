const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;

// Optional (Prompt 183): base URL of the Cloudflare Worker cache proxy that
// sits in front of Supabase Storage's public object URLs -- see
// cloudflare/image-cache-worker/ for the worker itself and its setup steps.
// When set, every Storage-backed image/video URL this project renders is
// built against this domain instead of hitting *.supabase.co directly, so
// repeat requests (across ALL visitors, not just one browser) are served
// from Cloudflare's free edge cache and never reach Supabase's egress
// meter at all. Deliberately optional and additive: leaving this unset
// (e.g. before the Worker + DNS are actually set up) falls straight back
// to the original direct-Supabase-URL behavior, so this is safe to deploy
// ahead of the Cloudflare-side setup being finished.
const IMAGE_CDN_URL = process.env.NEXT_PUBLIC_IMAGE_CDN_URL;

export type StorageBucket =
  | "hero-images"
  | "product-images"
  | "home-videos"
  | "private-label-images"
  | "category-images"
  | "perfume-gender-images"
  | "bottle-color-images"
  | "design-requests";

/**
 * Builds the public URL for an object in a public Supabase Storage bucket
 * from its storage_path (as stored in hero_slides.storage_path,
 * product_images.storage_path, etc.) — the database only ever stores the
 * path within the bucket, never a full URL, so every component that
 * renders a Storage-backed image goes through this instead of repeating
 * the URL shape itself.
 *
 * Safe to call from both Server and Client Components — it only reads
 * public env vars and does plain string construction, no Supabase client
 * instance needed.
 */
export function getPublicStorageUrl(
  bucket: StorageBucket,
  storagePath: string
): string {
  // Vercel Blob migration (Prompt 192): every upload call site now stores
  // the FULL public URL Blob's put() returns, not a bucket-relative path
  // -- this one check is what lets every existing read call site through
  // this function keep working unchanged for BOTH a row already migrated
  // to Blob (an absolute URL, returned as-is) AND a row not yet migrated
  // (still a plain Supabase-relative path, falls through to the existing
  // construction below). This is deliberately the ONLY code path that
  // needs to know about this distinction -- every caller stays unaware.
  if (/^https?:\/\//.test(storagePath)) {
    return storagePath;
  }

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

  const base = IMAGE_CDN_URL ?? SUPABASE_URL;

  return `${base}/storage/v1/object/public/${bucket}/${encodedPath}`;
}
