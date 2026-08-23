import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { trimmedOrNull } from "@/lib/form-utils";
import type {
  AdminHomeVideoRow,
  HomeVideoActionState,
  HomeVideoFieldErrors,
} from "@/types/admin-home-video";

// Same plain-function-taking-a-client split as lib/admin/hero-slides.ts
// (Prompt 35) -- see categories.ts's own comment for the full reasoning.
// Home videos are the genuinely more complex case of the three media
// sections built so far: TWO independent Storage-backed fields per row
// (the video itself, optionally a thumbnail), and the video field is
// itself a choice between two mutually exclusive sources (upload vs.
// external_url) -- home_videos_has_a_source (0013 migration) is the DB's
// own backstop for "at least one," but this form drives the admin toward
// picking exactly one clearly, via a source_type radio the validation
// logic below branches on.

const BUCKET = "home-videos";

// Must match the bucket's real config (0013 + 0021 migrations):
// file_size_limit = 20MB applies to everything in this bucket (video AND
// thumbnail alike -- no separate per-mime-type limit exists at the
// Storage layer), allowed_mime_types after 0021 = the two video types
// below PLUS the three image types for thumbnails.
const MAX_VIDEO_SIZE_BYTES = 20 * 1024 * 1024;
const VIDEO_EXTENSION_BY_MIME_TYPE: Record<string, string> = {
  "video/mp4": "mp4",
  "video/webm": "webm",
};

const MAX_THUMBNAIL_SIZE_BYTES = 5 * 1024 * 1024;
const IMAGE_EXTENSION_BY_MIME_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

type HomeVideoTextInput = {
  caption_en: string | null;
  caption_ar: string | null;
  sort_order: number;
  is_active: boolean;
};

function validateText(formData: FormData): {
  fieldErrors: HomeVideoFieldErrors;
  values: HomeVideoTextInput | null;
} {
  const caption_en = trimmedOrNull(formData.get("caption_en"));
  const caption_ar = trimmedOrNull(formData.get("caption_ar"));
  const sortOrderRaw = formData.get("sort_order");
  const is_active = formData.get("is_active") === "on";

  const fieldErrors: HomeVideoFieldErrors = {};

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
    values: { caption_en, caption_ar, sort_order, is_active },
  };
}

function validateVideoFile(
  entry: FormDataEntryValue | null,
  { required }: { required: boolean }
): { error: string | null; file: File | null } {
  const provided = entry instanceof File && entry.size > 0;
  if (!provided) {
    return required
      ? { error: "Choose a video file.", file: null }
      : { error: null, file: null };
  }
  const file = entry as File;
  const extension = VIDEO_EXTENSION_BY_MIME_TYPE[file.type];
  if (!extension) {
    return { error: "Only MP4 or WEBM videos are allowed.", file: null };
  }
  if (file.size > MAX_VIDEO_SIZE_BYTES) {
    return { error: "Must be 20MB or smaller.", file: null };
  }
  return { error: null, file };
}

function validateThumbnailFile(
  entry: FormDataEntryValue | null
): { error: string | null; file: File | null } {
  const provided = entry instanceof File && entry.size > 0;
  if (!provided) return { error: null, file: null };
  const file = entry as File;
  const extension = IMAGE_EXTENSION_BY_MIME_TYPE[file.type];
  if (!extension) {
    return {
      error: "Only JPEG, PNG, or WEBP images are allowed.",
      file: null,
    };
  }
  if (file.size > MAX_THUMBNAIL_SIZE_BYTES) {
    return { error: "Must be 5MB or smaller.", file: null };
  }
  return { error: null, file };
}

async function uploadVideo(supabase: SupabaseClient, file: File) {
  const path = `videos/${crypto.randomUUID()}.${VIDEO_EXTENSION_BY_MIME_TYPE[file.type]}`;
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { contentType: file.type, upsert: false });
  return { path, error };
}

async function uploadThumbnail(supabase: SupabaseClient, file: File) {
  const path = `thumbnails/${crypto.randomUUID()}.${IMAGE_EXTENSION_BY_MIME_TYPE[file.type]}`;
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { contentType: file.type, upsert: false });
  return { path, error };
}

async function removeObjects(supabase: SupabaseClient, paths: string[]) {
  if (paths.length === 0) return;
  await supabase.storage.from(BUCKET).remove(paths);
}

export async function getHomeVideos(
  supabase: SupabaseClient
): Promise<AdminHomeVideoRow[]> {
  const { data, error } = await supabase
    .from("home_videos")
    .select(
      "id, storage_path, external_url, thumbnail_storage_path, caption_en, caption_ar, sort_order, is_active, created_at"
    )
    .order("sort_order", { ascending: true });

  return error || !data ? [] : data;
}

