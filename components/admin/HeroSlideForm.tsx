"use client";

import { useActionState, useRef, useState } from "react";
import Link from "next/link";
import {
  createHeroSlideAction,
  updateHeroSlideAction,
} from "@/app/admin/(dashboard)/hero-slides/actions";
import { getPublicStorageUrl } from "@/lib/supabase/storage";
import { compressImage } from "@/lib/image-compression";
import FormField from "./FormField";
import {
  HERO_SLIDE_ACTION_INITIAL_STATE,
  type AdminHeroSlideRow,
} from "@/types/admin-hero";

// Same 5MB/JPEG-PNG-WEBP limits as the "hero-images" Storage bucket's
// real config (0012 migration) and lib/admin/hero-slides.ts's own
// server-side re-check -- client-side only for immediate UX feedback,
// same "advisory, not authoritative" relationship as every other
// client-side check in this project (e.g. ProductImagesSection.tsx).
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];

/**
 * Every headline/subheadline/CTA field is genuinely optional -- reflected
 * in the UI with plain, unstarred labels (contrast ProductForm.tsx's
 * "Name (English) *" required-field convention) and explicit hint text,
 * not fields that merely happen to be skippable while still looking
 * required. See lib/admin/hero-slides.ts's own comment for the one real
 * cross-field rule (CTA label and href only mean anything together).
 */
