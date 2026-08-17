"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import {
  createCategoryAction,
  updateCategoryAction,
} from "@/app/admin/(dashboard)/categories/actions";
import { slugify } from "@/lib/slugify";
import FormField from "./FormField";
import {
  CATEGORY_ACTION_INITIAL_STATE,
  type AdminCategoryRow,
} from "@/types/admin-category";

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

  const fieldErrors = state.status === "error" ? state.fieldErrors : undefined;

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
          disabled={isPending}
          className="rounded-btn border border-brand-black bg-brand-black px-6 py-2.5 text-sm font-medium text-brand-white transition-colors hover:bg-brand-white hover:text-brand-black disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending ? "Saving…" : mode === "create" ? "Create Category" : "Save Changes"}
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
