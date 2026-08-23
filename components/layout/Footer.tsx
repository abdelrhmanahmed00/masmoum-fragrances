import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { createPublicClient } from "@/lib/supabase/server";
import { REVALIDATE_SECONDS } from "@/lib/config";
import { InstagramIcon, FacebookIcon, TikTokIcon } from "./SocialIcons";

const BRAND_NAME = "MASMOUM FRAGRANCES";

// Same static shell nav as Header.tsx (kept in sync with its hrefs — see
// its comment), split by intent rather than repeating every link —
// matches the reference site's "Shop" / "Support" footer column split.
const SHOP_LINKS = [
  { key: "perfumes", href: "/categories/perfumes" },
  { key: "bodyMist", href: "/categories/body-mist" },
  { key: "homeFragrance", href: "/categories/home-fragrance" },
  { key: "collections", href: "/collections" },
] as const;

// about/contact are still forward-looking placeholders (Prompt 48's own
// flagged 404 gap) -- unchanged, explicitly out of scope this prompt.
// policy/privateLabel (Prompt 49) are real, live pages -- both under
// /pages/<slug> (see app/[locale]/(marketing)/pages/[slug]/page.tsx's own
// comment for the URL-shape reasoning).
const SUPPORT_LINKS = [
  { key: "about", href: "/about" },
  { key: "contact", href: "/contact" },
  { key: "policy", href: "/pages/policy" },
  { key: "privateLabel", href: "/pages/private-label" },
] as const;

const CONTACT_SETTING_KEYS = [
  "contact_email",
  "contact_phone",
  "contact_whatsapp",
] as const;

// Prompt 44 -- URLs, not locale-dependent text. Each reads value_en only
// (value_ar is left null/unused for these 3 rows) -- see the 0022
// migration's own comment for why that's the deliberate choice rather
// than a new dedicated column.
const SOCIAL_SETTING_KEYS = [
  "social_instagram_url",
  "social_facebook_url",
  "social_tiktok_url",
] as const;

const ALL_SETTING_KEYS = [...CONTACT_SETTING_KEYS, ...SOCIAL_SETTING_KEYS] as const;

type SettingKey = (typeof CONTACT_SETTING_KEYS)[number];
type SocialSettingKey = (typeof SOCIAL_SETTING_KEYS)[number];
type SettingsRow = { key: string; value_en: string | null; value_ar: string | null };

/** Treats null/empty/whitespace-only as "not set" so a stray "" saved from
 *  the future dashboard can't render as an awkward empty line either. */
