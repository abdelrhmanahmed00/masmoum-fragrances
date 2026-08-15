import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { createPublicClient } from "@/lib/supabase/server";
import { REVALIDATE_SECONDS } from "@/lib/config";

const BRAND_NAME = "MASMOUM FRAGRANCES";

// Same static shell nav as Header.tsx, split by intent rather than
// repeating every link — matches the reference site's "Shop" / "Support"
// footer column split.
const SHOP_LINKS = [
  { key: "perfumes", href: "/perfumes" },
  { key: "bodyMist", href: "/body-mist" },
  { key: "homeFragrance", href: "/home-fragrance" },
  { key: "collections", href: "/collections" },
] as const;

const SUPPORT_LINKS = [
  { key: "about", href: "/about" },
  { key: "contact", href: "/contact" },
] as const;

const CONTACT_SETTING_KEYS = [
  "contact_email",
  "contact_phone",
  "contact_whatsapp",
] as const;

type SettingKey = (typeof CONTACT_SETTING_KEYS)[number];
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

async function getContactSettings(locale: string) {
  const supabase = createPublicClient(REVALIDATE_SECONDS.siteSettings);
  const { data, error } = await supabase
    .from("site_settings")
    .select("key, value_en, value_ar")
    .in("key", CONTACT_SETTING_KEYS);

  // Graceful degradation: a fetch error just means no contact rows render
  // (same visual outcome as unset values), never a broken page.
  const rows: SettingsRow[] = error || !data ? [] : data;

  return {
    email: pickLocalizedSetting(rows, "contact_email", locale),
    phone: pickLocalizedSetting(rows, "contact_phone", locale),
    whatsapp: pickLocalizedSetting(rows, "contact_whatsapp", locale),
  };
}

export default async function Footer() {
  const locale = await getLocale();
  const t = await getTranslations("Footer");
  const nav = await getTranslations("Header.nav");
  const year = new Date().getFullYear();
  const { email, phone, whatsapp } = await getContactSettings(locale);

  return (
    <footer className="border-t border-brand-border bg-brand-white">
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
                <p>
                  {t("contactWhatsappLabel")}:{" "}
                  <a
                    href={`https://wa.me/${whatsapp.replace(/[^\d]/g, "")}`}
                    target="_blank"
                    rel="noreferrer"
                    className="transition-colors hover:text-brand-black"
                  >
                    {whatsapp}
                  </a>
                </p>
              ) : null}
            </div>
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
