import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  PRIVATE_LABEL_IMAGE_SLOTS,
  type AdminPrivateLabelImageRow,
  type PrivateLabelImageActionState,
  type PrivateLabelImageSlot,
} from "@/types/admin-private-label";

// Same plain-function-taking-a-client split as every other lib/admin/*.ts
// file -- see lib/admin/categories.ts's own comment for the full
// reasoning.

const BUCKET = "private-label-images";

// Same limits as every other image-upload bucket in this project (0012
// migration's hero-images/product-images, 0028's own private-label-images)
// -- re-checked here for a clear message, same "constraints are the
// backstop, not the only check" reasoning as lib/admin/product-images.ts.
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;
const EXTENSION_BY_MIME_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

function isValidSlot(value: string): value is PrivateLabelImageSlot {
  return (PRIVATE_LABEL_IMAGE_SLOTS as readonly string[]).includes(value);
}

function validateFile(
  file: FormDataEntryValue | null
): { error: string | null; file: File | null } {
  const provided = file instanceof File && file.size > 0;
  if (!provided) {
    return { error: "Choose an image.", file: null };
  }

  const validFile = file as File;
  const extension = EXTENSION_BY_MIME_TYPE[validFile.type];
  if (!extension) {
    return { error: "Only JPEG, PNG, or WEBP images are allowed.", file: null };
  }
  if (validFile.size > MAX_FILE_SIZE_BYTES) {
    return { error: "Must be 5MB or smaller.", file: null };
  }

  return { error: null, file: validFile };
}

/** All 7 slots, including any not-yet-uploaded (storage_path: null) --
 *  the admin page always shows every slot, never a partial list, so
 *  there's no active-only/sort_order filtering the way a real list
 *  admin page needs. */
export async function getPrivateLabelImages(
  supabase: SupabaseClient
): Promise<AdminPrivateLabelImageRow[]> {
  const { data, error } = await supabase
    .from("private_label_images")
    .select("slot, storage_path");

  return error || !data ? [] : (data as AdminPrivateLabelImageRow[]);
}

/**
 * Replace one slot's image. Same ordering as hero-slides.ts's
 * updateHeroSlide: upload the NEW file to a fresh path first, update the
 * DB row second, and only delete the OLD Storage object after that
 * update is confirmed -- never the reverse, which could leave a live
 * slot pointing at an already-deleted file if the DB write then failed.
 * A slot with no prior image (oldPath null) just skips that last step.
 */
export async function updatePrivateLabelImage(
  supabase: SupabaseClient,
  slot: string,
  formData: FormData
): Promise<PrivateLabelImageActionState> {
  if (!isValidSlot(slot)) {
    return { status: "error", message: "Unknown image slot." };
  }

  const { error: fileError, file } = validateFile(formData.get("file"));
  if (fileError || !file) {
    return { status: "error", message: fileError ?? "Choose an image." };
  }

  const { data: existing } = await supabase
    .from("private_label_images")
    .select("storage_path")
    .eq("slot", slot)
    .maybeSingle();
  const oldPath: string | null = existing?.storage_path ?? null;

  const extension = EXTENSION_BY_MIME_TYPE[file.type];
  const path = `${slot}-${crypto.randomUUID()}.${extension}`;

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { contentType: file.type, upsert: false });

  if (uploadError) {
    return {
      status: "error",
      message: "Something went wrong uploading the image. Please try again.",
    };
  }

  const { error: updateError } = await supabase
    .from("private_label_images")
    .update({ storage_path: path })
    .eq("slot", slot);

  if (updateError) {
    await supabase.storage.from(BUCKET).remove([path]);
    return {
      status: "error",
      message: "Something went wrong saving the image. Please try again.",
    };
  }

  if (oldPath) {
    await supabase.storage.from(BUCKET).remove([oldPath]);
  }

  return { status: "success" };
}
