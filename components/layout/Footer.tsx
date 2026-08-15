import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

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

// Placeholder contact details — swap for the real business email/phone
// once the client provides them. Country is a reasonable regional
// assumption (Gulf B2B wholesale, matching the reference market) but
// unconfirmed; flagged here and in the Prompt 5 report.
const CONTACT_EMAIL = "info@masmoumfragrances.com";
const CONTACT_PHONE = "+971 50 000 0000"; // placeholder — not a real number
const CONTACT_PHONE_HREF = "+971500000000";

export default async function Footer() {
  const t = await getTranslations("Footer");
  const nav = await getTranslations("Header.nav");
  const year = new Date().getFullYear();

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

          {/* Contact */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-brand-black">
              {t("contactHeading")}
            </h3>
            <div className="space-y-2 text-sm text-brand-gray">
              <p>{t("contactCountry")}</p>
              <p>
                {t("contactEmailLabel")}:{" "}
                <a
                  href={`mailto:${CONTACT_EMAIL}`}
                  className="transition-colors hover:text-brand-black"
                >
                  {CONTACT_EMAIL}
                </a>
              </p>
              <p>
                {t("contactPhoneLabel")}:{" "}
                <a
                  href={`tel:${CONTACT_PHONE_HREF}`}
                  className="transition-colors hover:text-brand-black"
                >
                  {CONTACT_PHONE}
                </a>
              </p>
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
