"use server";

import { redirect } from "next/navigation";
import { updateTag } from "next/cache";
import { createSessionClient } from "@/lib/supabase/server";
import { createCollection, updateCollection, deleteCollection } from "@/lib/admin/collections";
import type { CollectionActionState } from "@/types/admin-collection";

/**
 * Mirrors app/admin/(dashboard)/categories/actions.ts (Prompt 23) exactly
 * -- same createSessionClient/least-privilege reasoning, same
 * updateTag-over-revalidateTag reasoning (see that file's own comment for
 * both, not repeated here). Tag is "collections", not "categories" --
 * see lib/catalog.ts for exactly which reads carry it
 * (getCollectionBySlug, getActiveCollectionsList) and the Prompt 26
 * report for why that set is different from categories' (collection
 * data isn't embedded into product cards/details via a join the way
 * category data is, so the blast radius is smaller and doesn't include
 * the homepage tabs or product pages).
 */

export async function createCollectionAction(
  _prevState: CollectionActionState,
  formData: FormData
): Promise<CollectionActionState> {
  const supabase = await createSessionClient();
  const result = await createCollection(supabase, formData);

  if (result.status === "success") {
    updateTag("collections");
    redirect("/admin/collections");
  }

  return result;
}

export async function updateCollectionAction(
  id: string,
  _prevState: CollectionActionState,
  formData: FormData
): Promise<CollectionActionState> {
  const supabase = await createSessionClient();
  const result = await updateCollection(supabase, id, formData);

  if (result.status === "success") {
    updateTag("collections");
    redirect("/admin/collections");
  }

  return result;
}

// No `prevState` param -- same reasoning as deleteCategoryAction
// (Prompt 23): TypeScript allows a bound action with fewer declared
// parameters than useActionState's (state, payload) signature.
export async function deleteCollectionAction(
  id: string
): Promise<CollectionActionState> {
  const supabase = await createSessionClient();
  const result = await deleteCollection(supabase, id);

  if (result.status === "success") {
    updateTag("collections");
  }

  return result;
}
