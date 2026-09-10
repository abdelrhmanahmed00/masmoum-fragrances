"use client";

import { useActionState, useRef, useState } from "react";
import Link from "next/link";
import {
  createCategoryAction,
  updateCategoryAction,
} from "@/app/admin/(dashboard)/categories/actions";
import { slugify } from "@/lib/slugify";
import { getPublicStorageUrl } from "@/lib/supabase/storage";
import { compressImage } from "@/lib/image-compression";
import FormField from "./FormField";
import {
  CATEGORY_ACTION_INITIAL_STATE,
  type AdminCategoryRow,
} from "@/types/admin-category";

// Same 5MB/JPEG-PNG-WEBP limits as the "category-images" Storage bucket's
// real config (0033 migration) and lib/admin/categories.ts's own
// server-side re-check -- client-side only for immediate UX feedback,
// same "advisory, not authoritative" relationship as HeroSlideForm.tsx's
// own identical check.
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];

/**
 * Slug auto-generation UX: while creating (mode="create"), the slug field
 * follows name_en automatically until the admin edits the slug field
 * themselves, at which point it stops following (standard "auto-slug
 * until manually overridden" pattern). While editing an EXISTING category
 * (mode="edit"), the slug never auto-follows name_en changes at all --
 * the category may already have a live/bookmarked/indexed URL, and
 * silently rewriting it just because the display name changed would
 * break that. The slug is still directly editable by hand in both modes.
 */
export default function CategoryForm({
  mode,
  category,
}: {
  mode: "create" | "edit";
  category?: AdminCategoryRow;
}) {
  const action =
    mode === "create"
      ? createCategoryAction
      : updateCategoryAction.bind(null, category!.id);

  const [state, formAction, isPending] = useActionState(
    action,
    CATEGORY_ACTION_INITIAL_STATE
  );

  const [slug, setSlug] = useState(category?.slug ?? "");
  const [slugFollowsName, setSlugFollowsName] = useState(mode === "create");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [clientFileError, setClientFileError] = useState<string | null>(null);
  const [isCompressing, setIsCompressing] = useState(false);

  const fieldErrors = state.status === "error" ? state.fieldErrors : undefined;

  // Same compress-then-swap-the-input's-FileList technique as
  // HeroSlideForm.tsx's own handleFileChange -- see that file's comment
  // for the full reasoning (Prompt 82). Image is OPTIONAL here (unlike
  // hero slides), so there's no `required` prop on the <input> below, but
  // the compression/size-check flow is otherwise identical.
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
    <form action={formAction} className="max-w-xl space-y-5">
      {state.status === "error" ? (
        <div
          role="alert"
          className="rounded-btn border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {state.message}
        </div>
      ) : null}

      <section className="space-y-3">
        <label htmlFor="image" className="block text-sm font-medium text-brand-black">
          Tile Image
        </label>
        <p className="text-xs text-brand-gray">
          Shown as the background of this category&apos;s tile on the
          homepage&apos;s category strip. Optional -- a category with no
          image yet shows a plain placeholder there until one is uploaded.
        </p>

        {mode === "edit" && category?.image_storage_path ? (
          <div className="relative h-24 w-40 overflow-hidden rounded-btn bg-brand-surface">
            {/* Plain <img>, not next/image -- same small admin-only
                current-image preview as HeroSlideForm.tsx's own. */}
            <img
              src={getPublicStorageUrl(
                "category-images",
                category.image_storage_path
              )}
              alt=""
              className="h-full w-full object-cover"
            />
          </div>
        ) : null}

        <input
          ref={fileInputRef}
          id="image"
          name="image"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleFileChange}
          aria-invalid={Boolean(clientFileError || fieldErrors?.image)}
          className="block w-full text-sm text-brand-black file:me-3 file:rounded-btn file:border file:border-brand-border file:bg-brand-white file:px-3 file:py-1.5 file:text-sm file:text-brand-black hover:file:border-brand-black"
        />
        <p className="text-xs text-brand-gray">
          {mode === "edit" && category?.image_storage_path
            ? "Leave empty to keep the current image. JPEG, PNG, or WEBP, up to 5MB."
            : "JPEG, PNG, or WEBP, up to 5MB."}
        </p>
        {clientFileError || fieldErrors?.image ? (
          <p className="text-xs text-red-600">
            {clientFileError ?? fieldErrors?.image}
          </p>
        ) : null}
        {isCompressing ? (
          <p className="text-xs text-brand-gray">Compressing image…</p>
        ) : null}
      </section>

      <FormField
        label="Name (English) *"
        name="name_en"
        defaultValue={category?.name_en}
        error={fieldErrors?.name_en}
        onChange={(e) => {
          if (slugFollowsName) setSlug(slugify(e.target.value));
        }}
      />

      <FormField
        label="Name (Arabic) *"
        name="name_ar"
        defaultValue={category?.name_ar}
        error={fieldErrors?.name_ar}
        dir="rtl"
      />

      <FormField
        label="Slug *"
        name="slug"
        value={slug}
        onChange={(e) => {
          setSlug(e.target.value);
          setSlugFollowsName(false);
        }}
        error={fieldErrors?.slug}
        hint="Used in the public URL, e.g. /categories/perfumes. Lowercase letters, numbers, and hyphens only."
      />

      <FormField
        label="Sort Order"
        name="sort_order"
        type="number"
        defaultValue={category?.sort_order ?? 0}
        error={fieldErrors?.sort_order}
        hint="Lower numbers appear first."
      />

      <label className="flex items-center gap-2 text-sm text-brand-black">
        <input
          type="checkbox"
          name="is_active"
          defaultChecked={category?.is_active ?? true}
          className="h-4 w-4 rounded border-brand-border"
        />
        Active (visible on the public site)
      </label>

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
                ? "Create Category"
                : "Save Changes"}
        </button>
        <Link
          href="/admin/categories"
          className="rounded-btn border border-brand-border px-6 py-2.5 text-sm font-medium text-brand-black transition-colors hover:border-brand-black"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
