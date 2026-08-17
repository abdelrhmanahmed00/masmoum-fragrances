"use server";

import { redirect } from "next/navigation";
import { updateTag } from "next/cache";
import { createSessionClient } from "@/lib/supabase/server";
import { createCategory, updateCategory, deleteCategory } from "@/lib/admin/categories";
import type { CategoryActionState } from "@/types/admin-category";

/**
 * Thin "use server" wrappers, same split as Prompt 20/21: all the actual
 * validation/mutation logic lives in lib/admin/categories.ts as plain
 * functions taking an already-constructed Supabase client. These wrappers'
 * only job is supplying THAT client and handling the two things that
 * genuinely require a live Next.js request context: createSessionClient()
 * (reads the admin's session cookie) and updateTag/redirect.
 *
 * createSessionClient, not createServiceRoleClient: the 0014 migration's
 * admin RLS policies already grant `authenticated` full CRUD on
 * categories -- reaching for the service role here would bypass RLS for
 * no benefit, the same least-privilege reasoning as Prompt 19/20's
 * createAnonMutationClient decision, just one level up the privilege
 * ladder (authenticated instead of anon).
 *
 * updateTag("categories"), not revalidateTag/revalidatePath -- checked
 * against this Next.js version's actual API (its own type declarations
 * require revalidateTag's second "profile" argument now; passing "max"
 * would only give stale-while-revalidate, meaning the very next public
 * request could still show the old name once more before a background
 * refresh catches up). updateTag is what Next's own docs point to for
 * exactly this case: called from a Server Action, wants read-your-own-
 * writes semantics -- "the next request sees updated data," not
 * eventually-fresh. And tag-based (not path-based) because category data
 * is embedded (via a join) in far more places than just the category
 * pages themselves: collection pages, every homepage product tab, and
 * every product detail page all embed category:categories(name_en,
 * name_ar) through PRODUCT_CARD_SELECT/PRODUCT_DETAIL_SELECT (see
 * lib/catalog.ts). Tagging every one of those fetches "categories"
 * (Prompt 23) and invalidating the tag in one call is simpler and more
 * complete than enumerating every affected path/slug by hand -- see the
 * Prompt 23 report for the exact list of tagged call sites.
 */

export async function createCategoryAction(
  _prevState: CategoryActionState,
  formData: FormData
): Promise<CategoryActionState> {
  const supabase = await createSessionClient();
  const result = await createCategory(supabase, formData);

  if (result.status === "success") {
    updateTag("categories");
    redirect("/admin/categories");
  }

  return result;
}

export async function updateCategoryAction(
  id: string,
  _prevState: CategoryActionState,
  formData: FormData
): Promise<CategoryActionState> {
  const supabase = await createSessionClient();
  const result = await updateCategory(supabase, id, formData);

  if (result.status === "success") {
    updateTag("categories");
    redirect("/admin/categories");
  }

  return result;
}

// No `prevState` param: unlike create/update, delete has no formData to
// re-render with on error and no unused-param lint exception needed --
// TypeScript allows a bound action with fewer declared parameters than
// useActionState's (state, payload) signature (standard function-type
// assignability), and the extra runtime argument React passes is simply
// ignored.
export async function deleteCategoryAction(
  id: string
): Promise<CategoryActionState> {
  const supabase = await createSessionClient();
  const result = await deleteCategory(supabase, id);

  if (result.status === "success") {
    updateTag("categories");
  }

  return result;
}
