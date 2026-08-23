/** Raw row shape as stored -- key is the table's own primary key
 *  (0011 migration). */
export type AdminSiteSettingsRow = {
  key: string;
  value_en: string | null;
  value_ar: string | null;
};

/** Format-validated only where it actually matters -- email and the
 *  social links have a real, checkable shape; phone/WhatsApp
 *  deliberately don't (see lib/admin/site-settings.ts's own comment for
 *  why). */
export type SiteSettingsFieldErrors = Partial<
  Record<
    | "contact_email_en"
    | "contact_email_ar"
    | "social_instagram_url"
    | "social_facebook_url"
    | "social_tiktok_url",
    string
  >
>;

export type SiteSettingsActionState =
  | { status: "idle" }
  | { status: "success" }
  | {
      status: "error";
      message: string;
      fieldErrors?: SiteSettingsFieldErrors;
    };

export const SITE_SETTINGS_ACTION_INITIAL_STATE: SiteSettingsActionState = {
  status: "idle",
};