export default function HeroSlideForm({
  mode,
  slide,
}: {
  mode: "create" | "edit";
  slide?: AdminHeroSlideRow;
}) {
  const action =
    mode === "create"
      ? createHeroSlideAction
      : updateHeroSlideAction.bind(null, slide!.id);

  const [state, formAction, isPending] = useActionState(
    action,
    HERO_SLIDE_ACTION_INITIAL_STATE
  );

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [clientFileError, setClientFileError] = useState<string | null>(null);
  const [isCompressing, setIsCompressing] = useState(false);

  const fieldErrors = state.status === "error" ? state.fieldErrors : undefined;

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) {
      setClientFileError(null);
      return;
    }
    if (!ACCEPTED_TYPES.includes(file.type)) {
      setClientFileError("Only JPEG, PNG, or WEBP images are allowed.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    setClientFileError(null);

    // Compress client-side before Storage upload (Prompt 82) -- same
    // best-effort/DataTransfer-swap technique as ProductImagesSection.tsx.
    // The size check below runs AFTER compression, against its result --
    // a backstop, not a pre-compression gate -- so an oversized original
    // gets a real chance to be shrunk under the limit first.
    setIsCompressing(true);
    let effectiveFile = file;
    try {
      effectiveFile = await compressImage(file);
    } finally {
      setIsCompressing(false);
    }

    if (effectiveFile.size > MAX_FILE_SIZE_BYTES) {
      setClientFileError(
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
        <label
          htmlFor="file"
          className="block text-sm font-medium text-brand-black"
        >
          Image {mode === "create" ? "*" : null}
        </label>

        {mode === "edit" && slide ? (
          <div className="relative h-32 w-56 overflow-hidden rounded-btn bg-brand-surface">
            {/* Plain <img>, not next/image -- a small fixed admin
                preview of the CURRENT image, replaced entirely on submit
                if a new file is chosen; not worth the extra
                fill/sizes wiring for this one-off preview. */}
            <img
              src={getPublicStorageUrl("hero-images", slide.storage_path)}
              alt=""
              className="h-full w-full object-cover"
            />
          </div>
        ) : null}

        <input
          ref={fileInputRef}
          id="file"
          name="file"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          required={mode === "create"}
          onChange={handleFileChange}
          aria-invalid={Boolean(clientFileError || fieldErrors?.file)}
          className="block w-full text-sm text-brand-black file:me-3 file:rounded-btn file:border file:border-brand-border file:bg-brand-white file:px-3 file:py-1.5 file:text-sm file:text-brand-black hover:file:border-brand-black"
        />
        <p className="text-xs text-brand-gray">
          {mode === "create"
            ? "JPEG, PNG, or WEBP, up to 5MB."
            : "Leave empty to keep the current image. JPEG, PNG, or WEBP, up to 5MB."}
        </p>
        {clientFileError || fieldErrors?.file ? (
          <p className="text-xs text-red-600">
            {clientFileError ?? fieldErrors?.file}
          </p>
        ) : null}
        {isCompressing ? (
          <p className="text-xs text-brand-gray">Compressing image…</p>
        ) : null}
      </section>

      <section className="space-y-5">
        <div>
          <h2 className="text-sm font-semibold tracking-wide text-brand-black uppercase">
            Text Overlay
          </h2>
          <p className="mt-1 text-xs text-brand-gray">
            All optional -- many real slides are just a clickable image
            with no text at all.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <FormField
            label="Headline (English)"
            name="headline_en"
            defaultValue={slide?.headline_en ?? ""}
            error={fieldErrors?.headline_en}
          />
          <FormField
            label="Headline (Arabic)"
            name="headline_ar"
            defaultValue={slide?.headline_ar ?? ""}
            error={fieldErrors?.headline_ar}
            dir="rtl"
          />
          <FormField
            label="Subheadline (English)"
            name="subheadline_en"
            defaultValue={slide?.subheadline_en ?? ""}
            error={fieldErrors?.subheadline_en}
          />
          <FormField
            label="Subheadline (Arabic)"
            name="subheadline_ar"
            defaultValue={slide?.subheadline_ar ?? ""}
            error={fieldErrors?.subheadline_ar}
            dir="rtl"
          />
        </div>
      </section>

      <section className="space-y-5">
        <div>
          <h2 className="text-sm font-semibold tracking-wide text-brand-black uppercase">
            Call to Action
          </h2>
          <p className="mt-1 text-xs text-brand-gray">
            Optional, but a label and link only ever appear together --
            fill in both or leave both empty.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <FormField
            label="CTA Label (English)"
            name="cta_label_en"
            defaultValue={slide?.cta_label_en ?? ""}
            error={fieldErrors?.cta_label_en}
          />
          <FormField
            label="CTA Label (Arabic)"
            name="cta_label_ar"
            defaultValue={slide?.cta_label_ar ?? ""}
            error={fieldErrors?.cta_label_ar}
            dir="rtl"
          />
        </div>
        <FormField
          label="CTA Link"
          name="cta_href"
          defaultValue={slide?.cta_href ?? ""}
          error={fieldErrors?.cta_href}
          hint="e.g. /products or https://wa.me/..."
        />
      </section>

      <section className="space-y-5">
        <h2 className="text-sm font-semibold tracking-wide text-brand-black uppercase">
          Settings
        </h2>
        <FormField
          label="Sort Order"
          name="sort_order"
          type="number"
          defaultValue={slide?.sort_order ?? 0}
          error={fieldErrors?.sort_order}
          hint="Lower numbers appear first."
        />
        <label className="flex items-center gap-2 text-sm text-brand-black">
          <input
            type="checkbox"
            name="is_active"
            defaultChecked={slide?.is_active ?? true}
            className="h-4 w-4 rounded border-brand-border"
          />
          Active (visible on the public site)
        </label>
      </section>

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={isPending || isCompressing}
          className="rounded-btn border border-brand-black bg-brand-black px-6 py-2.5 text-sm font-medium text-brand-white transition-colors hover:bg-brand-white hover:text-brand-black disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending
            ? "Saving…"
            : isCompressing
              ? "Processing…"
              : mode === "create"
                ? "Create Slide"
                : "Save Changes"}
        </button>
        <Link
          href="/admin/hero-slides"
          className="rounded-btn border border-brand-border px-6 py-2.5 text-sm font-medium text-brand-black transition-colors hover:border-brand-black"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
