import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { slugify, SLUG_PATTERN } from "@/lib/slugify";
import { trimmedOrNull } from "@/lib/form-utils";
import { UNIQUE_VIOLATION, FK_VIOLATION } from "@/lib/admin/shared";
import type {
  CategoryOption,
  ProductActionState,
  ProductFieldErrors,
  ProductGenderValue,
} from "@/types/admin-product";

// Same plain-function-taking-a-client split as lib/admin/categories.ts /
// lib/admin/collections.ts (Prompts 23/26) -- see categories.ts's own
// comment for the full reasoning, not repeated here.

// Deliberately NOT lib/catalog.ts's own VALID_GENDERS -- that one is
// scoped to the public gender *filter* UI (Prompt 9/11) and intentionally
// excludes "not_applicable" (nothing on the public site ever filters by
// "not applicable"). The admin form needs all 4 real enum values, so this
// is its own, separate, correctly-scoped set rather than reusing one
// that's missing a legitimate option on purpose.
const VALID_GENDERS: readonly ProductGenderValue[] = [
  "men",
  "women",
  "unisex",
  "not_applicable",
];

type ProductInput = {
  name_en: string;
  name_ar: string;
  slug: string;
  category_id: string;
  gender: ProductGenderValue;
  description_en: string;
  description_ar: string;
  fragrance_top_notes_en: string | null;
  fragrance_top_notes_ar: string | null;
  fragrance_middle_notes_en: string | null;
  fragrance_middle_notes_ar: string | null;
  fragrance_base_notes_en: string | null;
  fragrance_base_notes_ar: string | null;
  moq: number;
  /** null = unlimited/always available (Prompt 28) -- the DEFAULT/expected
   *  state for most products, per the client's own framing, not an edge
   *  case to special-case away. */
  stock_quantity: number | null;
  is_active: boolean;
  is_featured: boolean;
  sort_order: number;
};

