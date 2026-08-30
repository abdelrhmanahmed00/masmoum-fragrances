import "server-only";
import { createPublicClient } from "@/lib/supabase/server";
import { REVALIDATE_SECONDS } from "@/lib/config";

// Its own file, not folded into lib/catalog.ts -- pages are a distinct
// content type (static, dashboard-managed text pages), unrelated to the
// product catalog's category/collection/product data catalog.ts already
// covers. Same reasoning as lib/admin/site-settings.ts and
// lib/admin/integration-settings.ts each getting their own file instead
// of being appended to an existing one.

export type PublicPage = {
  slug: string;
  title_en: string;
  title_ar: string;
  content_en: string;
  content_ar: string;
  /** Prompt 91 -- optional, short blurb for the Footer's "Contact Us"
   *  accordion. See the 0027 migration's own comment for why this is a
   *  separate field rather than an excerpt of content_en/ar. */
  footer_summary_en: string | null;
  footer_summary_ar: string | null;
};

/**
 * Tagged "pages" -- every admin mutation (lib/admin/pages.ts's callers,
 * app/admin/(dashboard)/pages/actions.ts) calls updateTag("pages") on
 * success, invalidating both this and getActivePageSlugs below in one
 * call, same one-tag-per-content-type convention as "categories",
 * "collections", etc.
 */
export async function getPageBySlug(slug: string): Promise<PublicPage | null> {
  const supabase = createPublicClient(REVALIDATE_SECONDS.pages, ["pages"]);
  const { data, error } = await supabase
    .from("pages")
    .select(
      "slug, title_en, title_ar, content_en, content_ar, footer_summary_en, footer_summary_ar"
    )
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();

  return error || !data ? null : data;
}

/** For generateStaticParams -- every active page's slug, pre-rendered at
 *  build time, same pattern as getActiveCategorySlugs/
 *  getActiveCollectionSlugs/getActiveProductSlugs (lib/catalog.ts). */
export async function getActivePageSlugs(): Promise<{ slug: string }[]> {
  const supabase = createPublicClient(REVALIDATE_SECONDS.pages, ["pages"]);
  const { data, error } = await supabase
    .from("pages")
    .select("slug")
    .eq("is_active", true);

  return error || !data ? [] : data;
}
