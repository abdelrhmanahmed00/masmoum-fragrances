import type { Metadata } from "next";
import { createSessionClient } from "@/lib/supabase/server";
import { getSiteSettings } from "@/lib/admin/site-settings";
import { getIntegrationSettings } from "@/lib/admin/integration-settings";
import SiteSettingsForm from "@/components/admin/SiteSettingsForm";
import MetaIntegrationForm from "@/components/admin/MetaIntegrationForm";

export const metadata: Metadata = {
  title: "Site Settings — Masmoum Admin",
  robots: { index: false, follow: false },
};

// Prompt 47: extends this existing page with a second, independent
// section/form rather than a new top-level nav entry -- both are
// "site-wide configuration" in the same spirit as the original Site
// Settings section (Prompt 43), and this dashboard's nav (lib/admin-nav.ts)
// is already a flat, short list where a dedicated "Meta Ads Integration"
// entry would read as a bigger feature than two text fields actually are.
// The two forms stay fully independent underneath (separate table,
// separate lib/*.ts, separate Server Action) -- this is purely a page-
// layout choice, not a data-layer merge.
export default async function AdminSettingsPage() {
  const supabase = await createSessionClient();
  const [siteSettings, integrationSettings] = await Promise.all([
    getSiteSettings(supabase),
    getIntegrationSettings(supabase),
  ]);

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <h1 className="text-xl font-semibold text-brand-black">Site Settings</h1>
      <div className="mt-6">
        <SiteSettingsForm settings={siteSettings} />
      </div>

      <div className="mt-12 border-t border-brand-border pt-10">
        <h2 className="text-lg font-semibold text-brand-black">
          Meta Ads Integration
        </h2>
        <p className="mt-1 text-sm text-brand-gray">
          Meta Pixel + Conversions API tracking for PageView, ViewContent,
          Add to Quote, and quote request submissions. Leave both fields
          empty to keep tracking disabled.
        </p>
        <div className="mt-6">
          <MetaIntegrationForm settings={integrationSettings} />
        </div>
      </div>
    </div>
  );
}
