"use client";

import { useActionState, useRef, useState } from "react";
import Link from "next/link";
import { upload } from "@vercel/blob/client";
import {
  createHomeVideoAction,
  updateHomeVideoAction,
} from "@/app/admin/(dashboard)/home-videos/actions";
import { getPublicStorageUrl } from "@/lib/supabase/storage";
import { compressImage } from "@/lib/image-compression";
import FormField from "./FormField";
import {
  HOME_VIDEO_ACTION_INITIAL_STATE,
  type AdminHomeVideoRow,
} from "@/types/admin-home-video";

// Real, enforced limits (app/admin/api/blob-upload/route.ts's own
// onBeforeGenerateToken re-checks both of these server-side via Blob's
// signed token -- these are client-side only for immediate UX feedback,
// same "advisory, not authoritative" relationship every other client-side
// check in this project has to its server-side counterpart.
//
// 12MB video (not 20MB) -- lowered from the old limit as part of the fix
// for the ~4.5MB Vercel serverless request-body ceiling that silently hung
// every upload above it (diagnosed in a prior prompt). That ceiling no
// longer applies here at all -- the file now goes straight from this
// browser to Vercel Blob, never through a Server Action body -- but 12MB
// is still a deliberate, real cap: short homepage carousel clips (a few
// seconds, per the admin's own guidance below) have no real reason to be
// bigger, and a hard ceiling bounds both Blob storage cost and how long an
// admin waits on a mobile connection.
const MAX_VIDEO_SIZE_BYTES = 12 * 1024 * 1024;
const ACCEPTED_VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime"];
const MAX_THUMBNAIL_SIZE_BYTES = 5 * 1024 * 1024;
const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

const VIDEO_EXTENSION_BY_MIME_TYPE: Record<string, string> = {
  "video/mp4": "mp4",
  "video/webm": "webm",
  "video/quicktime": "mov",
};
const IMAGE_EXTENSION_BY_MIME_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

type SourceType = "upload" | "external";

type UploadState = {
  status: "idle" | "uploading" | "done" | "error";
  progress: number;
  url: string | null;
  error: string | null;
  fileName: string | null;
};

const IDLE_UPLOAD: UploadState = {
  status: "idle",
  progress: 0,
  url: null,
  error: null,
  fileName: null,
};

/**
 * Upload vs. external URL -- mutually exclusive by construction, not by
 * post-hoc validation: a radio pair drives which single input the admin
 * actually sees and fills in (source_type is submitted alongside it so
 * lib/admin/home-videos.ts knows which one to treat as authoritative,
 * regardless of what stray value might be sitting in the other, hidden
 * field). home_videos_has_a_source (0013 migration) is still the DB's own
 * backstop for "at least one," but this UI never lets the admin end up in
 * an ambiguous both-or-neither state to begin with.
 *
 * Direct-to-Blob client uploads: both the video file and the thumbnail
 * are uploaded straight from this browser to Vercel Blob (via `upload()`
 * from "@vercel/blob/client", authorized by
 * app/admin/api/blob-upload/route.ts) the moment they're selected --
 * never as part of the Server Action's own request body. This is the fix
 * for the ~4.5MB Vercel serverless body-size ceiling that silently hung
 * the old file-in-FormData upload for any realistically-sized video (see
 * that prompt's diagnosis: a 0.38MB file succeeded, a 5.28MB one hung
 * forever with zero server response). The thumbnail gets the same
 * treatment even though its own 5MB limit is only marginally above that
 * ceiling -- not worth leaving a second, narrower version of the exact
 * same bug in place.
 */
