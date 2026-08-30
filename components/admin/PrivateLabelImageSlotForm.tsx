"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { updatePrivateLabelImageAction } from "@/app/admin/(dashboard)/private-label/actions";
import { compressImage } from "@/lib/image-compression";
import { getPublicStorageUrl } from "@/lib/supabase/storage";
import {
  PRIVATE_LABEL_IMAGE_ACTION_INITIAL_STATE,
  type PrivateLabelImageSlot,
} from "@/types/admin-private-label";

// Same 5MB/JPEG-PNG-WEBP limits as the private-label-images Storage
// bucket's real config (0028 migration) and lib/admin/private-label-images.ts's
// own server-side re-check -- client-side only for immediate UX feedback,
// same "advisory, not authoritative" relationship as every other
// client-side check in this project (e.g. ProductImagesSection.tsx).
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];

/**
 * One of the 7 fixed-slot upload widgets on the Private Label admin page
 * -- byte-for-byte the same client-side compression wiring as
 * ProductImagesSection.tsx/HeroSlideForm.tsx (Prompt 82): compress on
 * file-select (not on submit), swap the compressed File into the
 * <input>'s own .files via DataTransfer so the existing action={formAction}
 * submission picks it up unchanged, and the size-limit check runs AFTER
 * compression as a backstop, not before it (see lib/image-compression.ts's
 * own comment for why compressing first matters for a genuinely oversized
 * original).
 */
export default function PrivateLabelImageSlotForm({
  slot,
  label,
  currentStoragePath,
}: {
  slot: PrivateLabelImageSlot;
  label: string;
  currentStoragePath: string | null;
}) {
  const router = useRouter();
  const action = updatePrivateLabelImageAction.bind(null, slot);
  const [state, formAction, isPending] = useActionState(
    action,
    PRIVATE_LABEL_IMAGE_ACTION_INITIAL_STATE
  );

  const formRef = useRef<HTMLFormElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [clientError, setClientError] = useState<string | null>(null);
  const [isCompressing, setIsCompressing] = useState(false);

  // Same reset+refresh pattern as ProductImagesSection.tsx: clear the
  // file input and re-fetch this Server Component's own data so the
  // preview thumbnail immediately reflects the just-uploaded image,
  // rather than requiring a manual page reload.
  useEffect(() => {
    if (state.status === "success") {
      formRef.current?.reset();
      router.refresh();
    }
  }, [state, router]);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) {
      setClientError(null);
      return;
    }
    if (!ACCEPTED_TYPES.includes(file.type)) {
      setClientError("Only JPEG, PNG, or WEBP images are allowed.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    setClientError(null);

    setIsCompressing(true);
    let effectiveFile = file;
    try {
      effectiveFile = await compressImage(file);
    } finally {
      setIsCompressing(false);
    }

    if (effectiveFile.size > MAX_FILE_SIZE_BYTES) {
      setClientError(
        `"${file.name}" is still ${(effectiveFile.size / (1024 * 1024)).toFixed(1)}MB after compression -- the limit is 5MB.`
      );
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    if (effectiveFile !== file && fileInputRef.current) {
      const dt = new DataTransfer();
      dt.items.add(effectiveFile);
      fileInputRef.current.files = dt.files;
    }
  }

  return (
    <div className="flex items-center gap-4 rounded-card border border-brand-border p-4">
      {/* Current image preview, or a plain placeholder square if this
          slot has never had one uploaded -- matching this project's
          established "graceful empty state, never a broken <img>"
          convention (e.g. ProductCard's placeholder icon). */}
      <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-btn bg-brand-surface">
        {currentStoragePath ? (
          // Plain <img>, not next/image -- a small fixed admin preview,
          // same reasoning as HeroSlideForm.tsx/HomeVideoForm.tsx's own
          // edit-mode previews.
          <img
            src={getPublicStorageUrl("private-label-images", currentStoragePath)}
            alt=""
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-brand-gray">
            <svg
              viewBox="0 0 24 24"
              className="h-6 w-6"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 16.5V6a1 1 0 011-1h16a1 1 0 011 1v12a1 1 0 01-1 1H4a1 1 0 01-1-1zm0 0l6-6 4 4 3-3 5 5"
              />
              <circle cx="8" cy="8" r="1.5" />
            </svg>
          </div>
        )}
      </div>

      <form
        ref={formRef}
        action={formAction}
        className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"
      >
        <div>
          <p className="text-sm font-medium text-brand-black">{label}</p>
          {(clientError || (state.status === "error" && state.message)) ? (
            <p role="alert" className="mt-0.5 text-xs text-red-600">
              {clientError ?? (state.status === "error" ? state.message : "")}
            </p>
          ) : isCompressing ? (
            <p className="mt-0.5 text-xs text-brand-gray">Compressing image…</p>
          ) : (
            <p className="mt-0.5 text-xs text-brand-gray">
              JPEG, PNG, or WEBP, up to 5MB.
            </p>
          )}
        </div>

        <div className="flex items-center gap-3">
          <input
            ref={fileInputRef}
            name="file"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleFileChange}
            className="block text-sm text-brand-black file:me-3 file:rounded-btn file:border file:border-brand-border file:bg-brand-white file:px-3 file:py-1.5 file:text-sm file:text-brand-black hover:file:border-brand-black"
          />
          <button
            type="submit"
            disabled={isPending || isCompressing || Boolean(clientError)}
            className="rounded-btn border border-brand-black bg-brand-black px-4 py-2 text-sm font-medium text-brand-white transition-colors hover:bg-brand-white hover:text-brand-black disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPending ? "Uploading…" : isCompressing ? "Processing…" : "Upload"}
          </button>
        </div>
      </form>
    </div>
  );
}
