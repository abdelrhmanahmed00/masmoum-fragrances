"use server";

import { redirect } from "next/navigation";
import { updateTag } from "next/cache";
import { createSessionClient } from "@/lib/supabase/server";
import { createPage, updatePage, deletePage } from "@/lib/admin/pages";
import type { PageActionState } from "@/types/admin-page";

/**
 * Thin "use server" wrappers, same split/reasoning as
 * app/admin/(dashboard)/categories/actions.ts (see that file's own
 * comment): createSessionClient (0025 migration's admin RLS policy
 * already grants `authenticated` full CRUD on pages), updateTag("pages")
 * on every successful mutation -- this is the ONLY reader of the "pages"
 * tag (lib/pages.ts's getPageBySlug/getActivePageSlugs), so one tag
 * covers this feature completely, same one-tag-per-content-type
 * convention as every other admin section.
 */

export async function createPageAction(
  _prevState: PageActionState,
  formData: FormData
): Promise<PageActionState> {
  const supabase = await createSessionClient();
  const result = await createPage(supabase, formData);

  if (result.status === "success") {
    updateTag("pages");
    redirect("/admin/pages");
  }

  return result;
}

export async function updatePageAction(
  id: string,
  _prevState: PageActionState,
  formData: FormData
): Promise<PageActionState> {
  const supabase = await createSessionClient();
  const result = await updatePage(supabase, id, formData);

  if (result.status === "success") {
    updateTag("pages");
    redirect("/admin/pages");
  }

  return result;
}

export async function deletePageAction(id: string): Promise<PageActionState> {
  const supabase = await createSessionClient();
  const result = await deletePage(supabase, id);

  if (result.status === "success") {
    updateTag("pages");
  }

  return result;
}
