import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { trimmedOrNull } from "@/lib/form-utils";
import { removeStorageValues } from "@/lib/blob";
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
//
// Direct-to-Blob client uploads (fix for the ~4.5MB Vercel serverless
// request body limit, diagnosed in a prior prompt): the video and
// thumbnail FILES no longer pass through this Server Action's body at
// all. HomeVideoForm.tsx uploads them straight to Vercel Blob itself via
// `upload()` from "@vercel/blob/client", authorized by
// app/admin/api/blob-upload/route.ts's token endpoint (which also
// enforces the real size/content-type limits -- 12MB video, 5MB
// thumbnail -- server-side, before Blob accepts a single byte). This
// Server Action now only ever receives the resulting Blob URL (a short
// string) in `file_url` / `thumbnail_url` fields, which is validated
// below to actually be one of OUR Blob URLs under the expected pathname
// prefix -- a client could otherwise submit an arbitrary string here
// directly, bypassing the token route's own checks entirely, since this
// Server Action has no way to know whether a given URL string really came
// from a successful handleUpload() call.
const BUCKET = "home-videos";

const BLOB_VIDEO_URL_PATTERN =
  /^https:\/\/[a-z0-9]+\.public\.blob\.vercel-storage\.com\/home-videos\/videos\/[^/]+$/;
const BLOB_THUMBNAIL_URL_PATTERN =
  /^https:\/\/[a-z0-9]+\.public\.blob\.vercel-storage\.com\/home-videos\/thumbnails\/[^/]+$/;

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

// The FILE itself was already uploaded client-side straight to Blob
// (HomeVideoForm.tsx, via app/admin/api/blob-upload/route.ts's token) --
// this Server Action only ever sees the resulting URL string. Re-validate
// it's actually one of OUR Blob URLs under the expected pathname prefix
// (not just "looks like a URL") -- the real size/content-type
// enforcement already happened at token-issue time, this is specifically
// guarding against a client submitting an arbitrary string directly to
// this action, bypassing the upload step entirely.
function validateVideoUrl(
  entry: FormDataEntryValue | null,
  { required }: { required: boolean }
): { error: string | null; url: string | null } {
  const url = typeof entry === "string" ? entry.trim() : "";
  if (!url) {
    return required
      ? { error: "Choose a video file.", url: null }
      : { error: null, url: null };
  }
  if (!BLOB_VIDEO_URL_PATTERN.test(url)) {
    return { error: "Invalid video upload -- please try again.", url: null };
  }
  return { error: null, url };
}

function validateThumbnailUrl(
  entry: FormDataEntryValue | null
): { error: string | null; url: string | null } {
  const url = typeof entry === "string" ? entry.trim() : "";
  if (!url) return { error: null, url: null };
  if (!BLOB_THUMBNAIL_URL_PATTERN.test(url)) {
    return { error: "Invalid thumbnail upload -- please try again.", url: null };
  }
  return { error: null, url };
}

async function removeObjects(supabase: SupabaseClient, paths: string[]) {
  if (paths.length === 0) return;
  await removeStorageValues(supabase, BUCKET, paths);
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
  // Both files (if present) are ALREADY uploaded to Blob by the time this
  // action runs -- HomeVideoForm.tsx does the direct-to-Blob upload
  // client-side before submitting, see this file's own top comment. This
  // list is only for cleanup if something ELSE about the submission is
  // invalid, so a rejected submission doesn't leave an orphaned Blob
  // object behind.
  const uploadedPaths: string[] = [];

  if (sourceType === "upload") {
    const { error: urlError, url } = validateVideoUrl(formData.get("file_url"), {
      required: true,
    });
    if (urlError) {
      fieldErrors.file = urlError;
    } else if (url) {
      storage_path = url;
      uploadedPaths.push(url);
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

  const { error: thumbError, url: thumbnailUrl } = validateThumbnailUrl(
    formData.get("thumbnail_url")
  );
  if (thumbError) fieldErrors.thumbnail = thumbError;

  const thumbnail_storage_path = thumbnailUrl;
  if (thumbnailUrl) uploadedPaths.push(thumbnailUrl);

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
    // The file (if any) is already uploaded to Blob client-side by this
    // point -- see this file's own top comment -- so this is just
    // re-validating the resulting URL's shape.
    const { error: urlError, url } = validateVideoUrl(formData.get("file_url"), {
      required: !existing.storage_path,
    });
    if (urlError) {
      fieldErrors.file = urlError;
    } else if (url) {
      finalStoragePath = url;
      newlyUploadedPaths.push(url);
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

  const { error: thumbError, url: thumbnailUrl } = validateThumbnailUrl(
    formData.get("thumbnail_url")
  );
  if (thumbError) fieldErrors.thumbnail = thumbError;

  let finalThumbnailPath: string | null = existing.thumbnail_storage_path;
  if (!thumbError && thumbnailUrl) {
    finalThumbnailPath = thumbnailUrl;
    newlyUploadedPaths.push(thumbnailUrl);
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
    try {
      await removeStorageValues(supabase, BUCKET, toCleanUp);
    } catch (cleanupError) {
      console.warn(
        `[home-videos] Old Storage object cleanup failed for [${toCleanUp.join(", ")}] after updating video ${id}. File(s) now orphaned.`,
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
    try {
      await removeStorageValues(supabase, BUCKET, toRemove);
    } catch (storageError) {
      console.warn(
        `[home-videos] Storage object cleanup failed for [${toRemove.join(", ")}] after deleting home_videos row ${id}. File(s) now orphaned.`,
        storageError
      );
    }
  }

  return { status: "success" };
}