export default function HomeVideoForm({
  mode,
  video,
}: {
  mode: "create" | "edit";
  video?: AdminHomeVideoRow;
}) {
  const action =
    mode === "create"
      ? createHomeVideoAction
      : updateHomeVideoAction.bind(null, video!.id);

  const [state, formAction, isPending] = useActionState(
    action,
    HOME_VIDEO_ACTION_INITIAL_STATE
  );

  const [sourceType, setSourceType] = useState<SourceType>(
    video?.external_url && !video.storage_path ? "external" : "upload"
  );
  const [removeThumbnail, setRemoveThumbnail] = useState(false);
  const [videoUpload, setVideoUpload] = useState<UploadState>(IDLE_UPLOAD);
  const [thumbUpload, setThumbUpload] = useState<UploadState>(IDLE_UPLOAD);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const thumbInputRef = useRef<HTMLInputElement>(null);

  const fieldErrors = state.status === "error" ? state.fieldErrors : undefined;

  async function handleVideoFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) {
      setVideoUpload(IDLE_UPLOAD);
      return;
    }
    if (!ACCEPTED_VIDEO_TYPES.includes(file.type)) {
      setVideoUpload({
        ...IDLE_UPLOAD,
        status: "error",
        error: "Only MP4, WEBM, or QuickTime (MOV) videos are allowed.",
      });
      e.target.value = "";
      return;
    }
    if (file.size > MAX_VIDEO_SIZE_BYTES) {
      setVideoUpload({
        ...IDLE_UPLOAD,
        status: "error",
        error: `"${file.name}" is ${(file.size / (1024 * 1024)).toFixed(1)}MB -- the limit is 12MB. Try a shorter clip.`,
      });
      e.target.value = "";
      return;
    }

    setVideoUpload({ status: "uploading", progress: 0, url: null, error: null, fileName: file.name });

    const extension = VIDEO_EXTENSION_BY_MIME_TYPE[file.type];
    const pathname = `home-videos/videos/${crypto.randomUUID()}.${extension}`;

    try {
      const result = await upload(pathname, file, {
        access: "public",
        handleUploadUrl: "/admin/api/blob-upload",
        contentType: file.type,
        onUploadProgress: ({ percentage }) => {
          setVideoUpload((prev) => ({ ...prev, progress: percentage }));
        },
      });
      setVideoUpload({
        status: "done",
        progress: 100,
        url: result.url,
        error: null,
        fileName: file.name,
      });
    } catch (error) {
      setVideoUpload({
        status: "error",
        progress: 0,
        url: null,
        error:
          error instanceof Error
            ? `Upload failed: ${error.message}`
            : "Upload failed. Please try again.",
        fileName: file.name,
      });
      if (videoInputRef.current) videoInputRef.current.value = "";
    }
  }

  async function handleThumbnailFileChange(
    e: React.ChangeEvent<HTMLInputElement>
  ) {
    const input = e.target;
    const file = input.files?.[0];
    if (!file) {
      setThumbUpload(IDLE_UPLOAD);
      return;
    }
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      setThumbUpload({
        ...IDLE_UPLOAD,
        status: "error",
        error: "Only JPEG, PNG, or WEBP images are allowed.",
      });
      input.value = "";
      return;
    }
    if (removeThumbnail) setRemoveThumbnail(false);

    // Compression (Prompt 82) still happens first, same as before -- this
    // just changes what happens to the compressed RESULT (uploaded
    // directly to Blob here, instead of attached to the Server Action's
    // own FormData).
    setThumbUpload({ status: "uploading", progress: 0, url: null, error: null, fileName: file.name });
    let effectiveFile: File = file;
    try {
      effectiveFile = await compressImage(file);
    } catch {
      // best-effort, same as the original -- fall through with the
      // uncompressed file rather than blocking the upload on it.
    }

    if (effectiveFile.size > MAX_THUMBNAIL_SIZE_BYTES) {
      setThumbUpload({
        status: "error",
        progress: 0,
        url: null,
        error: `"${file.name}" is still ${(effectiveFile.size / (1024 * 1024)).toFixed(1)}MB after compression -- the limit is 5MB.`,
        fileName: file.name,
      });
      input.value = "";
      return;
    }

    const extension = IMAGE_EXTENSION_BY_MIME_TYPE[effectiveFile.type] ?? "jpg";
    const pathname = `home-videos/thumbnails/${crypto.randomUUID()}.${extension}`;

    try {
      const result = await upload(pathname, effectiveFile, {
        access: "public",
        handleUploadUrl: "/admin/api/blob-upload",
        contentType: effectiveFile.type,
        onUploadProgress: ({ percentage }) => {
          setThumbUpload((prev) => ({ ...prev, progress: percentage }));
        },
      });
      setThumbUpload({
        status: "done",
        progress: 100,
        url: result.url,
        error: null,
        fileName: file.name,
      });
    } catch (error) {
      setThumbUpload({
        status: "error",
        progress: 0,
        url: null,
        error:
          error instanceof Error
            ? `Upload failed: ${error.message}`
            : "Upload failed. Please try again.",
        fileName: file.name,
      });
      if (thumbInputRef.current) thumbInputRef.current.value = "";
    }
  }

  const videoStillUploading = sourceType === "upload" && videoUpload.status === "uploading";
  const thumbStillUploading = thumbUpload.status === "uploading";
  // A NEW video is required on create; on edit it's only required if this
  // row has no existing uploaded file to fall back on (matches
  // updateHomeVideo's own `required: !existing.storage_path`).
  const videoRequiredButMissing =
    sourceType === "upload" &&
    videoUpload.status !== "done" &&
    (mode === "create" || !video?.storage_path);
  const submitDisabled =
    isPending || videoStillUploading || thumbStillUploading || videoRequiredButMissing;

  return (
    <form action={formAction} className="max-w-2xl space-y-8">
      {state.status === "error" ? (
        <div
          role="alert"
          className="rounded-btn border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {state.message}
        </div>
      ) : null}

      <section className="space-y-3">
        <p className="text-sm font-medium text-brand-black">Video Source *</p>
        <div className="flex gap-5">
          <label className="flex items-center gap-2 text-sm text-brand-black">
            <input
              type="radio"
              name="source_type"
              value="upload"
              checked={sourceType === "upload"}
              onChange={() => setSourceType("upload")}
              className="h-4 w-4 border-brand-border"
            />
            Upload a file
          </label>
          <label className="flex items-center gap-2 text-sm text-brand-black">
            <input
              type="radio"
              name="source_type"
              value="external"
              checked={sourceType === "external"}
              onChange={() => setSourceType("external")}
              className="h-4 w-4 border-brand-border"
            />
            External URL
          </label>
        </div>

        {sourceType === "upload" ? (
          <div>
            <label htmlFor="file" className="sr-only">
              Video file
            </label>
            <input
              ref={videoInputRef}
              id="file"
              type="file"
              accept="video/mp4,video/webm,video/quicktime"
              onChange={handleVideoFileChange}
              disabled={videoUpload.status === "uploading"}
              aria-invalid={Boolean(videoUpload.error || fieldErrors?.file)}
              className="block w-full text-sm text-brand-black file:me-3 file:rounded-btn file:border file:border-brand-border file:bg-brand-white file:px-3 file:py-1.5 file:text-sm file:text-brand-black hover:file:border-brand-black disabled:cursor-not-allowed disabled:opacity-60"
            />
            {/* Carries the already-uploaded Blob URL, not the file itself
                -- see this component's own top comment. */}
            <input type="hidden" name="file_url" value={videoUpload.url ?? ""} />
            <p className="mt-1 text-xs text-brand-gray">
              {mode === "edit" && video?.storage_path
                ? "Leave empty to keep the current video. MP4, WEBM, or MOV, up to 12MB -- short clips (a few seconds) work best."
                : "MP4, WEBM, or MOV, up to 12MB -- short clips (a few seconds) work best."}
            </p>

            {videoUpload.status === "uploading" ? (
              <div className="mt-2">
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-brand-border">
                  <div
                    className="h-full rounded-full bg-brand-black transition-all"
                    style={{ width: `${videoUpload.progress}%` }}
                  />
                </div>
                <p className="mt-1 text-xs text-brand-gray">
                  Uploading {videoUpload.fileName}… {Math.round(videoUpload.progress)}%
                </p>
              </div>
            ) : null}
            {videoUpload.status === "done" ? (
              <p className="mt-1 text-xs text-green-700">
                ✓ {videoUpload.fileName} uploaded.
              </p>
            ) : null}
            {videoUpload.error || fieldErrors?.file ? (
              <p role="alert" className="mt-1 text-xs text-red-600">
                {videoUpload.error ?? fieldErrors?.file}
              </p>
            ) : null}
          </div>
        ) : (
          <div>
            <label htmlFor="external_url" className="sr-only">
              External video URL
            </label>
            <input
              id="external_url"
              name="external_url"
              type="url"
              defaultValue={video?.external_url ?? ""}
              placeholder="https://..."
              aria-invalid={Boolean(fieldErrors?.external_url)}
              className={
                "w-full rounded-btn border bg-brand-white px-3 py-2.5 text-sm text-brand-black " +
                (fieldErrors?.external_url
                  ? "border-red-400"
                  : "border-brand-border")
              }
            />
            {fieldErrors?.external_url ? (
              <p className="mt-1 text-xs text-red-600">
                {fieldErrors.external_url}
              </p>
            ) : null}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <label
          htmlFor="thumbnail"
          className="block text-sm font-medium text-brand-black"
        >
          Thumbnail (poster image)
        </label>
        <p className="text-xs text-brand-gray">
          Optional. Shown before an uploaded video starts playing, and as
          the preview behind the play button for an external URL video.
        </p>

        {mode === "edit" && video?.thumbnail_storage_path && !removeThumbnail ? (
          <div className="space-y-2">
            <div className="relative h-24 w-24 overflow-hidden rounded-btn bg-brand-surface">
              {/* Plain <img>, not next/image -- small admin-only preview,
                  same reasoning as HeroSlideForm.tsx. */}
              <img
                src={getPublicStorageUrl("home-videos", video.thumbnail_storage_path)}
                alt=""
                className="h-full w-full object-cover"
              />
            </div>
            <label className="flex items-center gap-2 text-xs text-brand-black">
              <input
                type="checkbox"
                checked={removeThumbnail}
                onChange={(e) => setRemoveThumbnail(e.target.checked)}
                className="h-4 w-4 rounded border-brand-border"
              />
              Remove thumbnail
            </label>
          </div>
        ) : null}

        <input
          ref={thumbInputRef}
          id="thumbnail"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleThumbnailFileChange}
          disabled={thumbUpload.status === "uploading"}
          aria-invalid={Boolean(thumbUpload.error || fieldErrors?.thumbnail)}
          className="block w-full text-sm text-brand-black file:me-3 file:rounded-btn file:border file:border-brand-border file:bg-brand-white file:px-3 file:py-1.5 file:text-sm file:text-brand-black hover:file:border-brand-black disabled:cursor-not-allowed disabled:opacity-60"
        />
        <input type="hidden" name="thumbnail_url" value={thumbUpload.url ?? ""} />
        <p className="text-xs text-brand-gray">JPEG, PNG, or WEBP, up to 5MB.</p>

        {thumbUpload.status === "uploading" ? (
          <div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-brand-border">
              <div
                className="h-full rounded-full bg-brand-black transition-all"
                style={{ width: `${thumbUpload.progress}%` }}
              />
            </div>
            <p className="mt-1 text-xs text-brand-gray">
              Uploading… {Math.round(thumbUpload.progress)}%
            </p>
          </div>
        ) : null}
        {thumbUpload.status === "done" ? (
          <p className="text-xs text-green-700">✓ {thumbUpload.fileName} uploaded.</p>
        ) : null}
        {thumbUpload.error || fieldErrors?.thumbnail ? (
          <p role="alert" className="text-xs text-red-600">
            {thumbUpload.error ?? fieldErrors?.thumbnail}
          </p>
        ) : null}
        {removeThumbnail ? (
          <input type="hidden" name="remove_thumbnail" value="on" />
        ) : null}
      </section>

      <section className="space-y-5">
        <div>
          <h2 className="text-sm font-semibold tracking-wide text-brand-black uppercase">
            Caption
          </h2>
          <p className="mt-1 text-xs text-brand-gray">
            Optional -- the reference site hides its caption area
            entirely; this is this project&apos;s own design addition.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <FormField
            label="Caption (English)"
            name="caption_en"
            defaultValue={video?.caption_en ?? ""}
            error={fieldErrors?.caption_en}
          />
          <FormField
            label="Caption (Arabic)"
            name="caption_ar"
            defaultValue={video?.caption_ar ?? ""}
            error={fieldErrors?.caption_ar}
            dir="rtl"
          />
        </div>
      </section>

      <section className="space-y-5">
        <h2 className="text-sm font-semibold tracking-wide text-brand-black uppercase">
          Settings
        </h2>
        <FormField
          label="Sort Order"
          name="sort_order"
          type="number"
          defaultValue={video?.sort_order ?? 0}
          error={fieldErrors?.sort_order}
          hint="Lower numbers appear first."
        />
        <label className="flex items-center gap-2 text-sm text-brand-black">
          <input
            type="checkbox"
            name="is_active"
            defaultChecked={video?.is_active ?? true}
            className="h-4 w-4 rounded border-brand-border"
          />
          Active (visible on the public site)
        </label>
      </section>

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={submitDisabled}
          className="rounded-btn border border-brand-black bg-brand-black px-6 py-2.5 text-sm font-medium text-brand-white transition-colors hover:bg-brand-white hover:text-brand-black disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending
            ? "Saving…"
            : videoStillUploading || thumbStillUploading
              ? "Uploading…"
              : mode === "create"
                ? "Create Video"
                : "Save Changes"}
        </button>
        <Link
          href="/admin/home-videos"
          className="rounded-btn border border-brand-border px-6 py-2.5 text-sm font-medium text-brand-black transition-colors hover:border-brand-black"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
