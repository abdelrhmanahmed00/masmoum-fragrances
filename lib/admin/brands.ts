import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { slugify, SLUG_PATTERN } from "@/lib/slugify";
import { trimmedOrNull } from "@/lib/form-utils";
import { UNIQUE_VIOLATION } from "@/lib/admin/shared";
import type { BrandActionState, BrandFieldErrors } from "@/types/admin-brand";

// Same plain-function-taking-a-client split as lib/admin/categories.ts --
// see that file's own comment for the full reasoning, not repeated here.

type BrandInput = {
  name_en: string;
  name_ar: string;
  slug: string;
  sort_order: number;
  is_active: boolean;
};

function validate(formData: FormData): {
  fieldErrors: BrandFieldErrors;
  values: BrandInput | null;
} {
  const name_en = trimmedOrNull(formData.get("name_en"));
  const name_ar = trimmedOrNull(formData.get("name_ar"));
  const slugRaw = trimmedOrNull(formData.get("slug"));
  const sortOrderRaw = formData.get("sort_order");
  const is_active = formData.get("is_active") === "on";

  const fieldErrors: BrandFieldErrors = {};
  if (!name_en) fieldErrors.name_en = "Name (English) is required.";
  if (!name_ar) fieldErrors.name_ar = "Name (Arabic) is required.";

  // Re-slugify server-side regardless of what the client sent -- same
  // "never trust client-only validation" rule as every other form.
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

export type FindOrCreateBrandResult =
  | { status: "success"; brand: { id: string; name_en: string; name_ar: string } }
  | { status: "error"; message: string };

/**
 * Prompt 105 -- powers BrandCombobox.tsx's inline "type a brand name in
 * the product form, create it on the spot if it doesn't exist yet"
 * workflow. Reuses this file's own `validate()` (the SAME slugify/
 * required-field logic `createBrand` below uses) rather than duplicating
 * it -- deliberately NOT calling `createBrand` itself, though: that
 * function's own contract (redirect-friendly `{status,message}`, no
 * created row returned) doesn't fit a caller that needs the new brand's
 * real id back, and its unique-violation branch surfaces a scary "That
 * slug is already in use" error -- exactly wrong for this combobox's own
 * requirement to gracefully REUSE an existing brand instead of erroring
 * when two admins (or a stale client-side list) collide on the same
 * name. Real race-safety: the fallback SELECT below only runs AFTER a
 * genuine unique-constraint violation from Postgres, so it always sees
 * whichever row actually won the race, not a stale read -- this is
 * correct for concurrent creates by construction, not by luck.
 *
 * The caller (BrandCombobox) supplies `name_en` = `name_ar` = the single
 * typed name as a quick-create placeholder (this project's admin is
 * English-only, Prompt 21 -- there's no second-language input to collect
 * inline) -- the existing /admin/brands edit page (unchanged by this
 * prompt) is where an admin refines name_ar afterward, matching this
 * prompt's own "management section stays as-is for later cleanup/
 * renaming" framing.
 */
export async function findOrCreateBrand(
  supabase: SupabaseClient,
  formData: FormData
): Promise<FindOrCreateBrandResult> {
  const { fieldErrors, values } = validate(formData);
  if (!values) {
    const message =
      Object.values(fieldErrors)[0] ?? "Please fix the highlighted fields.";
    return { status: "error", message };
  }

  const { data, error } = await supabase
    .from("brands")
    .insert(values)
    .select("id, name_en, name_ar")
    .single();

  if (!error && data) {
    return { status: "success", brand: data };
  }

  if (error?.code === UNIQUE_VIOLATION) {
    const { data: existing, error: selectError } = await supabase
      .from("brands")
      .select("id, name_en, name_ar")
      .eq("slug", values.slug)
      .maybeSingle();

    if (!selectError && existing) {
      return { status: "success", brand: existing };
    }
  }

  return {
    status: "error",
    message: "Something went wrong creating the brand. Please try again.",
  };
}

export async function createBrand(
  supabase: SupabaseClient,
  formData: FormData
): Promise<BrandActionState> {
  const { fieldErrors, values } = validate(formData);
  if (!values) {
    return {
      status: "error",
      message: "Please fix the highlighted fields.",
      fieldErrors,
    };
  }

  const { error } = await supabase.from("brands").insert(values);

  if (error) {
    if (error.code === UNIQUE_VIOLATION) {
      return {
        status: "error",
        message: "That slug is already in use by another brand.",
        fieldErrors: { slug: "This slug is already taken." },
      };
    }
    return {
      status: "error",
      message: "Something went wrong creating the brand. Please try again.",
    };
  }

  return { status: "success" };
}

export async function updateBrand(
  supabase: SupabaseClient,
  id: string,
  formData: FormData
): Promise<BrandActionState> {
  const { fieldErrors, values } = validate(formData);
  if (!values) {
    return {
      status: "error",
      message: "Please fix the highlighted fields.",
      fieldErrors,
    };
  }

  const { error } = await supabase.from("brands").update(values).eq("id", id);

  if (error) {
    if (error.code === UNIQUE_VIOLATION) {
      return {
        status: "error",
        message: "That slug is already in use by another brand.",
        fieldErrors: { slug: "This slug is already taken." },
      };
    }
    return {
      status: "error",
      message: "Something went wrong saving the brand. Please try again.",
    };
  }

  return { status: "success" };
}

/**
 * Deliberately no "is this brand in use?" pre-check, unlike
 * deleteCategory -- products.brand_id is `references public.brands (id)
 * on delete set null` (0026 migration), not `on delete restrict` like
 * category_id. Deleting a brand can NEVER be blocked by a product
 * referencing it; the DB just clears brand_id on every product that had
 * it, which is the correct, intended behavior (a product should never be
 * broken or deleted just because its brand was removed). No FK_VIOLATION
 * handling needed here either, for the same reason.
 */
export async function deleteBrand(
  supabase: SupabaseClient,
  id: string
): Promise<BrandActionState> {
  const { error } = await supabase.from("brands").delete().eq("id", id);

  if (error) {
    return {
      status: "error",
      message: "Something went wrong deleting the brand. Please try again.",
    };
  }

  return { status: "success" };
}