function normalize(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

/** Prefers the current locale's value, falling back to the other locale's
 *  value if only one has been entered so far (rather than hiding a line
 *  that does have real content, just not yet translated). */
function pickLocalizedSetting(
  rows: SettingsRow[],
  key: SettingKey,
  locale: string
): string | null {
  const row = rows.find((r) => r.key === key);
  if (!row) return null;
  const primary = locale === "ar" ? row.value_ar : row.value_en;
  const fallback = locale === "ar" ? row.value_en : row.value_ar;
  return normalize(primary) ?? normalize(fallback);
}

/** Social links: value_en only, deliberately not locale-picked -- see
 *  SOCIAL_SETTING_KEYS' own comment for why (a URL has no "English
 *  version"). */
function pickSocialSetting(rows: SettingsRow[], key: SocialSettingKey): string | null {
  const row = rows.find((r) => r.key === key);
  return row ? normalize(row.value_en) : null;
}

async function getContactSettings(locale: string) {
  // Tagged "site_settings" (added Prompt 42's performance audit) -- this
  // read had NO cache tag at all, the same gap Hero.tsx and
  // VideosSection.tsx both had before their own fixes (Prompts 35/37).
  // Caught proactively here, before Site Settings' admin CRUD exists yet
  // (an upcoming prompt) -- so that mutation can call
  // updateTag("site_settings") from day one instead of this needing a
  // third reactive fix later.
  const supabase = createPublicClient(REVALIDATE_SECONDS.siteSettings, [
    "site_settings",
  ]);
  const { data, error } = await supabase
    .from("site_settings")
    .select("key, value_en, value_ar")
    .in("key", ALL_SETTING_KEYS);

  // Graceful degradation: a fetch error just means no contact rows render
  // (same visual outcome as unset values), never a broken page.
  const rows: SettingsRow[] = error || !data ? [] : data;

  return {
    email: pickLocalizedSetting(rows, "contact_email", locale),
    phone: pickLocalizedSetting(rows, "contact_phone", locale),
    whatsapp: pickLocalizedSetting(rows, "contact_whatsapp", locale),
    instagram: pickSocialSetting(rows, "social_instagram_url"),
    facebook: pickSocialSetting(rows, "social_facebook_url"),
    tiktok: pickSocialSetting(rows, "social_tiktok_url"),
  };
}

export default async function Footer() {
  const locale = await getLocale();
  const t = await getTranslations("Footer");
  const nav = await getTranslations("Header.nav");
  const year = new Date().getFullYear();
  const { email, phone, whatsapp, instagram, facebook, tiktok } =
    await getContactSettings(locale);
  const hasSocialLinks = Boolean(instagram || facebook || tiktok);

  return (
    // Prompt 74: bg-brand-white -> bg-brand-surface. Re-fetched
    // shop-gulforchid.com fresh (not reused from Prompt 4's original
    // extraction without re-checking) -- its footer's real background
    // color still lives as an inline root CSS variable in the page's own
    // HTML (not theme.css, same place Prompt 4 originally found it):
    // `--color-footer-background: #f5f5f5;` (also
    // `--color-footer-background-mobile: #F5F5F5` and
    // `--color-footer-bottom-background: #f5f5f5` -- same value
    // throughout). Confirmed unchanged since Prompt 4 -- this project's
    // existing `--color-brand-surface: #f5f5f5` token already matches
    // exactly, so no token update was needed, only fixing which class
    // Footer.tsx actually uses (it was set to bg-brand-white, the wrong
    // token, not missing a background entirely). Scoped to this one
    // class only -- text colors, links, borders, and the Header
    // (unrelated, already-finalized gold/black design) are untouched.
    <footer className="border-t border-brand-border bg-brand-surface">
      <div className="mx-auto max-w-7xl px-4 py-12 lg:px-8 lg:py-16">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-8">
          {/* Brand blurb */}
          <div className="space-y-3">
            <p className="text-base font-semibold tracking-wide text-brand-black">
              {BRAND_NAME}
            </p>
            <p className="max-w-xs text-sm text-brand-gray">{t("blurb")}</p>
          </div>

          {/* Shop links */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-brand-black">
              {t("shopHeading")}
            </h3>
            <ul className="space-y-2">
              {SHOP_LINKS.map((item) => (
                <li key={item.key}>
                  <Link
                    href={item.href}
                    className="text-sm text-brand-gray transition-colors hover:text-brand-black"
                  >
                    {nav(item.key)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Support links */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-brand-black">
              {t("supportHeading")}
            </h3>
            <ul className="space-y-2">
              {SUPPORT_LINKS.map((item) => (
                <li key={item.key}>
                  <Link
                    href={item.href}
                    className="text-sm text-brand-gray transition-colors hover:text-brand-black"
                  >
                    {nav(item.key)}
                  </Link>
                </li>
              ))}
              <li>
                <Link
                  href="/quote"
                  className="text-sm text-brand-gray transition-colors hover:text-brand-black"
                >
                  {t("requestQuote")}
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact — email/phone/whatsapp are dashboard-editable
              (site_settings table); each line only renders once a real
              value has been entered. */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-brand-black">
              {t("contactHeading")}
            </h3>
            <div className="space-y-2 text-sm text-brand-gray">
              <p>{t("contactCountry")}</p>
              {email ? (
                <p>
                  {t("contactEmailLabel")}:{" "}
                  <a
                    href={`mailto:${email}`}
                    className="transition-colors hover:text-brand-black"
                  >
                    {email}
                  </a>
                </p>
              ) : null}
              {phone ? (
                <p>
                  {t("contactPhoneLabel")}:{" "}
                  <a
                    href={`tel:${phone}`}
                    className="transition-colors hover:text-brand-black"
                  >
                    {phone}
                  </a>
                </p>
              ) : null}
              {whatsapp ? (
                // Prompt 44 fix: the link text is now the fixed,
                // translated "WhatsApp" label (contactWhatsappLabel --
                // already existed with exactly this value, reused as-is,
                // no new translation key needed), never the raw stored
                // number. Unlike email/phone above, where showing the
                // real value as text is the intended design -- this fix
                // is WhatsApp-specific, not a change to how those two
                // display. The number itself only ever appears inside
                // the href, building the wa.me link.
                <p>
                  <a
                    href={`https://wa.me/${whatsapp.replace(/[^\d]/g, "")}`}
                    target="_blank"
                    rel="noreferrer"
                    className="transition-colors hover:text-brand-black"
                  >
                    {t("contactWhatsappLabel")}
                  </a>
                </p>
              ) : null}
            </div>

            {/* Social links -- icon row, graceful per-icon omission (no
                Instagram set = no Instagram icon, not a broken
                placeholder). Plain flex row: gap-* and flex's own
                direction-follows-`dir` behavior are both logical/
                direction-agnostic already, so this mirrors correctly
                under dir="rtl" with no rtl: overrides needed, same as
                every other icon row already in this project (e.g.
                Header's mobile nav). */}
            {hasSocialLinks ? (
              <div className="flex items-center gap-4 pt-1">
                {instagram ? (
                  <a
                    href={instagram}
                    target="_blank"
                    rel="noreferrer"
                    aria-label="Instagram"
                    className="text-brand-gray transition-colors hover:text-brand-black"
                  >
                    <InstagramIcon className="h-5 w-5" />
                  </a>
                ) : null}
                {facebook ? (
                  <a
                    href={facebook}
                    target="_blank"
                    rel="noreferrer"
                    aria-label="Facebook"
                    className="text-brand-gray transition-colors hover:text-brand-black"
                  >
                    <FacebookIcon className="h-5 w-5" />
                  </a>
                ) : null}
                {tiktok ? (
                  <a
                    href={tiktok}
                    target="_blank"
                    rel="noreferrer"
                    aria-label="TikTok"
                    className="text-brand-gray transition-colors hover:text-brand-black"
                  >
                    <TikTokIcon className="h-5 w-5" />
                  </a>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>

        <div className="mt-10 border-t border-brand-border pt-6">
          <p className="text-center text-sm text-brand-gray sm:text-start">
            {t("copyright", { year })}
          </p>
        </div>
      </div>
    </footer>
  );
}
