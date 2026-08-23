import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { trimmedOrNull, EMAIL_PATTERN } from "@/lib/form-utils";
import type {
  AdminSiteSettingsRow,
  SiteSettingsActionState,
  SiteSettingsFieldErrors,
} from "@/types/admin-settings";

// Same plain-function-taking-a-client split as every other lib/admin/*.ts
// file -- see lib/admin/categories.ts's own comment for the full
// reasoning. The genuinely different shape here: this isn't a list of
// rows with create/edit/delete (categories, products, ...) -- it's a
// FIXED, known set of keys (site_settings' own schema, 0011 + 0022
// migrations: key text primary key, seeded once with every key already
// present, never added to or removed from by this admin). So there's one
// read (getSiteSettings) and one write (updateSiteSettings, a single
// upsert covering every key at once), not per-row CRUD functions.

export const CONTACT_SETTING_KEYS = [
  "contact_email",
  "contact_phone",
  "contact_whatsapp",
] as const;

// Prompt 44 -- URLs, not locale-dependent text. Each uses value_en as its
// single value column (value_ar left null/unused) -- see the 0022
// migration's own comment for why that's the deliberate choice here
// rather than a new dedicated column.
export const SOCIAL_SETTING_KEYS = [
  "social_instagram_url",
  "social_facebook_url",
  "social_tiktok_url",
] as const;

export const ALL_SETTING_KEYS = [
  ...CONTACT_SETTING_KEYS,
  ...SOCIAL_SETTING_KEYS,
] as const;

type SiteSettingsInput = {
  contact_email_en: string | null;
  contact_email_ar: string | null;
  contact_phone_en: string | null;
  contact_phone_ar: string | null;
  contact_whatsapp_en: string | null;
  contact_whatsapp_ar: string | null;
  social_instagram_url: string | null;
  social_facebook_url: string | null;
  social_tiktok_url: string | null;
};

/** Basic "does this look like a URL" check -- requires a real http(s)
 *  scheme (so `new URL()` can actually parse it), but nothing about the
 *  specific host/path -- a redirect/short-link service, or a URL that
 *  isn't literally instagram.com/facebook.com/tiktok.com, still passes.
 *  Same "don't over-validate" spirit as phone/WhatsApp below: this is a
 *  sanity check against obviously malformed input, not an attempt to
 *  verify the link is genuinely a working profile page. */
function isValidUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * Validation is deliberately asymmetric between fields, not an oversight:
 *
 *   - contact_email_en/ar: real format check (EMAIL_PATTERN, shared with
 *     the public quote form) -- an email either looks like an email or it
 *     doesn't, and a malformed one saved here would silently break the
 *     Footer's `mailto:` link.
 *   - contact_phone_en/ar, contact_whatsapp_en/ar: NO format regex.
 *     International B2B contact numbers vary too widely (country code
 *     with/without `+`, spaces, dashes, extensions) for a strict pattern
 *     to not risk rejecting a real, legitimate number the admin actually
 *     wants to enter. trimmedOrNull already answers the only question
 *     that matters here ("was something entered"); the Footer just
 *     renders whatever string is saved as-is (as a `tel:`/`wa.me` link
 *     target), so an overly strict validator would only get in the way,
 *     not prevent a real problem.
 *   - social_instagram_url/facebook_url/tiktok_url: loose URL-shape check
 *     (isValidUrl above) -- a real, checkable minimum ("does this look
 *     like a link at all"), but not locked to a specific domain per
 *     platform, same "don't over-validate" spirit as phone/WhatsApp.
 *
 * Every field is optional -- matches the current graceful-null Footer
 * behavior exactly (0011/0022's rows are seeded NULL on purpose, and
 * Footer.tsx already renders nothing for a null value, not an empty
 * line/icon). Clearing a field back to empty in this form is a
 * legitimate, supported action, not an error.
 */
function validate(formData: FormData): {
  fieldErrors: SiteSettingsFieldErrors;
  values: SiteSettingsInput | null;
} {
  const contact_email_en = trimmedOrNull(formData.get("contact_email_en"));
  const contact_email_ar = trimmedOrNull(formData.get("contact_email_ar"));
  const contact_phone_en = trimmedOrNull(formData.get("contact_phone_en"));
  const contact_phone_ar = trimmedOrNull(formData.get("contact_phone_ar"));
  const contact_whatsapp_en = trimmedOrNull(formData.get("contact_whatsapp_en"));
  const contact_whatsapp_ar = trimmedOrNull(formData.get("contact_whatsapp_ar"));
  const social_instagram_url = trimmedOrNull(formData.get("social_instagram_url"));
  const social_facebook_url = trimmedOrNull(formData.get("social_facebook_url"));
  const social_tiktok_url = trimmedOrNull(formData.get("social_tiktok_url"));

  const fieldErrors: SiteSettingsFieldErrors = {};
  if (contact_email_en && !EMAIL_PATTERN.test(contact_email_en)) {
    fieldErrors.contact_email_en = "Enter a valid email address.";
  }
  if (contact_email_ar && !EMAIL_PATTERN.test(contact_email_ar)) {
    fieldErrors.contact_email_ar = "Enter a valid email address.";
  }
  if (social_instagram_url && !isValidUrl(social_instagram_url)) {
    fieldErrors.social_instagram_url = "Enter a valid link (starting with https://).";
  }
  if (social_facebook_url && !isValidUrl(social_facebook_url)) {
    fieldErrors.social_facebook_url = "Enter a valid link (starting with https://).";
  }
  if (social_tiktok_url && !isValidUrl(social_tiktok_url)) {
    fieldErrors.social_tiktok_url = "Enter a valid link (starting with https://).";
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { fieldErrors, values: null };
  }

  return {
    fieldErrors,
    values: {
      contact_email_en,
      contact_email_ar,
      contact_phone_en,
      contact_phone_ar,
      contact_whatsapp_en,
      contact_whatsapp_ar,
      social_instagram_url,
      social_facebook_url,
      social_tiktok_url,
    },
  };
}

export async function getSiteSettings(
  supabase: SupabaseClient
): Promise<AdminSiteSettingsRow[]> {
  const { data, error } = await supabase
    .from("site_settings")
    .select("key, value_en, value_ar")
    .in("key", ALL_SETTING_KEYS);

  return error || !data ? [] : data;
}

/**
 * One upsert covering every key, not several separate round-trips --
 * `key` is the table's own primary key (0011 migration), so `upsert`
 * with `onConflict: "key"` cleanly resolves to an UPDATE for each of
 * these rows (they already exist, seeded at table-creation/migration
 * time) in a single statement/request. site_settings_set_updated_at
 * (0011's own trigger) still fires normally for the updated rows --
 * upsert's ON CONFLICT DO UPDATE path is a real UPDATE as far as
 * triggers are concerned, nothing special needed here for that.
 *
 * Social keys write to value_en only (value_ar left null) -- see the
 * 0022 migration's own comment for why.
 */
export async function updateSiteSettings(
  supabase: SupabaseClient,
  formData: FormData
): Promise<SiteSettingsActionState> {
  const { fieldErrors, values } = validate(formData);
  if (!values) {
    return {
      status: "error",
      message: "Please fix the highlighted fields.",
      fieldErrors,
    };
  }

  const rows = [
    { key: "contact_email", value_en: values.contact_email_en, value_ar: values.contact_email_ar },
    { key: "contact_phone", value_en: values.contact_phone_en, value_ar: values.contact_phone_ar },
    { key: "contact_whatsapp", value_en: values.contact_whatsapp_en, value_ar: values.contact_whatsapp_ar },
    { key: "social_instagram_url", value_en: values.social_instagram_url, value_ar: null },
    { key: "social_facebook_url", value_en: values.social_facebook_url, value_ar: null },
    { key: "social_tiktok_url", value_en: values.social_tiktok_url, value_ar: null },
  ];

  const { error } = await supabase
    .from("site_settings")
    .upsert(rows, { onConflict: "key" });

  if (error) {
    return {
      status: "error",
      message: "Something went wrong saving settings. Please try again.",
    };
  }

  return { status: "success" };
}
