import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { slugify, SLUG_PATTERN } from "@/lib/slugify";
import { trimmedOrNull } from "@/lib/form-utils";
import { UNIQUE_VIOLATION } from "@/lib/admin/shared";
import type { PageActionState, PageFieldErrors } from "@/types/admin-page";

// Same plain-function-taking-a-client split as lib/admin/categories.ts --
// see that file's own comment for the full reasoning (thin "use server"
// wrapper supplies the client + updateTag/redirect; this holds the actual
// validation/mutation logic and can be exercised directly by a
// verification script with an injected client).
//
// content_en/content_ar are NOT re-parsed or validated for format here --
// lib/content-blocks.ts's parser (used only at RENDER time, by
// components/pages/PageContent.tsx) treats any input as valid: an
// unrecognized line is just a paragraph, there's no "malformed content"
// state to reject. Only presence (non-empty) is required, same as every
// other required text field in this project.

type PageInput = {
  title_en: string;
  title_ar: string;
  slug: string;
  content_en: string;
  content_ar: string;
  /** Prompt 91 -- optional. See types/admin-page.ts's own comment. */
  footer_summary_en: string | null;
  footer_summary_ar: string | null;
  is_active: boolean;
};

function validate(formData: FormData): {
  fieldErrors: PageFieldErrors;
  values: PageInput | null;
} {
  const title_en = trimmedOrNull(formData.get("title_en"));
  const title_ar = trimmedOrNull(formData.get("title_ar"));
  const slugRaw = trimmedOrNull(formData.get("slug"));
  const content_en = trimmedOrNull(formData.get("content_en"));
  const content_ar = trimmedOrNull(formData.get("content_ar"));
  // Optional (Prompt 91) -- no requiredness check, unlike content_en/ar
  // above: an empty field is a real, valid "no footer summary set for
  // this page" state, not something to reject.
  const footer_summary_en = trimmedOrNull(formData.get("footer_summary_en"));
  const footer_summary_ar = trimmedOrNull(formData.get("footer_summary_ar"));
  const is_active = formData.get("is_active") === "on";

  const fieldErrors: PageFieldErrors = {};
  if (!title_en) fieldErrors.title_en = "Title (English) is required.";
  if (!title_ar) fieldErrors.title_ar = "Title (Arabic) is required.";
  if (!content_en) fieldErrors.content_en = "Content (English) is required.";
  if (!content_ar) fieldErrors.content_ar = "Content (Arabic) is required.";

  // Same "re-slugify server-side regardless of client input" rule as
  // lib/admin/categories.ts's own validate -- the client auto-generates/
  // lets the admin override the slug for UX, this is the real source of
  // truth.
  const slug = slugRaw ? slugify(slugRaw) : "";
  if (!slug) {
    fieldErrors.slug = "Slug is required.";
  } else if (!SLUG_PATTERN.test(slug)) {
    fieldErrors.slug =
      "Slug can only contain lowercase letters, numbers, and hyphens.";
  }

  if (
    !title_en ||
    !title_ar ||
    !content_en ||
    !content_ar ||
    Object.keys(fieldErrors).length > 0
  ) {
    return { fieldErrors, values: null };
  }

  return {
    fieldErrors,
    values: {
      title_en,
      title_ar,
      slug,
      content_en,
      content_ar,
      footer_summary_en,
      footer_summary_ar,
      is_active,
    },
  };
}

export async function createPage(
  supabase: SupabaseClient,
  formData: FormData
): Promise<PageActionState> {
  const { fieldErrors, values } = validate(formData);
  if (!values) {
    return {
      status: "error",
      message: "Please fix the highlighted fields.",
      fieldErrors,
    };
  }

  const { error } = await supabase.from("pages").insert(values);

  if (error) {
    if (error.code === UNIQUE_VIOLATION) {
      return {
        status: "error",
        message: "That slug is already in use by another page.",
        fieldErrors: { slug: "This slug is already taken." },
      };
    }
    return {
      status: "error",
      message: "Something went wrong creating the page. Please try again.",
    };
  }

  return { status: "success" };
}

export async function updatePage(
  supabase: SupabaseClient,
  id: string,
  formData: FormData
): Promise<PageActionState> {
  const { fieldErrors, values } = validate(formData);
  if (!values) {
    return {
      status: "error",
      message: "Please fix the highlighted fields.",
      fieldErrors,
    };
  }

  const { error } = await supabase.from("pages").update(values).eq("id", id);

  if (error) {
    if (error.code === UNIQUE_VIOLATION) {
      return {
        status: "error",
        message: "That slug is already in use by another page.",
        fieldErrors: { slug: "This slug is already taken." },
      };
    }
    return {
      status: "error",
      message: "Something went wrong saving the page. Please try again.",
    };
  }

  return { status: "success" };
}

/**
 * Simple delete, no dependent-row check -- unlike categories/collections
 * (which check for referencing products first), nothing in the schema
 * references pages.id at all (confirmed via a real grep across every
 * migration file before writing the 0025 migration -- see its own
 * comment). There is no FK-violation path to handle here, so none is
 * pretended.
 */
export async function deletePage(
  supabase: SupabaseClient,
  id: string
): Promise<PageActionState> {
  const { error } = await supabase.from("pages").delete().eq("id", id);

  if (error) {
    return {
      status: "error",
      message: "Something went wrong deleting the page. Please try again.",
    };
  }

  return { status: "success" };
}
