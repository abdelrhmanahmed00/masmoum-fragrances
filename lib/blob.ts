import "server-only";
import { put, del } from "@vercel/blob";
import type { SupabaseClient } from "@supabase/supabase-js";
import InitVips from "wasm-vips";

type VipsInstance = Awaited<ReturnType<typeof InitVips>>;

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

// Prompt 195 -- server-side enforcement: compression previously only
// happened in the BROWSER (lib/image-compression.ts), so any other
// upload path (a script, a direct API call, a future integration) could
// store an original multi-MB file straight to Blob -- confirmed this
// really happened: the Prompt 192 Supabase->Blob migration moved 185
// un-recompressed originals (4-5MB each, 177MB total) because that
// migration copied bytes as-is, never re-encoded them. This function is
// the one place every image-shaped upload across all 7 admin modules now
// goes through, so it's the only place this enforcement needs to live.
//
// wasm-vips, not sharp: sharp has a documented, currently-unresolved,
// recurring failure mode on Vercel's Next.js serverless functions
// ("Could not load the 'sharp' module using the linux-x64 runtime" --
// Next's file-tracing can't follow sharp's runtime require() of its
// native binary). wasm-vips has no native binary at all -- it's
// libvips compiled to WebAssembly, so there's nothing for file-tracing
// to miss. Confirmed working with a real sample photo before writing
// this (same visual quality, same output size as sharp on the same
// input) rather than assumed from documentation alone. Slower than
// sharp per published benchmarks, but this runs once per upload, not in
// a hot request-serving path -- irrelevant at this project's single-admin
// upload volume.
//
// Module-level singleton: initializing the WASM runtime has real
// startup cost, so it's done ONCE per warm serverless container and
// reused across every upload that container handles, not re-initialized
// per call.
let vipsPromise: Promise<VipsInstance> | null = null;
function getVips(): Promise<VipsInstance> {
  if (!vipsPromise) vipsPromise = InitVips();
  return vipsPromise;
}

export type BlobImageProfile = "full" | "thumbnail";

// Ceilings, not targets -- a correctly-compressed real photo lands WAY
// under these (measured: ~25-100KB typical for "full", ~3-25KB typical
// for "thumbnail", see the Prompt 195 compression script's own real
// output). These exist to catch the case a resize+re-encode still isn't
// enough (an unusually complex/noisy source image), rejecting it rather
// than silently storing something oversized.
const IMAGE_PROFILES: Record<
  BlobImageProfile,
  { maxDimension: number; quality: number; maxBytes: number }
> = {
  full: { maxDimension: 1600, quality: 80, maxBytes: 400 * 1024 },
  thumbnail: { maxDimension: 500, quality: 75, maxBytes: 100 * 1024 },
};

/**
 * Resizes and re-encodes an image server-side (always WebP, regardless
 * of the input format) before uploading to Blob -- the hard enforcement
 * layer every image-shaped upload call site now goes through, so a
 * caller can never bypass compression the way a direct API call or
 * script could before this. Rejects (throws) if the result is STILL
 * above the profile's byte ceiling after compression, rather than
 * silently storing an oversized file.
 *
 * `path`'s extension is normalized to `.webp` -- the output is always
 * WebP regardless of what the caller's path suggested, since this
 * function fully re-encodes every input.
 */
export async function uploadImageToBlob(
  path: string,
  file: File | Blob,
  profile: BlobImageProfile
): Promise<string> {
  const config = IMAGE_PROFILES[profile];
  const inputBytes = Buffer.from(await file.arrayBuffer());

  const vips = await getVips();
  const thumbnail = vips.Image.thumbnailBuffer(inputBytes, config.maxDimension, {
    height: config.maxDimension,
    size: "down",
  });

  let outputBytes: Uint8Array;
  try {
    outputBytes = thumbnail.webpsaveBuffer({ Q: config.quality });
  } finally {
    // wasm-vips is a WASM/Emscripten binding -- its Image objects hold
    // native heap memory that the JS garbage collector doesn't know
    // about, so they must be freed explicitly. Not using the `using`
    // keyword (wasm-vips's own README example does): that requires
    // either native explicit-resource-management support or a
    // `--js-explicit-resource-management` Node flag this project can't
    // guarantee is set in Vercel's serverless runtime -- a plain
    // try/finally works on any Node version with no special flag.
    thumbnail.delete();
  }

  if (outputBytes.length > config.maxBytes) {
    throw new Error(
      `Image still ${outputBytes.length} bytes after compression, over the ${config.maxBytes}-byte cap for "${profile}" images.`
    );
  }

  const webpPath = path.replace(/\.[a-z0-9]+$/i, ".webp");
  return uploadToBlob(webpPath, Buffer.from(outputBytes), "image/webp");
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