/**
 * Create -- source_type ("upload" | "external") drives which of
 * file/external_url is validated as required; the other is simply never
 * looked at, keeping the two mutually exclusive by construction rather
 * than by post-hoc cleanup. Thumbnail is independently optional
 * regardless of source_type. Same upload-then-insert ordering as every
 * other Storage-backed create in this project: if the DB insert fails
 * after either upload succeeded, both are cleaned up immediately.
 */
export async function createHomeVideo(
  supabase: SupabaseClient,
  formData: FormData
): Promise<HomeVideoActionState> {
  const { fieldErrors, values } = validateText(formData);
  const sourceType = formData.get("source_type");

  let storage_path: string | null = null;
  let external_url: string | null = null;
  const uploadedPaths: string[] = [];

  if (sourceType === "upload") {
    const { error: fileError, file } = validateVideoFile(formData.get("file"), {
      required: true,
    });
    if (fileError) {
      fieldErrors.file = fileError;
    } else if (file) {
      const { path, error } = await uploadVideo(supabase, file);
      if (error) {
        return {
          status: "error",
          message: "Something went wrong uploading the video. Please try again.",
        };
      }
      storage_path = path;
      uploadedPaths.push(path);
    }
  } else if (sourceType === "external") {
    const url = trimmedOrNull(formData.get("external_url"));
    if (!url) {
      fieldErrors.external_url = "Enter a video URL.";
    } else {
      external_url = url;
    }
  } else {
    fieldErrors.file = "Choose a video source.";
  }

  const { error: thumbError, file: thumbFile } = validateThumbnailFile(
    formData.get("thumbnail")
  );
  if (thumbError) fieldErrors.thumbnail = thumbError;

  let thumbnail_storage_path: string | null = null;
  if (!thumbError && thumbFile) {
    const { path, error } = await uploadThumbnail(supabase, thumbFile);
    if (error) {
      await removeObjects(supabase, uploadedPaths);
      return {
        status: "error",
        message: "Something went wrong uploading the thumbnail. Please try again.",
      };
    }
    thumbnail_storage_path = path;
    uploadedPaths.push(path);
  }

  if (!values || Object.keys(fieldErrors).length > 0) {
    await removeObjects(supabase, uploadedPaths);
    return {
      status: "error",
      message: "Please fix the highlighted fields.",
      fieldErrors,
    };
  }

  const { error: insertError } = await supabase.from("home_videos").insert({
    ...values,
    storage_path,
    external_url,
    thumbnail_storage_path,
  });

  if (insertError) {
    await removeObjects(supabase, uploadedPaths);
    return {
      status: "error",
      message: "Something went wrong saving the video. Please try again.",
    };
  }

  return { status: "success" };
}

/**
 * Update -- the interesting case is switching source types (e.g. an
 * uploaded video replaced by an external URL, or vice versa), not just
 * replacing a file with another file. Rule used throughout: compute what
 * the FINAL storage_path/thumbnail_storage_path end up being after this
 * update, and if the row's OLD value differs from that final value (and
 * was non-null), clean up the old Storage object -- this one rule
 * correctly covers "replaced with a new upload," "switched from upload to
 * external," and "left untouched" (where old === final, nothing to clean
 * up) without special-casing each one separately.
 *
 * Same ordering discipline as lib/admin/hero-slides.ts's updateHeroSlide:
 * new uploads happen first, the DB update happens second (and rolls back
 * any newly-uploaded orphans if it fails, leaving the row completely
 * untouched), and only after the DB update is confirmed does cleanup of
 * now-superseded old objects happen -- never the reverse order.
 */
