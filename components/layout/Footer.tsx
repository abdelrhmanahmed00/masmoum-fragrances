import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { createPublicClient } from "@/lib/supabase/server";
import { REVALIDATE_SECONDS } from "@/lib/config";
import { getPageBySlug } from "@/lib/pages";
import { parseContentBlocks, type ContentBlock } from "@/lib/content-blocks";
import { buildWhatsAppHref } from "@/lib/whatsapp";
import { InstagramIcon, FacebookIcon, TikTokIcon } from "./SocialIcons";
import FooterContactAccordion from "./FooterContactAccordion";

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

// Prompt 90: "about" is now a real, live page too -- a real `pages` row
// (slug "about") created via the same generic Pages CMS as policy/
// privateLabel (Prompt 49), same /pages/<slug> URL shape (see
// app/[locale]/(marketing)/pages/[slug]/page.tsx's own comment for the
// reasoning). Was `/about` (Prompt 48's own flagged 404 gap -- no such
// route ever existed) -- fixed to point at the real page instead of
// inventing a dedicated /about route, since the Pages CMS already covers
// exactly this need.
//
// Prompt 91: "contact" is REMOVED from this plain-link array -- it used
// to be a dead `/contact` placeholder (Prompt 48's own flagged 404 gap),
// now replaced by a real expand/collapse accordion
// (FooterContactAccordion), rendered explicitly below rather than mapped
// here, since it needs real data (the "about" page's footer summary +
// site_settings email/phone) a plain {key,href} pair can't carry.
//
// Prompt 92: "privateLabel" now points at `/private-label` -- a real
// dedicated, fully custom-designed route (app/[locale]/(marketing)/
// private-label/page.tsx), NOT the generic Pages CMS's `/pages/<slug>`
// shape anymore. The OLD "private-label" pages-CMS row (Prompt 25/49)
// is deactivated, not deleted -- see that route's own top comment and
// this prompt's report for the full reasoning.
const SUPPORT_LINKS = [
  { key: "about", href: "/pages/about" },
  { key: "policy", href: "/pages/policy" },
  { key: "privateLabel", href: "/private-label" },
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

/**
 * Prompt 91 -- the "Contact Us" accordion's location/expertise blurb,
 * reusing the SAME "about" pages-CMS row created in Prompt 90 (not a
 * second hand-maintained copy) via its own dedicated footer_summary_en/ar
 * column (0027 migration) -- see that migration's own comment for why
 * that's the robust choice over extracting sections from content_en/ar
 * by matching heading text.
 *
 * getPageBySlug already returns null for a missing/inactive "about" row
 * -- parseContentBlocks("") correctly returns [] (confirmed via
 * lib/content-blocks.ts's own flushParagraph/flushList no-ops on empty
 * input), so every failure mode here (no about page yet, footer summary
 * left blank, fetch error) degrades to the exact same "no summary
 * blocks" state Footer already handles gracefully everywhere else in
 * this file.
 *
 * Same locale-preference-with-fallback rule as pickLocalizedSetting above
 * (current locale first, the OTHER locale's text if only one has been
 * filled in) -- consistent with every other bilingual field on this
 * page, not a new rule invented for this one.
 */
async function getFooterContactSummaryBlocks(
  locale: string
): Promise<ContentBlock[]> {
  const about = await getPageBySlug("about");
  if (!about) return [];

  const primary = locale === "ar" ? about.footer_summary_ar : about.footer_summary_en;
  const fallback = locale === "ar" ? about.footer_summary_en : about.footer_summary_ar;
  const text = normalize(primary) ?? normalize(fallback);

  return text ? parseContentBlocks(text) : [];
}

export default async function Footer() {
  const locale = await getLocale();
  const t = await getTranslations("Footer");
  const nav = await getTranslations("Header.nav");
  const year = new Date().getFullYear();
  const [{ email, phone, whatsapp, instagram, facebook, tiktok }, contactSummaryBlocks] =
    await Promise.all([
      getContactSettings(locale),
      getFooterContactSummaryBlocks(locale),
    ]);
  const hasSocialLinks = Boolean(instagram || facebook || tiktok);
  // Prompt 91 -- the accordion itself only renders if there's genuinely
  // something to show inside it once expanded (summary content OR email
  // OR phone) -- otherwise it'd be a clickable row that opens onto
  // nothing, the same "don't render a broken/empty control" discipline
  // as hasSocialLinks above.
  const hasContactAccordionContent =
    contactSummaryBlocks.length > 0 || Boolean(email) || Boolean(phone);

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
              {/* "about" rendered explicitly first, ahead of the map
                  below -- Prompt 91's accordion needs to sit in this
                  exact SAME position ("about", then "Contact Us", then
                  "policy"/"privateLabel") that the old flat SUPPORT_LINKS
                  array (including "contact") used to produce, but can't
                  itself be a plain {key,href} entry in that array (it
                  needs real fetched data, not just a static href). */}
              <li>
                <Link
                  href={SUPPORT_LINKS[0].href}
                  className="text-sm text-brand-gray transition-colors hover:text-brand-black"
                >
                  {nav(SUPPORT_LINKS[0].key)}
                </Link>
              </li>
              {hasContactAccordionContent ? (
                <li>
                  <FooterContactAccordion
                    label={t("contactHeading")}
                    summaryBlocks={contactSummaryBlocks}
                    email={email}
                    emailLabel={t("contactEmailLabel")}
                    phone={phone}
                    phoneLabel={t("contactPhoneLabel")}
                  />
                </li>
              ) : null}
              {SUPPORT_LINKS.slice(1).map((item) => (
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
                    href={buildWhatsAppHref(whatsapp)}
                    target="_blank"
                    rel="noreferrer"
                    className="transition-colors hover:text-brand-black"
                  >
                    {t("contactWhatsappLabel")}
                  </a>
                </p>
              ) : null}
              {whatsapp ? (
                // Prompt 88 -- a SECOND, distinct WhatsApp link, directly
                // below the plain one above: same number (contact_whatsapp,
                // one source of truth, one gate -- both lines appear/
                // disappear together, since neither can work without a
                // real number set), but this one opens WhatsApp with a
                // pre-filled price-inquiry message via wa.me's `?text=`
                // param, for a visitor who wants to ask about pricing in
                // one tap rather than typing an opener themselves.
                // Deliberately placed in the Contact column, not the
                // Support column next to the existing internal `/quote`
                // link (which shares similar EN wording, "Request a
                // Quote," per this prompt's own explicit label -- a real,
                // considered choice, not an oversight: the two go to
                // genuinely different destinations -- one to this site's
                // own multi-item quote cart flow, this one straight to an
                // external WhatsApp chat -- and sitting directly under
                // the plain "WhatsApp" line here gives it context a
                // Support-column placement wouldn't (there's nothing
                // WhatsApp-flavored to visually group it with there).
                //
                // Same digit-only normalization as the plain WhatsApp
                // link directly above and the admin's own existing wa.me
                // shortcut (app/admin/(dashboard)/quote-requests/[id]/
                // page.tsx) -- both this link and the plain one now call
                // the SAME shared buildWhatsAppHref (lib/whatsapp.ts,
                // Prompt 122) rather than each carrying its own inline
                // copy of the `.replace(/[^\d]/g, "")` regex: wa.me
                // expects international-format digits with no `+`/
                // spaces/dashes, and stripping every non-digit character
                // handles whatever format an admin actually typed into
                // site_settings (confirmed there's no enforced format
                // there today) the same way every other wa.me link in
                // this project already does.
                <p>
                  <a
                    href={buildWhatsAppHref(whatsapp, t("whatsappQuoteMessage"))}
                    target="_blank"
                    rel="noreferrer"
                    className="transition-colors hover:text-brand-black"
                  >
                    {t("whatsappQuoteLabel")}
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
