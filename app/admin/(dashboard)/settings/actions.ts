"use server";

import { updateTag } from "next/cache";
import { createSessionClient } from "@/lib/supabase/server";
import { updateSiteSettings } from "@/lib/admin/site-settings";
import { updateIntegrationSettings } from "@/lib/admin/integration-settings";
import type { SiteSettingsActionState } from "@/types/admin-settings";
import type { IntegrationSettingsActionState } from "@/types/admin-integration-settings";

/**
 * Thin "use server" wrapper, same split as every other admin section --
 * createSessionClient (0014 migration already grants `authenticated` full
 * CRUD on site_settings, confirmed by re-reading that migration -- no new
 * RLS policy needed for this prompt).
 *
 * No redirect() after success -- unlike categories/collections/products,
 * this form IS the whole section (no separate list page to return to), so
 * the admin just stays here and sees a success confirmation inline
 * (SiteSettingsForm.tsx).
 *
 * updateTag("site_settings") -- this tag was already added proactively in
 * Prompt 42's performance audit (components/layout/Footer.tsx's
 * getContactSettings), specifically so this exact action would have
 * nothing left to fix here. Confirmed, not re-added.
 */
export async function updateSiteSettingsAction(
  _prevState: SiteSettingsActionState,
  formData: FormData
): Promise<SiteSettingsActionState> {
  const supabase = await createSessionClient();
  const result = await updateSiteSettings(supabase, formData);

  if (result.status === "success") {
    updateTag("site_settings");
  }

  return result;
}

/**
 * Same shape as updateSiteSettingsAction above, separate action for a
 * separate underlying table/form (Prompt 47) -- two independent
 * `<form>`s on the same /admin/settings page, each posting to its own
 * action, rather than merging Meta fields into the site_settings form.
 * Keeping them separate matches this project's "one action per concern"
 * convention (mirrors e.g. hero-slides and home-videos each having their
 * own actions.ts despite sharing a dashboard) and avoids a single form
 * touching two unrelated tables in one submit.
 *
 * updateTag("meta_integration") -- matches the tag getMetaPixelId
 * (lib/meta-pixel.ts) reads with, so the root layout's cached pixel
 * script picks up a saved change on the very next request rather than
 * waiting out the full REVALIDATE_SECONDS.metaIntegration window. The
 * CAPI token itself is read uncached, per-call (lib/meta-conversions-api.ts),
 * so there's nothing to invalidate for that half of this table.
 */
export async function updateIntegrationSettingsAction(
  _prevState: IntegrationSettingsActionState,
  formData: FormData
): Promise<IntegrationSettingsActionState> {
  const supabase = await createSessionClient();
  const result = await updateIntegrationSettings(supabase, formData);

  if (result.status === "success") {
    updateTag("meta_integration");
  }

  return result;
}