export async function updateHomeVideo(
  supabase: SupabaseClient,
  id: string,
  formData: FormData
): Promise<HomeVideoActionState> {
  const { fieldErrors, values } = validateText(formData);
  const sourceType = formData.get("source_type");
  const removeThumbnail = formData.get("remove_thumbnail") === "on";

  const { data: existing, error: fetchError } = await supabase
    .from("home_videos")
    .select("storage_path, external_url, thumbnail_storage_path")
    .eq("id", id)
    .maybeSingle();

  if (fetchError || !existing) {
    return { status: "error", message: "This video no longer exists." };
  }

  let finalStoragePath: string | null = existing.storage_path;
  let finalExternalUrl: string | null = existing.external_url;
  const newlyUploadedPaths: string[] = [];

  if (sourceType === "upload") {
    // Required only if there's no existing uploaded file to fall back on
    // -- i.e. this row is switching FROM external (or is somehow sourceless).
    const { error: fileError, file } = validateVideoFile(formData.get("file"), {
      required: !existing.storage_path,
    });
    if (fileError) {
      fieldErrors.file = fileError;
    } else if (file) {
      const { path, error } = await uploadVideo(supabase, file);
      if (error) {
        return {
          status: "error",
          message: "Something went wrong uploading the video. Please try again.",
        };
      }
      finalStoragePath = path;
      newlyUploadedPaths.push(path);
    }
    // else: staying on upload, no new file -- finalStoragePath stays
    // existing.storage_path (already assigned above).
    finalExternalUrl = null;
  } else if (sourceType === "external") {
    const url = trimmedOrNull(formData.get("external_url"));
    if (!url) {
      fieldErrors.external_url = "Enter a video URL.";
    } else {
      finalExternalUrl = url;
    }
    finalStoragePath = null;
  } else {
    fieldErrors.file = "Choose a video source.";
  }

  const { error: thumbError, file: thumbFile } = validateThumbnailFile(
    formData.get("thumbnail")
  );
  if (thumbError) fieldErrors.thumbnail = thumbError;

  let finalThumbnailPath: string | null = existing.thumbnail_storage_path;
  if (!thumbError && thumbFile) {
    const { path, error } = await uploadThumbnail(supabase, thumbFile);
    if (error) {
      await removeObjects(supabase, newlyUploadedPaths);
      return {
        status: "error",
        message: "Something went wrong uploading the thumbnail. Please try again.",
      };
    }
    finalThumbnailPath = path;
    newlyUploadedPaths.push(path);
  } else if (!thumbError && removeThumbnail) {
    finalThumbnailPath = null;
  }

  if (!values || Object.keys(fieldErrors).length > 0) {
    await removeObjects(supabase, newlyUploadedPaths);
    return {
      status: "error",
      message: "Please fix the highlighted fields.",
      fieldErrors,
    };
  }

  const { error: updateError } = await supabase
    .from("home_videos")
    .update({
      ...values,
      storage_path: finalStoragePath,
      external_url: finalExternalUrl,
      thumbnail_storage_path: finalThumbnailPath,
    })
    .eq("id", id);

  if (updateError) {
    // Row untouched -- clean up only whatever was newly uploaded in THIS
    // call, leaving the existing (still-referenced) objects alone.
    await removeObjects(supabase, newlyUploadedPaths);
    return {
      status: "error",
      message: "Something went wrong saving the video. Please try again.",
    };
  }

  // Update confirmed live -- now safe to remove whatever the OLD row
  // referenced that the new one doesn't. Best-effort: logged, not fatal,
  // same reasoning as every other Storage cleanup in this project.
  const toCleanUp: string[] = [];
  if (existing.storage_path && existing.storage_path !== finalStoragePath) {
    toCleanUp.push(existing.storage_path);
  }
  if (
    existing.thumbnail_storage_path &&
    existing.thumbnail_storage_path !== finalThumbnailPath
  ) {
    toCleanUp.push(existing.thumbnail_storage_path);
  }
  if (toCleanUp.length > 0) {
    const { error: cleanupError } = await supabase.storage
      .from(BUCKET)
      .remove(toCleanUp);
    if (cleanupError) {
      console.warn(
        `[home-videos] Old Storage object cleanup failed for [${toCleanUp.join(", ")}] after updating video ${id}. File(s) now orphaned in the bucket.`,
        cleanupError
      );
    }
  }

  return { status: "success" };
}

/**
 * Delete -- both the DB row and every associated Storage object: the
 * video file if this row used an upload (nothing to remove if it used
 * external_url instead -- branches on storage_path being non-null rather
 * than assuming every row has a Storage-backed video), AND the thumbnail
 * if one was set, independent of which video source was used. Same DB-
 * row-first, Storage-cleanup-after ordering as every other delete in this
 * project.
 */
export async function deleteHomeVideo(
  supabase: SupabaseClient,
  id: string
): Promise<HomeVideoActionState> {
  const { data: video, error: fetchError } = await supabase
    .from("home_videos")
    .select("storage_path, thumbnail_storage_path")
    .eq("id", id)
    .maybeSingle();

  if (fetchError || !video) {
    return { status: "error", message: "This video no longer exists." };
  }

  const { error: deleteError } = await supabase
    .from("home_videos")
    .delete()
    .eq("id", id);

  if (deleteError) {
    return {
      status: "error",
      message: "Something went wrong deleting the video. Please try again.",
    };
  }

  // Branch on what actually has a Storage object -- an external_url row
  // has storage_path = null, nothing to remove for the video itself.
  const toRemove: string[] = [];
  if (video.storage_path) toRemove.push(video.storage_path);
  if (video.thumbnail_storage_path) toRemove.push(video.thumbnail_storage_path);

  if (toRemove.length > 0) {
    const { error: storageError } = await supabase.storage
      .from(BUCKET)
      .remove(toRemove);
    if (storageError) {
      console.warn(
        `[home-videos] Storage object cleanup failed for [${toRemove.join(", ")}] after deleting home_videos row ${id}. File(s) now orphaned in the bucket.`,
        storageError
      );
    }
  }

  return { status: "success" };
}
