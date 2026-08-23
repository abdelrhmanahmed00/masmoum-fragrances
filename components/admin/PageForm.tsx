"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import {
  createPageAction,
  updatePageAction,
} from "@/app/admin/(dashboard)/pages/actions";
import { slugify } from "@/lib/slugify";
import FormField from "./FormField";
import TextareaField from "./TextareaField";
import { PAGE_ACTION_INITIAL_STATE, type AdminPageRow } from "@/types/admin-page";

const CONTENT_HINT =
  '"## Heading" for a section heading, a blank line between paragraphs, "- item" for a bullet list. Everything else renders as plain paragraph text.';

/**
 * Slug auto-generation: same "follows title_en until manually overridden,
 * only while creating" rule as CategoryForm.tsx -- see that file's own
 * comment for the full reasoning (an existing page's slug may already be
 * live/bookmarked/indexed, so editing never silently rewrites it).
 */
export default function PageForm({
  mode,
  page,
}: {
  mode: "create" | "edit";
  page?: AdminPageRow;
}) {
  const action =
    mode === "create" ? createPageAction : updatePageAction.bind(null, page!.id);

  const [state, formAction, isPending] = useActionState(
    action,
    PAGE_ACTION_INITIAL_STATE
  );

  const [slug, setSlug] = useState(page?.slug ?? "");
  const [slugFollowsTitle, setSlugFollowsTitle] = useState(mode === "create");

  const fieldErrors = state.status === "error" ? state.fieldErrors : undefined;

  return (
    <form action={formAction} className="max-w-3xl space-y-5">
      {state.status === "error" ? (
        <div
          role="alert"
          className="rounded-btn border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {state.message}
        </div>
      ) : null}

      <FormField
        label="Title (English) *"
        name="title_en"
        defaultValue={page?.title_en}
        error={fieldErrors?.title_en}
        onChange={(e) => {
          if (slugFollowsTitle) setSlug(slugify(e.target.value));
        }}
      />

      <FormField
        label="Title (Arabic) *"
        name="title_ar"
        defaultValue={page?.title_ar}
        error={fieldErrors?.title_ar}
        dir="rtl"
      />

      <FormField
        label="Slug *"
        name="slug"
        value={slug}
        onChange={(e) => {
          setSlug(e.target.value);
          setSlugFollowsTitle(false);
        }}
        error={fieldErrors?.slug}
        hint="Used in the public URL, e.g. /pages/policy. Lowercase letters, numbers, and hyphens only."
      />

      <TextareaField
        label="Content (English) *"
        name="content_en"
        rows={16}
        defaultValue={page?.content_en}
        error={fieldErrors?.content_en}
        hint={CONTENT_HINT}
      />

      <TextareaField
        label="Content (Arabic) *"
        name="content_ar"
        rows={16}
        dir="rtl"
        defaultValue={page?.content_ar}
        error={fieldErrors?.content_ar}
        hint={CONTENT_HINT}
      />

      <label className="flex items-center gap-2 text-sm text-brand-black">
        <input
          type="checkbox"
          name="is_active"
          defaultChecked={page?.is_active ?? true}
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
          {isPending ? "Saving…" : mode === "create" ? "Create Page" : "Save Changes"}
        </button>
        <Link
          href="/admin/pages"
          className="rounded-btn border border-brand-border px-6 py-2.5 text-sm font-medium text-brand-black transition-colors hover:border-brand-black"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
