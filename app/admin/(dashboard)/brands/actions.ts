"use server";

import { redirect } from "next/navigation";
import { updateTag } from "next/cache";
import { createSessionClient } from "@/lib/supabase/server";
import {
  createBrand,
  updateBrand,
  deleteBrand,
  findOrCreateBrand,
  type FindOrCreateBrandResult,
} from "@/lib/admin/brands";
import type { BrandActionState } from "@/types/admin-brand";

/**
 * Thin "use server" wrappers -- byte-for-byte the same shape as
 * app/admin/(dashboard)/categories/actions.ts, see that file's own
 * comment for the full createSessionClient/updateTag reasoning, not
 * repeated here. updateTag("brands") -- a new, dedicated tag (not reused
 * from "categories") since brands are a genuinely separate taxonomy;
 * Phase B's public reads will tag their brand-embedding fetches "brands"
 * the same way category-embedding fetches are tagged "categories" today
 * (see lib/catalog.ts's PRODUCT_CARD_SELECT and its own Prompt 23 note).
 */

export async function createBrandAction(
  _prevState: BrandActionState,
  formData: FormData
): Promise<BrandActionState> {
  const supabase = await createSessionClient();
  const result = await createBrand(supabase, formData);

  if (result.status === "success") {
    updateTag("brands");
    redirect("/admin/brands");
  }

  return result;
}

export async function updateBrandAction(
  id: string,
  _prevState: BrandActionState,
  formData: FormData
): Promise<BrandActionState> {
  const supabase = await createSessionClient();
  const result = await updateBrand(supabase, id, formData);

  if (result.status === "success") {
    updateTag("brands");
    redirect("/admin/brands");
  }

  return result;
}

/**
 * Prompt 105 -- called directly from BrandCombobox.tsx's client code
 * (not via useActionState/<form action>, this component isn't its own
 * form -- Server Actions can be invoked as a plain async function from a
 * client event handler, same "authenticated, RLS-gated" guarantee as
 * every other action here). No redirect (createBrandAction's own
 * redirect("/admin/brands") would navigate the admin away from the
 * product form they're still filling out -- exactly wrong here), and
 * returns the created/reused brand's real id + names so the combobox
 * can select it immediately. Still updateTag("brands") on success, same
 * as createBrandAction -- the /admin/brands list page must see this new
 * row too.
 */
export async function findOrCreateBrandAction(
  formData: FormData
): Promise<FindOrCreateBrandResult> {
  const supabase = await createSessionClient();
  const result = await findOrCreateBrand(supabase, formData);

  if (result.status === "success") {
    updateTag("brands");
  }

  return result;
}

export async function deleteBrandAction(id: string): Promise<BrandActionState> {
  const supabase = await createSessionClient();
  const result = await deleteBrand(supabase, id);

  if (result.status === "success") {
    // NOTE for Phase B: unlike a category delete (blocked outright while
    // any product still uses it), a brand delete CAN succeed while
    // products still reference it (ON DELETE SET NULL just clears
    // brand_id on them, rather than refusing the delete). Nothing public
    // embeds brand data yet in this phase, so "brands" alone is
    // sufficient invalidation right now -- once Phase B adds a
    // brand-embedding public read (tagged "products" and/or "brands",
    // whatever it actually needs), revisit whether this delete path
    // needs to invalidate that tag too.
    updateTag("brands");
  }

  return result;
}
