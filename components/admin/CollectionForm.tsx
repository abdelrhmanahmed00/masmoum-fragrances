"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import {
  createCollectionAction,
  updateCollectionAction,
} from "@/app/admin/(dashboard)/collections/actions";
import { slugify } from "@/lib/slugify";
import FormField from "./FormField";
import {
  COLLECTION_ACTION_INITIAL_STATE,
  type AdminCollectionRow,
} from "@/types/admin-collection";

// Mirrors CategoryForm.tsx (Prompt 23) exactly, including the slug
// auto-generation UX -- see that file's own comment for the full
// create-vs-edit reasoning, not repeated here.
export default function CollectionForm({
  mode,
  collection,
}: {
  mode: "create" | "edit";
  collection?: AdminCollectionRow;
}) {
  const action =
    mode === "create"
      ? createCollectionAction
      : updateCollectionAction.bind(null, collection!.id);

  const [state, formAction, isPending] = useActionState(
    action,
    COLLECTION_ACTION_INITIAL_STATE
  );

  const [slug, setSlug] = useState(collection?.slug ?? "");
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
        defaultValue={collection?.name_en}
        error={fieldErrors?.name_en}
        onChange={(e) => {
          if (slugFollowsName) setSlug(slugify(e.target.value));
        }}
      />

      <FormField
        label="Name (Arabic) *"
        name="name_ar"
        defaultValue={collection?.name_ar}
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
        hint="Used in the public URL, e.g. /collections/best-sellers. Lowercase letters, numbers, and hyphens only."
      />

      <FormField
        label="Sort Order"
        name="sort_order"
        type="number"
        defaultValue={collection?.sort_order ?? 0}
        error={fieldErrors?.sort_order}
        hint="Lower numbers appear first."
      />

      <label className="flex items-center gap-2 text-sm text-brand-black">
        <input
          type="checkbox"
          name="is_active"
          defaultChecked={collection?.is_active ?? true}
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
          {isPending ? "Saving…" : mode === "create" ? "Create Collection" : "Save Changes"}
        </button>
        <Link
          href="/admin/collections"
          className="rounded-btn border border-brand-border px-6 py-2.5 text-sm font-medium text-brand-black transition-colors hover:border-brand-black"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
