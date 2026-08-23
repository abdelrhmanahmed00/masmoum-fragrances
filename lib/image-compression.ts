/**
 * Client-side image compression before upload (Prompt 82) — protects
 * Supabase Storage quota and speeds up the admin's own upload experience.
 * Does NOT affect visitor-facing site speed at all: next/image already
 * generates appropriately-sized/optimized variants per request regardless
 * of the stored original's size (confirmed in the Prompt 81 audit) — this
 * only changes what gets WRITTEN to Storage in the first place.
 *
 * Dependency-free (native Canvas API), not a library — both were
 * researched: a small library (e.g. browser-image-compression,
 * compressorjs, ~15-25KB gzipped) mainly wraps the same underlying
 * Canvas/OffscreenCanvas + toBlob() primitives this file uses directly,
 * adding Web Worker offloading and EXIF-orientation convenience as its
 * real value-add over hand-rolling it. For THIS project — an admin-only,
 * infrequent-upload tool, not a high-traffic public interaction — that
 * convenience doesn't justify a new dependency to track, especially given
 * this project's own established minimal-dependency discipline (7 real
 * dependencies total as of the Prompt 81 audit, no image/animation
 * libraries anywhere; every prior "do we need a package for this"
 * decision in this project's history has landed on native platform APIs
 * when they're genuinely sufficient — e.g. no marquee library, Prompts
 * 77/78; no toast library, Prompt 14's own inline "Added ✓" feedback).
 * The one real correctness risk of hand-rolling this — EXIF orientation
 * silently getting dropped, the classic "portrait phone photo uploads
 * sideways" bug in canvas-based compression — is handled explicitly
 * below via `createImageBitmap(file, { imageOrientation: "from-image" })`,
 * not skipped for the sake of a smaller function.
 */

const COMPRESSIBLE_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

// Below this, compression isn't worth running: the CPU/time cost of a
// resize+re-encode pass buys negligible (sometimes negative — see the
// re-encode-larger guard below) savings on a file that's already small.
// 500KB comfortably covers a typical already-optimized product photo
// exported from design software; anything under it is left untouched.
const SKIP_COMPRESSION_BELOW_BYTES = 500 * 1024;

// 2000px on the longest side: this project's own next.config.ts caps its
// largest real serving size (deviceSizes) at 1920px — 2000px comfortably
// covers that with a small margin, while still being meaningfully smaller
// than typical modern phone-camera photos (often 4000-6000px+ on the
// longest side), so most real uploads genuinely get downscaled, not just
// re-encoded at their original dimensions.
const DEFAULT_MAX_DIMENSION = 2000;

// 0.82: a standard "visually clean, meaningfully smaller" middle value —
// high enough that compression artifacts aren't visible on real product
// photography at normal viewing sizes, low enough to produce a real size
// reduction (the near-lossless 0.9+ range saves very little).
const DEFAULT_QUALITY = 0.82;

export type CompressImageOptions = {
  maxDimension?: number;
  quality?: number;
};

/**
 * Resizes (if larger than maxDimension on its longest side) and
 * re-encodes an image File as WebP, returning a new File. Deliberately
 * ALWAYS outputs WebP, regardless of the input's own type (jpeg/png/
 * webp) — it's the only one of this project's three accepted formats
 * that supports BOTH quality-based lossy compression AND alpha
 * transparency, so it's a strictly better target than re-encoding as
 * JPEG (would silently destroy transparency on a PNG source) or leaving
 * PNG as PNG (canvas.toBlob's quality argument is a no-op for PNG — it's
 * always lossless, so resizing would be the only real lever, not
 * genuine compression). The server-side upload functions
 * (lib/admin/product-images.ts, hero-slides.ts, home-videos.ts) need NO
 * changes for this: they already derive the stored file's extension from
 * its real `file.type`, and image/webp is already one of their accepted
 * MIME types.
 *
 * Falls back to returning the ORIGINAL file, unchanged, on any failure
 * (unsupported type, a canvas/bitmap error, a browser without the needed
 * APIs) — this is a best-effort optimization, not a hard requirement.
 * The existing server-side size/mime validation remains the real
 * backstop either way, so a compression failure should never block an
 * otherwise-valid upload.
 */
export async function compressImage(
  file: File,
  options: CompressImageOptions = {}
): Promise<File> {
  if (!COMPRESSIBLE_MIME_TYPES.has(file.type)) return file;
  if (file.size <= SKIP_COMPRESSION_BELOW_BYTES) return file;

  const maxDimension = options.maxDimension ?? DEFAULT_MAX_DIMENSION;
  const quality = options.quality ?? DEFAULT_QUALITY;

  try {
    const bitmap = await createImageBitmap(file, {
      imageOrientation: "from-image",
    });

    const scale = Math.min(
      1,
      maxDimension / Math.max(bitmap.width, bitmap.height)
    );
    const targetWidth = Math.round(bitmap.width * scale);
    const targetHeight = Math.round(bitmap.height * scale);

    const canvas = document.createElement("canvas");
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      bitmap.close();
      return file;
    }

    ctx.drawImage(bitmap, 0, 0, targetWidth, targetHeight);
    bitmap.close();

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/webp", quality)
    );
    if (!blob) return file;

    // A degenerate case worth guarding: a source with little redundancy
    // left (already heavily compressed) can occasionally re-encode
    // LARGER as WebP than it started — if that happens, the original is
    // the better upload, not the "compressed" one.
    if (blob.size >= file.size) return file;

    const newName = file.name.replace(/\.[^.]+$/, "") + ".webp";
    return new File([blob], newName, {
      type: "image/webp",
      lastModified: Date.now(),
    });
  } catch (error) {
    console.warn(
      "[image-compression] Falling back to the original file:",
      error
    );
    return file;
  }
}
