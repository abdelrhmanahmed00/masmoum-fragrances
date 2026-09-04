import "server-only";
import { createPublicClient } from "@/lib/supabase/server";
import { REVALIDATE_SECONDS } from "@/lib/config";

/** Treats null/empty/whitespace-only as "not set" -- same rule as
 *  Footer.tsx's own normalize() helper (not imported from there: that
 *  file has no exports, only local helpers, same as every other
 *  route/component file in this project). */
function normalize(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

/**
 * The real contact_whatsapp number, or null when unconfigured -- a small,
 * single-key dedicated reader, same pattern as lib/meta-pixel.ts's
 * getMetaPixelId (its own file, one narrow SELECT, tagged cache).
 *
 * Footer.tsx already fetches this same value as part of its own broader
 * getContactSettings() multi-key query, but that function is private to
 * Footer.tsx, and Footer itself is mounted with no props from the root
 * layout. FloatingWhatsAppButton (Prompt 122) needs the same value
 * independently at the LAYOUT level, alongside Footer, not through it --
 * so this gets its own minimal query rather than plumbing Footer's
 * internal helper up through props for one field it doesn't otherwise
 * need. Tagged "site_settings" -- the SAME tag Footer's own query already
 * uses, and every site_settings admin mutation already calls updateTag()
 * on (lib/admin/site-settings.ts) -- so no new cache-invalidation wiring
 * is needed for this to stay fresh; it revalidates on exactly the same
 * schedule/trigger Footer's own WhatsApp links already do.
 *
 * Locale-preference-with-fallback: byte-for-byte the same rule as
 * Footer.tsx's pickLocalizedSetting (current locale's value first, the
 * OTHER locale's value if only one has been filled in) -- applied here to
 * a single-key query instead of Footer's multi-key one, not a different
 * rule invented for this one field.
 */
export async function getWhatsAppNumber(locale: string): Promise<string | null> {
  const supabase = createPublicClient(REVALIDATE_SECONDS.siteSettings, [
    "site_settings",
  ]);
  const { data, error } = await supabase
    .from("site_settings")
    .select("value_en, value_ar")
    .eq("key", "contact_whatsapp")
    .maybeSingle();

  if (error || !data) return null;

  const primary = locale === "ar" ? data.value_ar : data.value_en;
  const fallback = locale === "ar" ? data.value_en : data.value_ar;
  return normalize(primary) ?? normalize(fallback);
}

/**
 * Builds a real wa.me link from a stored number in whatever format an
 * admin actually typed it (site_settings enforces no format there today)
 * -- wa.me expects international-format digits only, no "+", spaces, or
 * dashes.
 *
 * The SINGLE shared implementation of this normalization (Prompt 122):
 * before this, the exact same `.replace(/[^\d]/g, "")` regex was
 * duplicated inline at THREE separate call sites (Footer.tsx's plain
 * WhatsApp link, Footer.tsx's pre-filled quote-message link, and the
 * admin's own quote-requests/[id]/page.tsx shortcut) -- Footer.tsx's two
 * are refactored to call this function too as of this prompt, per its own
 * explicit "reuse the exact same ... logic, don't duplicate/reimplement
 * it differently" instruction; the admin page's copy is left as-is (out
 * of scope -- a different file, a different prompt's own territory, and
 * changing it isn't needed for this task).
 *
 * `message` is optional: omit it for a bare "open a chat" link (this
 * component's own floating button), pass it for a pre-filled opener
 * (Footer's Quick Price Inquiry link).
 */
export function buildWhatsAppHref(rawNumber: string, message?: string): string {
  const digitsOnly = rawNumber.replace(/[^\d]/g, "");
  const query = message ? `?text=${encodeURIComponent(message)}` : "";
  return `https://wa.me/${digitsOnly}${query}`;
}
