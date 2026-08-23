import "server-only";
import { createCachedServiceRoleClient } from "@/lib/supabase/server";
import { REVALIDATE_SECONDS } from "@/lib/config";

/** Digits only -- real Meta Pixel IDs are always numeric. Checked twice
 *  on purpose: once at save time (lib/admin/integration-settings.ts,
 *  rejecting a malformed value before it's ever stored) and again here,
 *  right at the point the stored value is about to be interpolated into
 *  raw, unescaped JavaScript text (buildMetaPixelBaseScript below). This
 *  second check is what actually matters for safety -- it means a
 *  malformed/malicious value could never reach script injection even if
 *  the save-time check were ever bypassed (a direct DB edit, a future
 *  bug), which is the standard of proof this project has used for every
 *  other point where stored data flows into something more sensitive
 *  than plain text (e.g. the SQL identifier validation in earlier
 *  migrations). */
const PIXEL_ID_PATTERN = /^\d+$/;

/**
 * The real Meta Pixel ID, or null when unconfigured -- read via a
 * service-role client wrapped in Next's tagged fetch cache (see
 * createCachedServiceRoleClient's own comment for why service-role is
 * necessary here specifically). Narrow select: only meta_pixel_id, never
 * meta_conversions_api_token -- the token has no reason to ever be
 * fetched by code that renders into public HTML.
 */
export async function getMetaPixelId(): Promise<string | null> {
  const supabase = createCachedServiceRoleClient(
    REVALIDATE_SECONDS.metaIntegration,
    ["meta_integration"]
  );

  const { data, error } = await supabase
    .from("integration_settings")
    .select("meta_pixel_id")
    .eq("id", true)
    .maybeSingle();

  if (error || !data?.meta_pixel_id) return null;
  const trimmed = data.meta_pixel_id.trim();
  return trimmed && PIXEL_ID_PATTERN.test(trimmed) ? trimmed : null;
}

/**
 * The classic Meta Pixel base code (Meta's own documented snippet --
 * https://developers.facebook.com/docs/meta-pixel/get-started, fetched
 * and confirmed during this prompt's research, see the Prompt 47
 * report), with the real pixel ID interpolated in. Loads fbevents.js
 * from connect.facebook.net, then calls fbq('init', ...) and
 * fbq('track', 'PageView') -- PageView fires automatically on every page
 * load this script executes on, satisfying the "PageView (automatic)"
 * requirement with no separate call needed anywhere else in the app.
 *
 * Returns "" (not null/throwing) for an invalid id -- callers render
 * nothing when this is empty, same graceful-disable behavior as an
 * unconfigured pixel entirely (see app/[locale]/layout.tsx).
 */
export function buildMetaPixelBaseScript(pixelId: string): string {
  if (!PIXEL_ID_PATTERN.test(pixelId)) return "";

  return `!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window, document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
fbq('init', '${pixelId}');
fbq('track', 'PageView');`;
}
