"use server";

import { redirect } from "next/navigation";
import { createSessionClient } from "@/lib/supabase/server";
import { updateQuoteRequestStatus } from "@/lib/admin/quote-requests";
import type { QuoteRequestStatusActionState } from "@/types/admin-quote-request";

/**
 * Thin "use server" wrapper, same split as every other admin section --
 * createSessionClient (0014 migration's quote_requests_admin_update
 * policy already grants `authenticated` UPDATE, confirmed by re-reading
 * that migration -- no new RLS policy needed for this prompt).
 *
 * No updateTag() call here, deliberately -- unlike every other admin
 * mutation in this project (categories/collections/products/hero-slides/
 * home-videos/site-settings all call updateTag after a successful
 * write), quote_requests and quote_request_items are never read by any
 * PUBLIC page. lib/catalog.ts, Footer.tsx, Hero.tsx, VideosSection.tsx --
 * none of them touch these two tables; the only readers anywhere in the
 * app are this admin section's own two pages, and both use
 * createSessionClient() with a plain, uncached supabase-js query (no
 * `next: { revalidate, tags }` wrapping the way createPublicClient does
 * for public reads). There is no cached fetch entry anywhere for this
 * mutation to invalidate -- calling updateTag("quote_requests") would
 * tag a cache entry that was never created, i.e. dead code. (Every other
 * admin list page -- categories/page.tsx, products/page.tsx, this one --
 * shares that same "nothing to invalidate" property for reads; the ONLY
 * reason categories/products/etc.'s MUTATIONS call updateTag is that
 * their data is separately embedded in cached PUBLIC pages too. Nothing
 * public ever reads a quote request.)
 *
 * redirect() back to the same detail page on success -- not a
 * stay-on-page banner (contrast SiteSettingsForm, Prompt 43) -- because
 * this page shows the current status in two places (the heading's badge
 * and the status control's own dropdown selection), and a redirect is
 * the simplest way to guarantee BOTH reflect the freshly-persisted value
 * from a real server re-render, rather than relying on React preserving
 * (or not) an uncontrolled `<select>`'s post-submit DOM value.
 */
export async function updateQuoteRequestStatusAction(
  id: string,
  _prevState: QuoteRequestStatusActionState,
  formData: FormData
): Promise<QuoteRequestStatusActionState> {
  const supabase = await createSessionClient();
  const status = formData.get("status");

  if (typeof status !== "string") {
    return { status: "error", message: "Invalid status." };
  }

  const result = await updateQuoteRequestStatus(supabase, id, status);

  if (result.status === "success") {
    redirect(`/admin/quote-requests/${id}`);
  }

  return result;
}
