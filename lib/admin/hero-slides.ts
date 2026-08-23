import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { trimmedOrNull } from "@/lib/form-utils";
import type {
  AdminHeroSlideRow,
  HeroSlideActionState,
  HeroSlideFieldErrors,
} from "@/types/admin-hero";

// Same plain-function-taking-a-client split as lib/admin/categories.ts /
// products.ts / product-images.ts -- see categories.ts's own comment for
// the full reasoning. Unlike sizes/images (Prompts 32/34), hero slides
// are NOT a nested resource of some other admin page -- they're a real
// top-level admin section (their own list + new/edit pages), same shape
// as categories/collections/products themselves, because a slide's image
// is REQUIRED (a slide with no image doesn't mean anything, unlike a
// product that can legitimately exist with zero images/sizes yet) -- so
// create has to happen in one step (fields + image together), not
// "create the bare record, then add the image on a separate nested
// page" the way Products' sizes/images work.

const BUCKET = "hero-images";

// Must match the bucket's own real limits (0012 migration:
// file_size_limit = 5242880, allowed_mime_types = the same three keys
// below) -- re-checked here for a clear message, same "constraints are
// the backstop, not the only check" reasoning as lib/admin/product-images.ts.
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;
const EXTENSION_BY_MIME_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

type HeroSlideTextInput = {
  headline_en: string | null;
  headline_ar: string | null;
  subheadline_en: string | null;
  subheadline_ar: string | null;
  cta_label_en: string | null;
  cta_label_ar: string | null;
  cta_href: string | null;
  sort_order: number;
  is_active: boolean;
};

/**
 * Every text field is genuinely optional (Prompt 8's own finding,
 * restated in this prompt's task: the reference site's real slides are
 * often just a clickable image, no overlay at all) -- EXCEPT that CTA
 * label and CTA href only mean anything together. Re-read
 * HeroSlider.tsx's actual render logic to confirm this isn't guessed:
 * the CTA button only renders at all when `ctaLabel && slide.cta_href`
 * are BOTH truthy (components/home/HeroSlider.tsx line ~165) -- there is
 * no code path where cta_href alone makes the image clickable, or where
 * a label alone renders without a link. So a slide with a label but no
 * href (or vice versa) isn't a smaller/degraded CTA, it's a completely
 * invisible one -- a real, easy-to-make admin mistake worth catching
 * here rather than silently shipping a dead field to the public site.
 */
function validateText(formData: FormData): {
  fieldErrors: HeroSlideFieldErrors;
  values: HeroSlideTextInput | null;
} {
  const headline_en = trimmedOrNull(formData.get("headline_en"));
  const headline_ar = trimmedOrNull(formData.get("headline_ar"));
  const subheadline_en = trimmedOrNull(formData.get("subheadline_en"));
  const subheadline_ar = trimmedOrNull(formData.get("subheadline_ar"));
  const cta_label_en = trimmedOrNull(formData.get("cta_label_en"));
  const cta_label_ar = trimmedOrNull(formData.get("cta_label_ar"));
  const cta_href = trimmedOrNull(formData.get("cta_href"));
  const sortOrderRaw = formData.get("sort_order");
  const is_active = formData.get("is_active") === "on";

  const fieldErrors: HeroSlideFieldErrors = {};

  const hasCtaLabel = Boolean(cta_label_en || cta_label_ar);
  const hasCtaHref = Boolean(cta_href);
  if (hasCtaLabel !== hasCtaHref) {
    fieldErrors.cta_href =
      "Provide both a CTA label (English or Arabic) and a link, or leave both empty -- one without the other never renders on the public site.";
  }

  let sort_order = 0;
  if (typeof sortOrderRaw === "string" && sortOrderRaw.trim() !== "") {
    const parsed = Number(sortOrderRaw);
    if (!Number.isInteger(parsed)) {
      fieldErrors.sort_order = "Sort order must be a whole number.";
    } else {
      sort_order = parsed;
    }
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { fieldErrors, values: null };
  }

  return {
    fieldErrors,
    values: {
      headline_en,
      headline_ar,
      subheadline_en,
      subheadline_ar,
      cta_label_en,
      cta_label_ar,
      cta_href,
      sort_order,
      is_active,
    },
  };
}

function validateFile(
  file: FormDataEntryValue | null,
  { required }: { required: boolean }
): { error: string | null; file: File | null } {
  const provided = file instanceof File && file.size > 0;

  if (!provided) {
    return required
      ? { error: "Choose an image for this slide.", file: null }
      : { error: null, file: null };
  }

  const validFile = file as File;
  const extension = EXTENSION_BY_MIME_TYPE[validFile.type];
  if (!extension) {
    return {
      error: "Only JPEG, PNG, or WEBP images are allowed.",
      file: null,
    };
  }
  if (validFile.size > MAX_FILE_SIZE_BYTES) {
    return { error: "Must be 5MB or smaller.", file: null };
  }

  return { error: null, file: validFile };
}

export async function getHeroSlides(
  supabase: SupabaseClient
): Promise<AdminHeroSlideRow[]> {
  const { data, error } = await supabase
    .from("hero_slides")
    .select(
      "id, storage_path, headline_en, headline_ar, subheadline_en, subheadline_ar, cta_label_en, cta_label_ar, cta_href, sort_order, is_active, created_at"
    )
    .order("sort_order", { ascending: true });

  return error || !data ? [] : data;
}

/**
 * Create -- image REQUIRED (unlike Product Images, a slide with no image
 * isn't a valid in-progress state, it's meaningless). Same ordering as
 * every Storage-backed create in this project: upload FIRST, DB insert
 * SECOND, and if the insert then fails, clean up the now-orphaned
 * Storage object immediately rather than leave a permanent leak.
 */
