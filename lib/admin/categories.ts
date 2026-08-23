import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { slugify, SLUG_PATTERN } from "@/lib/slugify";
import { trimmedOrNull } from "@/lib/form-utils";
import { UNIQUE_VIOLATION, FK_VIOLATION } from "@/lib/admin/shared";
import type {
  CategoryActionState,
  CategoryFieldErrors,
} from "@/types/admin-category";

// Core category mutation logic (Prompt 23), deliberately a plain function
// that takes an already-constructed Supabase client rather than building
// its own -- two reasons:
//   1. The real call site (app/admin/(dashboard)/categories/actions.ts)
//      passes a createSessionClient() (session-aware, RLS-governed as
//      `authenticated` -- see that file's own comment for the
//      anon/service-role/session-client reasoning, same as Prompt 20/21).
//   2. This same function can be exercised directly by a verification
//      script with a DIFFERENT injected client (e.g. service role, since
//      a script has no real browser session to authenticate with) --
//      testing the actual business logic for real without reimplementing
//      it, the same split established in Prompt 20
//      (processQuoteRequestSubmission) and Prompt 21 (createSessionClient
//      itself). See the Prompt 23 report for exactly what that script
//      does and does not prove as a result.


type CategoryInput = {
  name_en: string;
  name_ar: string;
  slug: string;
  sort_order: number;
  is_active: boolean;
};

function validate(formData: FormData): {
  fieldErrors: CategoryFieldErrors;
  values: CategoryInput | null;
} {
  const name_en = trimmedOrNull(formData.get("name_en"));
  const name_ar = trimmedOrNull(formData.get("name_ar"));
  const slugRaw = trimmedOrNull(formData.get("slug"));
  const sortOrderRaw = formData.get("sort_order");
  const is_active = formData.get("is_active") === "on";

  const fieldErrors: CategoryFieldErrors = {};
  if (!name_en) fieldErrors.name_en = "Name (English) is required.";
  if (!name_ar) fieldErrors.name_ar = "Name (Arabic) is required.";

  // Re-slugify server-side regardless of what the client sent -- the
  // client auto-generates/lets the admin override the slug field for UX,
  // but this is the actual source of truth for what ends up in the DB,
  // same "never trust client-only validation" rule as every other form
  // in this project.
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

export async function createCategory(
  supabase: SupabaseClient,
  formData: FormData
): Promise<CategoryActionState> {
  const { fieldErrors, values } = validate(formData);
  if (!values) {
    return {
      status: "error",
      message: "Please fix the highlighted fields.",
      fieldErrors,
    };
  }

  const { error } = await supabase.from("categories").insert(values);

  if (error) {
    if (error.code === UNIQUE_VIOLATION) {
      return {
        status: "error",
        message: "That slug is already in use by another category.",
        fieldErrors: { slug: "This slug is already taken." },
      };
    }
    return {
      status: "error",
      message: "Something went wrong creating the category. Please try again.",
    };
  }

  return { status: "success" };
}

export async function updateCategory(
  supabase: SupabaseClient,
  id: string,
  formData: FormData
): Promise<CategoryActionState> {
  const { fieldErrors, values } = validate(formData);
  if (!values) {
    return {
      status: "error",
      message: "Please fix the highlighted fields.",
      fieldErrors,
    };
  }

  const { error } = await supabase
    .from("categories")
    .update(values)
    .eq("id", id);

  if (error) {
    if (error.code === UNIQUE_VIOLATION) {
      return {
        status: "error",
        message: "That slug is already in use by another category.",
        fieldErrors: { slug: "This slug is already taken." },
      };
    }
    return {
      status: "error",
      message: "Something went wrong saving the category. Please try again.",
    };
  }

  return { status: "success" };
}

export async function deleteCategory(
  supabase: SupabaseClient,
  id: string
): Promise<CategoryActionState> {
  // products.category_id is `not null references categories(id) on delete
  // restrict` (0004 migration, confirmed by reading the actual migration
  // file, not assumed) -- the DB itself will refuse this delete outright
  // if any product references this category. The count query below isn't
  // what enforces that; it exists purely to turn a raw 23503 error into a
  // specific, actionable message before we even attempt the delete. The
  // FK error is still handled below too, as a backstop for the race where
  // a product gets assigned between this check and the delete.
  const { count, error: countError } = await supabase
    .from("products")
    .select("id", { count: "exact", head: true })
    .eq("category_id", id);

  if (countError) {
    return {
      status: "error",
      message: "Could not verify whether this category is in use. Please try again.",
    };
  }

  if (count && count > 0) {
    return {
      status: "error",
      message: `Can't delete this category — ${count} product${count === 1 ? "" : "s"} still use it. Reassign or remove ${count === 1 ? "it" : "them"} first.`,
    };
  }

  const { error } = await supabase.from("categories").delete().eq("id", id);

  if (error) {
    if (error.code === FK_VIOLATION) {
      return {
        status: "error",
        message:
          "Can't delete this category — a product was just assigned to it. Reassign or remove it first.",
      };
    }
    return {
      status: "error",
      message: "Something went wrong deleting the category. Please try again.",
    };
  }

  return { status: "success" };
}
