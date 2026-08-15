import type { Metadata } from "next";
import { Jost, Tajawal } from "next/font/google";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import { siteConfig } from "@/lib/config";
import "../globals.css";

// Reference site (shop-gulforchid.com) uses "Jost" for both headings and
// body copy (weights 400/500/600, confirmed via its @font-face rules).
// Jost is Latin-only, so Arabic pages use Tajawal — a geometric Arabic
// sans-serif chosen to pair with Jost's look (this pairing is a necessary
// addition, not something extracted from the reference, which doesn't
// visibly serve distinct Arabic typography). Both bind to the SAME
// `--font-body` CSS variable so only one is ever loaded per request — see
// the `activeFont` selection below and `--font-sans` in globals.css.
const jost = Jost({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

const tajawal = Tajawal({
  variable: "--font-body",
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "700"],
  display: "swap",
});

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export const metadata: Metadata = {
  title: siteConfig.name,
  description: siteConfig.description,
};

// This is the root layout: it defines <html>/<body> because Next.js allows
// the root layout to live under a dynamic segment (app/[locale]/layout.tsx)
// for i18n — there is no separate app/layout.tsx.
export default async function LocaleLayout({
  children,
  params,
}: LayoutProps<"/[locale]">) {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  // Enables static rendering for this locale (next-intl requirement when
  // reading the locale outside of the request-config callback).
  setRequestLocale(locale);

  const messages = await getMessages();
  const direction = locale === "ar" ? "rtl" : "ltr";
  const activeFont = locale === "ar" ? tajawal : jost;

  return (
    <html
      lang={locale}
      dir={direction}
      className={`${activeFont.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <NextIntlClientProvider messages={messages}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