export async function createHeroSlide(
  supabase: SupabaseClient,
  formData: FormData
): Promise<HeroSlideActionState> {
  const { fieldErrors, values } = validateText(formData);
  const { error: fileError, file } = validateFile(formData.get("file"), {
    required: true,
  });

  if (fileError) fieldErrors.file = fileError;

  if (!values || fileError || !file) {
    return {
      status: "error",
      message: "Please fix the highlighted fields.",
      fieldErrors,
    };
  }

  const extension = EXTENSION_BY_MIME_TYPE[file.type];
  const path = `${crypto.randomUUID()}.${extension}`;

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { contentType: file.type, upsert: false });

  if (uploadError) {
    return {
      status: "error",
      message: "Something went wrong uploading the image. Please try again.",
    };
  }

  const { error: insertError } = await supabase.from("hero_slides").insert({
    ...values,
    storage_path: path,
  });

  if (insertError) {
    await supabase.storage.from(BUCKET).remove([path]);
    return {
      status: "error",
      message: "Something went wrong saving the slide. Please try again.",
    };
  }

  return { status: "success" };
}

/**
 * Update -- image OPTIONAL (the admin may just be editing text/sort/
 * active, not replacing the photo). If a new file IS provided:
 *   1. Upload it to a fresh path (never overwrite the existing one --
 *      same CDN stale-cache avoidance as create/Prompt 34).
 *   2. Update the DB row (text fields + the NEW storage_path) --
 *      only after this succeeds do we know the new image is really live.
 *   3. Only THEN delete the OLD Storage object. Never the reverse order:
 *      deleting the old file before the DB row is confirmed pointing at
 *      the new one would leave a broken interim state (a live slide
 *      referencing a file that's already gone) if step 2 happened to
 *      fail. If step 2 fails, the newly-uploaded file is cleaned up
 *      instead and the slide is left completely untouched, still
 *      pointing at its original (still-intact) image -- no partial edit
 *      ever gets left half-applied.
 */
export async function updateHeroSlide(
  supabase: SupabaseClient,
  id: string,
  formData: FormData
): Promise<HeroSlideActionState> {
  const { fieldErrors, values } = validateText(formData);
  const { error: fileError, file } = validateFile(formData.get("file"), {
    required: false,
  });

  if (fileError) fieldErrors.file = fileError;

  if (!values || fileError) {
    return {
      status: "error",
      message: "Please fix the highlighted fields.",
      fieldErrors,
    };
  }

  if (!file) {
    // No new image -- just update the text/sort/active fields, storage
    // untouched entirely.
    const { error } = await supabase
      .from("hero_slides")
      .update(values)
      .eq("id", id);

    if (error) {
      return {
        status: "error",
        message: "Something went wrong saving the slide. Please try again.",
      };
    }
    return { status: "success" };
  }

  const { data: existing, error: fetchError } = await supabase
    .from("hero_slides")
    .select("storage_path")
    .eq("id", id)
    .maybeSingle();

  if (fetchError || !existing) {
    return { status: "error", message: "This slide no longer exists." };
  }

  const extension = EXTENSION_BY_MIME_TYPE[file.type];
  const newPath = `${crypto.randomUUID()}.${extension}`;

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(newPath, file, { contentType: file.type, upsert: false });

  if (uploadError) {
    return {
      status: "error",
      message: "Something went wrong uploading the new image. Please try again.",
    };
  }

  const { error: updateError } = await supabase
    .from("hero_slides")
    .update({ ...values, storage_path: newPath })
    .eq("id", id);

  if (updateError) {
    // DB row still points at the OLD (still-intact) image -- clean up
    // only the newly-uploaded, now-orphaned file. The slide is left
    // exactly as it was before this call.
    await supabase.storage.from(BUCKET).remove([newPath]);
    return {
      status: "error",
      message: "Something went wrong saving the slide. Please try again.",
    };
  }

  // New image is confirmed live in the DB -- now safe to remove the old
  // one. Best-effort: logged, not fatal, same reasoning as
  // lib/admin/product-images.ts's deleteProductImage.
  const { error: cleanupError } = await supabase.storage
    .from(BUCKET)
    .remove([existing.storage_path]);

  if (cleanupError) {
    console.warn(
      `[hero-slides] Old Storage object cleanup failed for "${existing.storage_path}" after replacing slide ${id}'s image. File is now orphaned in the bucket.`,
      cleanupError
    );
  }

  return { status: "success" };
}

/**
 * Delete -- both the DB row AND the actual Storage object, built
 * correctly from the start (Prompt 34's fix pattern, no pre-existing gap
 * to close here since no real slides existed before this prompt). Same
 * ordering as deleteProductImage: DB row first, Storage cleanup after --
 * a failed cleanup leaves a harmless orphaned file rather than a broken
 * live reference from a delete that only half-completed.
 */
export async function deleteHeroSlide(
  supabase: SupabaseClient,
  id: string
): Promise<HeroSlideActionState> {
  const { data: slide, error: fetchError } = await supabase
    .from("hero_slides")
    .select("storage_path")
    .eq("id", id)
    .maybeSingle();

  if (fetchError || !slide) {
    return { status: "error", message: "This slide no longer exists." };
  }

  const { error: deleteError } = await supabase
    .from("hero_slides")
    .delete()
    .eq("id", id);

  if (deleteError) {
    return {
      status: "error",
      message: "Something went wrong deleting the slide. Please try again.",
    };
  }

  const { error: storageError } = await supabase.storage
    .from(BUCKET)
    .remove([slide.storage_path]);

  if (storageError) {
    console.warn(
      `[hero-slides] Storage object cleanup failed for "${slide.storage_path}" after deleting hero_slides row ${id}. File is now orphaned in the bucket.`,
      storageError
    );
  }

  return { status: "success" };
}