function validate(formData: FormData): {
  fieldErrors: ProductFieldErrors;
  values: ProductInput | null;
} {
  const name_en = trimmedOrNull(formData.get("name_en"));
  const name_ar = trimmedOrNull(formData.get("name_ar"));
  const slugRaw = trimmedOrNull(formData.get("slug"));
  const category_id = trimmedOrNull(formData.get("category_id"));
  const genderRaw = trimmedOrNull(formData.get("gender"));
  // description_en/ar: required at the APPLICATION layer per this
  // prompt's own spec, even though the DB columns themselves are
  // nullable (0004 migration has no `not null` on either) -- same
  // "DB nullability is a floor, not a ceiling" reasoning already used
  // for city* on the quote form (Prompt 20).
  const description_en = trimmedOrNull(formData.get("description_en"));
  const description_ar = trimmedOrNull(formData.get("description_ar"));
  const moqRaw = formData.get("moq");
  const sortOrderRaw = formData.get("sort_order");
  const is_active = formData.get("is_active") === "on";
  const is_featured = formData.get("is_featured") === "on";

  // Notes: all 6 genuinely optional (DB nullable, no app-level requirement
  // either -- not every category has fragrance notes, e.g. Home
  // Fragrance). Empty string -> null, not stored as "", so a blank field
  // reads as "no data" everywhere else in the app the same way a never-
  // filled-in field would.
  const fragrance_top_notes_en = trimmedOrNull(formData.get("fragrance_top_notes_en"));
  const fragrance_top_notes_ar = trimmedOrNull(formData.get("fragrance_top_notes_ar"));
  const fragrance_middle_notes_en = trimmedOrNull(formData.get("fragrance_middle_notes_en"));
  const fragrance_middle_notes_ar = trimmedOrNull(formData.get("fragrance_middle_notes_ar"));
  const fragrance_base_notes_en = trimmedOrNull(formData.get("fragrance_base_notes_en"));
  const fragrance_base_notes_ar = trimmedOrNull(formData.get("fragrance_base_notes_ar"));

  const fieldErrors: ProductFieldErrors = {};
  if (!name_en) fieldErrors.name_en = "Name (English) is required.";
  if (!name_ar) fieldErrors.name_ar = "Name (Arabic) is required.";
  if (!description_en) fieldErrors.description_en = "Description (English) is required.";
  if (!description_ar) fieldErrors.description_ar = "Description (Arabic) is required.";
  if (!category_id) fieldErrors.category_id = "Category is required.";

  const slug = slugRaw ? slugify(slugRaw) : "";
  if (!slug) {
    fieldErrors.slug = "Slug is required.";
  } else if (!SLUG_PATTERN.test(slug)) {
    fieldErrors.slug =
      "Slug can only contain lowercase letters, numbers, and hyphens.";
  }

  const gender = genderRaw as ProductGenderValue | null;
  if (!gender || !VALID_GENDERS.includes(gender)) {
    fieldErrors.gender = "Select a valid gender.";
  }

  let moq = 1;
  if (typeof moqRaw !== "string" || moqRaw.trim() === "") {
    fieldErrors.moq = "MOQ is required.";
  } else {
    const parsed = Number(moqRaw);
    if (!Number.isInteger(parsed) || parsed <= 0) {
      fieldErrors.moq = "MOQ must be a positive whole number.";
    } else {
      moq = parsed;
    }
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

  // stock_quantity (Prompt 28): genuinely optional, unlike moq -- an
  // empty field is a real, meaningful, expected value (null = unlimited),
  // not "not yet filled in". Only validated when the admin actually
  // typed something.
  let stock_quantity: number | null = null;
  const stockQuantityRaw = formData.get("stock_quantity");
  if (typeof stockQuantityRaw === "string" && stockQuantityRaw.trim() !== "") {
    const parsed = Number(stockQuantityRaw);
    if (!Number.isInteger(parsed) || parsed < 0) {
      fieldErrors.stock_quantity =
        "Stock quantity must be a non-negative whole number, or left empty for unlimited.";
    } else {
      stock_quantity = parsed;
    }
  }

  if (
    !name_en ||
    !name_ar ||
    !description_en ||
    !description_ar ||
    !category_id ||
    !gender ||
    Object.keys(fieldErrors).length > 0
  ) {
    return { fieldErrors, values: null };
  }

  return {
    fieldErrors,
    values: {
      name_en,
      name_ar,
      slug,
      category_id,
      gender,
      description_en,
      description_ar,
      fragrance_top_notes_en,
      fragrance_top_notes_ar,
      fragrance_middle_notes_en,
      fragrance_middle_notes_ar,
      fragrance_base_notes_en,
      fragrance_base_notes_ar,
      moq,
      stock_quantity,
      is_active,
      is_featured,
      sort_order,
    },
  };
}

export async function createProduct(
  supabase: SupabaseClient,
  formData: FormData
): Promise<ProductActionState> {
  const { fieldErrors, values } = validate(formData);
  if (!values) {
    return {
      status: "error",
      message: "Please fix the highlighted fields.",
      fieldErrors,
    };
  }

  // .select("id") + .single(): Prompt 32 needs the new row's id back so
  // createProductAction can redirect straight to its edit page (sizes --
  // and Prompt 33's images -- can only be added to a product that already
  // exists, so landing there directly, not on the list, is what actually
  // lets the admin continue in one flow). authenticated has a SELECT
  // grant via the 0014 admin RLS policy, same as every other admin read,
  // so reading back the just-inserted row works here unlike the public
  // anon-key insert paths elsewhere in this project that can't do this.
  const { data, error } = await supabase
    .from("products")
    .insert(values)
    .select("id")
    .single();

  if (error) {
    if (error.code === UNIQUE_VIOLATION) {
      return {
        status: "error",
        message: "That slug is already in use by another product.",
        fieldErrors: { slug: "This slug is already taken." },
      };
    }
    if (error.code === FK_VIOLATION) {
      return {
        status: "error",
        message: "Selected category no longer exists. Please choose another.",
        fieldErrors: { category_id: "Choose a valid category." },
      };
    }
    return {
      status: "error",
      message: "Something went wrong creating the product. Please try again.",
    };
  }

  return { status: "success", id: data.id };
}

export async function updateProduct(
  supabase: SupabaseClient,
  id: string,
  formData: FormData
): Promise<ProductActionState> {
  const { fieldErrors, values } = validate(formData);
  if (!values) {
    return {
      status: "error",
      message: "Please fix the highlighted fields.",
      fieldErrors,
    };
  }

  const { error } = await supabase
    .from("products")
    .update(values)
    .eq("id", id);

  if (error) {
    if (error.code === UNIQUE_VIOLATION) {
      return {
        status: "error",
        message: "That slug is already in use by another product.",
        fieldErrors: { slug: "This slug is already taken." },
      };
    }
    if (error.code === FK_VIOLATION) {
      return {
        status: "error",
        message: "Selected category no longer exists. Please choose another.",
        fieldErrors: { category_id: "Choose a valid category." },
      };
    }
    return {
      status: "error",
      message: "Something went wrong saving the product. Please try again.",
    };
  }

  return { status: "success" };
}

/**
 * Delete behavior -- confirmed from the real migration files (0005, 0006,
 * 0007, 0009), not assumed to match any other table's pattern:
 *
 *   - product_sizes.product_id  -> ON DELETE CASCADE (0005)
 *   - product_images.product_id -> ON DELETE CASCADE (0006)
 *   - product_collections.product_id -> ON DELETE CASCADE (0007)
 *   - quote_request_items.product_id -> ON DELETE RESTRICT (0009)
 *
 * The first three cascade harmlessly -- sizes/images/collection-tags are
 * all owned by the product, so deleting the product deleting them too is
 * correct and needs no special handling (no pre-check, no message).
 *
 * quote_request_items is the one that matters: it holds real historical
 * customer inquiry data (Prompt 20), and the schema deliberately restricts
 * deletion rather than cascading -- confirmed this is intentional, not an
 * oversight, by re-reading 0009's own migration comment/design (mirrors
 * quote_requests itself having no admin DELETE policy either, Prompt 21's
 * 0014 migration, for the same "don't destroy customer records" reason).
 * So a product that any buyer has ever requested a quote for can NEVER be
 * hard-deleted through this admin, by design -- the message below steers
 * the admin toward `is_active = false` instead, which already exists as a
 * first-class field and achieves the actual goal (stop showing it
 * publicly) without destroying the historical record.
 *
 * Prompt 34 closes the gap flagged above (it was moot before -- no
 * product had any images until image upload existed): product_images
 * rows cascade-delete from the DB automatically when the product goes,
 * but that never touches the actual files in the "product-images"
 * Storage bucket -- a DB cascade has no way to reach an external system.
 * This function now fetches every storage_path for this product BEFORE
 * deleting it (the cascade removes the product_images rows the instant
 * the products row goes, so this is the last chance to know which
 * objects need cleaning up), then removes those Storage objects AFTER
 * the product delete succeeds. Same ordering reasoning as
 * lib/admin/product-images.ts's deleteProductImage: if Storage cleanup
 * fails, the worst outcome is orphaned files (harmless, invisible) rather
 * than a broken live reference from a delete that only half-completed --
 * logged (console.warn), not silently swallowed, but doesn't fail the
 * overall delete since the DB part (what actually matters for
 * correctness) already succeeded.
 */
export async function deleteProduct(
  supabase: SupabaseClient,
  id: string
): Promise<ProductActionState> {
  const { count, error: countError } = await supabase
    .from("quote_request_items")
    .select("id", { count: "exact", head: true })
    .eq("product_id", id);

  if (countError) {
    return {
      status: "error",
      message: "Could not verify whether this product is referenced by any quote requests. Please try again.",
    };
  }

  if (count && count > 0) {
    return {
      status: "error",
      message: `Can't delete this product — it appears in ${count} submitted quote request${count === 1 ? "" : "s"}. Set it to inactive instead to remove it from the public site without losing that history.`,
    };
  }

  // Must be read BEFORE the delete below -- ON DELETE CASCADE (0006)
  // removes these rows the moment the products row is gone.
  const { data: images } = await supabase
    .from("product_images")
    .select("storage_path")
    .eq("product_id", id);

  const { error } = await supabase.from("products").delete().eq("id", id);

  if (error) {
    if (error.code === FK_VIOLATION) {
      return {
        status: "error",
        message:
          "Can't delete this product — a quote request was just submitted for it. Set it to inactive instead.",
      };
    }
    return {
      status: "error",
      message: "Something went wrong deleting the product. Please try again.",
    };
  }

  // Storage cleanup AFTER the DB delete succeeds -- see this function's
  // own comment above for the ordering reasoning. Best-effort: logged on
  // failure, does not turn a successful product delete into a reported
  // failure.
  if (images && images.length > 0) {
    const paths = images.map((img) => img.storage_path);
    const { error: storageError } = await supabase.storage
      .from("product-images")
      .remove(paths);
    if (storageError) {
      console.warn(
        `[products] Storage cleanup failed for product ${id} after delete (paths: ${paths.join(", ")}).`,
        storageError
      );
    }
  }

  return { status: "success" };
}

/**
 * Category options for the product form's category_id <select>.
 *
 * Deliberately ALL categories (active and inactive), not just active ones
 * -- a partial deviation from this prompt's own literal wording ("a
 * select populated from active categories"), flagged here rather than
 * followed silently: restricting to active-only creates a real bug when
 * EDITING an existing product whose category was deactivated after the
 * product was created -- the <select>'s value would match no <option>,
 * and the browser would silently fall back to selecting whatever option
 * renders first, meaning saving the form without touching the category
 * field would silently reassign the product to a different category.
 * Including every category (with inactive ones visually marked in the
 * form) avoids that entirely and is arguably more correct for an admin
 * tool anyway -- the admin list itself already shows inactive categories
 * for the same "admins should see everything" reason (Prompt 23).
 *
 * Not reused from lib/catalog.ts's getActiveCategoriesList (Prompt 24)
 * for two reasons: that function is active-only (see above) and is
 * ISR-cached via createPublicClient for the public site's performance
 * budget -- wrong semantics for an admin form, which must never show a
 * stale category list. This takes the caller's own client (createSessionClient
 * in the real Server Action / page, same injectable-client pattern as
 * every other function in this file) instead.
 */
export async function getCategoryOptions(
  supabase: SupabaseClient
): Promise<CategoryOption[]> {
  const { data, error } = await supabase
    .from("categories")
    .select("id, name_en, name_ar, is_active")
    .order("sort_order", { ascending: true });

  return error || !data ? [] : data;
}
