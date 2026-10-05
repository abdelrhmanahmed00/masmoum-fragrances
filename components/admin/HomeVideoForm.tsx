"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
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

// Same limits as the "home-videos" Storage bucket's real config
// (0013 + 0021 migrations) and lib/admin/home-videos.ts's own
// server-side re-check -- client-side only for immediate UX feedback.
const MAX_VIDEO_SIZE_BYTES = 20 * 1024 * 1024;
const ACCEPTED_VIDEO_TYPES = ["video/mp4", "video/webm"];
const MAX_THUMBNAIL_SIZE_BYTES = 5 * 1024 * 1024;
const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

type SourceType = "upload" | "external";

/**
 * Upload vs. external URL -- mutually exclusive by construction, not by
 * post-hoc validation: a radio pair drives which single input the admin
 * actually sees and fills in (source_type is submitted alongside it so
 * lib/admin/home-videos.ts knows which one to treat as authoritative,
 * regardless of what stray value might be sitting in the other, hidden
 * field). home_videos_has_a_source (0013 migration) is still the DB's own
 * backstop for "at least one," but this UI never lets the admin end up in
 * an ambiguous both-or-neither state to begin with.
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
  const [clientVideoError, setClientVideoError] = useState<string | null>(null);
  const [clientThumbError, setClientThumbError] = useState<string | null>(null);
  const [removeThumbnail, setRemoveThumbnail] = useState(false);
  const [isCompressingThumb, setIsCompressingThumb] = useState(false);

  const fieldErrors = state.status === "error" ? state.fieldErrors : undefined;

  function handleVideoFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return setClientVideoError(null);
    if (!ACCEPTED_VIDEO_TYPES.includes(file.type)) {
      setClientVideoError("Only MP4 or WEBM videos are allowed.");
      e.target.value = "";
      return;
    }
    if (file.size > MAX_VIDEO_SIZE_BYTES) {
      setClientVideoError(
        `"${file.name}" is ${(file.size / (1024 * 1024)).toFixed(1)}MB -- the limit is 20MB.`
      );
      e.target.value = "";
      return;
    }
    setClientVideoError(null);
  }

  async function handleThumbnailFileChange(
    e: React.ChangeEvent<HTMLInputElement>
  ) {
    const input = e.target;
    const file = input.files?.[0];
    if (!file) return setClientThumbError(null);
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      setClientThumbError("Only JPEG, PNG, or WEBP images are allowed.");
      input.value = "";
      return;
    }
    setClientThumbError(null);
    if (removeThumbnail) setRemoveThumbnail(false);

    // Thumbnail compression (Prompt 82) -- the VIDEO input above is
    // deliberately untouched: video compression is a materially
    // different problem (re-encoding, not resize+re-encode-as-image) and
    // was explicitly out of scope for this task. Same best-effort/
    // DataTransfer-swap technique as the other two upload forms; no
    // fileInputRef needed here since the change event's own `input`
    // (captured above, before any `await`) is the element to swap
    // `.files` on. The size check below runs AFTER compression, against
    // its result -- a backstop, not a pre-compression gate.
    setIsCompressingThumb(true);
    let effectiveFile = file;
    try {
      effectiveFile = await compressImage(file);
    } finally {
      setIsCompressingThumb(false);
    }

    if (effectiveFile.size > MAX_THUMBNAIL_SIZE_BYTES) {
      setClientThumbError(
        `"${file.name}" is still ${(effectiveFile.size / (1024 * 1024)).toFixed(1)}MB after compression -- the limit is 5MB.`
      );
      input.value = "";
      return;
    }

    if (effectiveFile !== file) {
      const dt = new DataTransfer();
      dt.items.add(effectiveFile);
      input.files = dt.files;
    }
  }

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
              id="file"
              name="file"
              type="file"
              accept="video/mp4,video/webm"
              onChange={handleVideoFileChange}
              aria-invalid={Boolean(clientVideoError || fieldErrors?.file)}
              className="block w-full text-sm text-brand-black file:me-3 file:rounded-btn file:border file:border-brand-border file:bg-brand-white file:px-3 file:py-1.5 file:text-sm file:text-brand-black hover:file:border-brand-black"
            />
            <p className="mt-1 text-xs text-brand-gray">
              {mode === "edit" && video?.storage_path
                ? "Leave empty to keep the current video. MP4 or WEBM, up to 20MB."
                : "MP4 or WEBM, up to 20MB."}
            </p>
            {clientVideoError || fieldErrors?.file ? (
              <p className="mt-1 text-xs text-red-600">
                {clientVideoError ?? fieldErrors?.file}
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
          id="thumbnail"
          name="thumbnail"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleThumbnailFileChange}
          aria-invalid={Boolean(clientThumbError || fieldErrors?.thumbnail)}
          className="block w-full text-sm text-brand-black file:me-3 file:rounded-btn file:border file:border-brand-border file:bg-brand-white file:px-3 file:py-1.5 file:text-sm file:text-brand-black hover:file:border-brand-black"
        />
        <p className="text-xs text-brand-gray">JPEG, PNG, or WEBP, up to 5MB.</p>
        {clientThumbError || fieldErrors?.thumbnail ? (
          <p className="text-xs text-red-600">
            {clientThumbError ?? fieldErrors?.thumbnail}
          </p>
        ) : null}
        {isCompressingThumb ? (
          <p className="text-xs text-brand-gray">Compressing thumbnail…</p>
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
          disabled={isPending || isCompressingThumb}
          className="rounded-btn border border-brand-black bg-brand-black px-6 py-2.5 text-sm font-medium text-brand-white transition-colors hover:bg-brand-white hover:text-brand-black disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending
            ? "Saving…"
            : isCompressingThumb
              ? "Processing…"
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
