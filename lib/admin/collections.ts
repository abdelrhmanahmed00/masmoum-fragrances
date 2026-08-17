import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { slugify, SLUG_PATTERN } from "@/lib/slugify";
import type {
  CollectionActionState,
  CollectionFieldErrors,
} from "@/types/admin-collection";

// Mirrors lib/admin/categories.ts (Prompt 23) exactly for create/update --
// same plain-function-taking-a-client split, same reasoning (real Server
// Action vs. verification-script-injected client), same validation
// approach. See that file's own comment for the full rationale, not
// repeated here.
//
// delete is the one genuinely different function -- see its own comment.

const UNIQUE_VIOLATION = "23505";

function trimmedOrNull(value: FormDataEntryValue | null): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

type CollectionInput = {
  name_en: string;
  name_ar: string;
  slug: string;
  sort_order: number;
  is_active: boolean;
};

function validate(formData: FormData): {
  fieldErrors: CollectionFieldErrors;
  values: CollectionInput | null;
} {
  const name_en = trimmedOrNull(formData.get("name_en"));
  const name_ar = trimmedOrNull(formData.get("name_ar"));
  const slugRaw = trimmedOrNull(formData.get("slug"));
  const sortOrderRaw = formData.get("sort_order");
  const is_active = formData.get("is_active") === "on";

  const fieldErrors: CollectionFieldErrors = {};
  if (!name_en) fieldErrors.name_en = "Name (English) is required.";
  if (!name_ar) fieldErrors.name_ar = "Name (Arabic) is required.";

  const slug = slugRaw ? slugify(slugRaw) : "";
  if (!slug) {
    fieldErrors.slug = "Slug is required.";
  } else if (!SLUG_PATTERN.test(slug)) {
    fieldErrors.slug =
      "Slug can only contain lowercase letters, numbers, and hyphens.";
  }

  let sort_order = 0;
  if (typeof sortOrderRaw === "string" && sortOrderRaw.trim() !== "") {
    const parsed = Number(sortOrderRaw);
    if (!Number.isInteger(parsed)) {
      fieldErrors.sort_order = "Sort order must be a whole number.";
    } else {
      sort_order = parsed;
    }
  }

  if (!name_en || !name_ar || Object.keys(fieldErrors).length > 0) {
    return { fieldErrors, values: null };
  }

  return { fieldErrors, values: { name_en, name_ar, slug, sort_order, is_active } };
}

export async function createCollection(
  supabase: SupabaseClient,
  formData: FormData
): Promise<CollectionActionState> {
  const { fieldErrors, values } = validate(formData);
  if (!values) {
    return {
      status: "error",
      message: "Please fix the highlighted fields.",
      fieldErrors,
    };
  }

  const { error } = await supabase.from("collections").insert(values);

  if (error) {
    if (error.code === UNIQUE_VIOLATION) {
      return {
        status: "error",
        message: "That slug is already in use by another collection.",
        fieldErrors: { slug: "This slug is already taken." },
      };
    }
    return {
      status: "error",
      message: "Something went wrong creating the collection. Please try again.",
    };
  }

  return { status: "success" };
}

export async function updateCollection(
  supabase: SupabaseClient,
  id: string,
  formData: FormData
): Promise<CollectionActionState> {
  const { fieldErrors, values } = validate(formData);
  if (!values) {
    return {
      status: "error",
      message: "Please fix the highlighted fields.",
      fieldErrors,
    };
  }

  const { error } = await supabase
    .from("collections")
    .update(values)
    .eq("id", id);

  if (error) {
    if (error.code === UNIQUE_VIOLATION) {
      return {
        status: "error",
        message: "That slug is already in use by another collection.",
        fieldErrors: { slug: "This slug is already taken." },
      };
    }
    return {
      status: "error",
      message: "Something went wrong saving the collection. Please try again.",
    };
  }

  return { status: "success" };
}

/**
 * Unlike deleteCategory (Prompt 23), no pre-check and no FK-violation
 * branch: confirmed directly from the schema (0007 migration) that
 * product_collections.collection_id is `references collections(id) ON
 * DELETE CASCADE`, not restrict. Deleting a collection automatically
 * (and harmlessly) deletes the matching product_collections rows -- a
 * product losing an optional tag, not losing required data the way a
 * product losing its category would. So this is just a delete; there is
 * no blocking case to detect or message.
 */
export async function deleteCollection(
  supabase: SupabaseClient,
  id: string
): Promise<CollectionActionState> {
  const { error } = await supabase.from("collections").delete().eq("id", id);

  if (error) {
    return {
      status: "error",
      message: "Something went wrong deleting the collection. Please try again.",
    };
  }

  return { status: "success" };
}
