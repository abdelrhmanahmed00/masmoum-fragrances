import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { slugify, SLUG_PATTERN } from "@/lib/slugify";
import { trimmedOrNull } from "@/lib/form-utils";
import { UNIQUE_VIOLATION, FK_VIOLATION } from "@/lib/admin/shared";
import type {
  CategoryActionState,
  CategoryFieldErrors,
} from "@/types/admin-category";

// Prompt 125 -- one optional admin-uploadable image per category (the
// homepage Category Templates Strip's tile background). Same Storage
// conventions as every other image-upload feature in this project
// (hero_slides, product_images, private_label_images): upload FIRST, DB
// write SECOND, clean up the orphaned upload if the DB write then fails;
// on replacement, upload the NEW file to a fresh path, only delete the
// OLD object after the DB row is confirmed pointing at the new one (CDN
// stale-cache avoidance, Prompt 7's original finding). Image is OPTIONAL
// on both create and edit -- unlike hero_slides (an imageless slide is
// meaningless), a category is already a fully meaningful row without one
// (it has a name, a slug, real products); the homepage strip's own
// graceful placeholder (matching every other "content not uploaded yet"
// state in this project) covers the gap until an admin adds one.

const BUCKET = "category-images";

// Must match the bucket's own real limits (0033 migration: file_size_limit
// = 5242880, allowed_mime_types = the same three keys below).
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;
const EXTENSION_BY_MIME_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

function validateImageFile(
  file: FormDataEntryValue | null
): { error: string | null; file: File | null } {
  const provided = file instanceof File && file.size > 0;
  if (!provided) return { error: null, file: null };

  const validFile = file as File;
  const extension = EXTENSION_BY_MIME_TYPE[validFile.type];
  if (!extension) {
    return {
      error: "Only JPEG, PNG, or WEBP images are allowed.",
      file: null,
    };
  }
  if (validFile.size > MAX_FILE_SIZE_BYTES) {
    return { error: "Must be 5MB or smaller.", file: null };
  }

  return { error: null, file: validFile };
}

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
  const { error: fileError, file } = validateImageFile(formData.get("image"));
  if (fileError) fieldErrors.image = fileError;

  if (!values || fileError) {
    return {
      status: "error",
      message: "Please fix the highlighted fields.",
      fieldErrors,
    };
  }

  let image_storage_path: string | null = null;
  if (file) {
    const extension = EXTENSION_BY_MIME_TYPE[file.type];
    const path = `${crypto.randomUUID()}.${extension}`;
    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(path, file, { contentType: file.type, upsert: false });

    if (uploadError) {
      return {
        status: "error",
        message: "Something went wrong uploading the image. Please try again.",
      };
    }
    image_storage_path = path;
  }

  const { error } = await supabase
    .from("categories")
    .insert({ ...values, image_storage_path });

  if (error) {
    if (image_storage_path) {
      await supabase.storage.from(BUCKET).remove([image_storage_path]);
    }
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
  const { error: fileError, file } = validateImageFile(formData.get("image"));
  if (fileError) fieldErrors.image = fileError;

  if (!values || fileError) {
    return {
      status: "error",
      message: "Please fix the highlighted fields.",
      fieldErrors,
    };
  }

  // No new image -- update the text/sort/active fields only, the existing
  // image_storage_path (if any) untouched entirely, same "storage
  // untouched when no new file is chosen" behavior as
  // lib/admin/hero-slides.ts's own updateHeroSlide.
  if (!file) {
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

  const { data: existing, error: fetchError } = await supabase
    .from("categories")
    .select("image_storage_path")
    .eq("id", id)
    .maybeSingle();

  if (fetchError || !existing) {
    return { status: "error", message: "This category no longer exists." };
  }

  const extension = EXTENSION_BY_MIME_TYPE[file.type];
  const newPath = `${crypto.randomUUID()}.${extension}`;

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(newPath, file, { contentType: file.type, upsert: false });

  if (uploadError) {
    return {
      status: "error",
      message: "Something went wrong uploading the new image. Please try again.",
    };
  }

  const { error: updateError } = await supabase
    .from("categories")
    .update({ ...values, image_storage_path: newPath })
    .eq("id", id);

  if (updateError) {
    // DB row still points at the OLD (still-intact) image (or null) --
    // clean up only the newly-uploaded, now-orphaned file.
    await supabase.storage.from(BUCKET).remove([newPath]);
    if (updateError.code === UNIQUE_VIOLATION) {
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

  // New image confirmed live in the DB -- now safe to remove the old one,
  // if there was one. Best-effort: logged, not fatal, same reasoning as
  // lib/admin/hero-slides.ts's own cleanup step.
  if (existing.image_storage_path) {
    const { error: cleanupError } = await supabase.storage
      .from(BUCKET)
      .remove([existing.image_storage_path]);

    if (cleanupError) {
      console.warn(
        `[categories] Old Storage object cleanup failed for "${existing.image_storage_path}" after replacing category ${id}'s image. File is now orphaned in the bucket.`,
        cleanupError
      );
    }
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

  // Prompt 125 -- must be read BEFORE the delete below, same ordering as
  // lib/admin/products.ts's own deleteProduct: once the row is gone,
  // there's no other way to know which Storage object (if any) needs
  // cleaning up.
  const { data: existing } = await supabase
    .from("categories")
    .select("image_storage_path")
    .eq("id", id)
    .maybeSingle();

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

  // Storage cleanup AFTER the DB delete succeeds -- best-effort, same
  // reasoning as every other delete-with-image function in this project:
  // a failed cleanup leaves a harmless orphaned file, not a broken
  // reference from a delete that only half-completed.
  if (existing?.image_storage_path) {
    const { error: storageError } = await supabase.storage
      .from(BUCKET)
      .remove([existing.image_storage_path]);

    if (storageError) {
      console.warn(
        `[categories] Storage cleanup failed for "${existing.image_storage_path}" after deleting category ${id}.`,
        storageError
      );
    }
  }

  return { status: "success" };
}
