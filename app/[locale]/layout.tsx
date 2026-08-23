import type { Metadata } from "next";
import Script from "next/script";
import { Jost, Tajawal } from "next/font/google";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import { siteConfig } from "@/lib/config";
import { getMetaPixelId, buildMetaPixelBaseScript } from "@/lib/meta-pixel";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { QuoteProvider } from "@/components/quote/QuoteProvider";
import QuoteSidebar from "@/components/quote/QuoteSidebar";
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

  // Prompt 47 -- read via the tagged cache (getMetaPixelId), not a
  // per-request dynamic fetch, so this doesn't force the whole app off
  // SSG/ISR (see lib/meta-pixel.ts's own comment). null whenever
  // meta_pixel_id is unset -- pixelScript is then "" and nothing below
  // renders: no <Script>, no <noscript> beacon, zero broken tags. This is
  // the ONLY place PageView is fired -- Meta's base code triggers it
  // automatically on every page load the script executes on, so no
  // separate call is needed anywhere else in the app.
  const metaPixelId = await getMetaPixelId();
  const pixelScript = metaPixelId ? buildMetaPixelBaseScript(metaPixelId) : "";

  return (
    <html
      lang={locale}
      dir={direction}
      className={`${activeFont.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {pixelScript ? (
          <>
            <Script
              id="meta-pixel-base"
              strategy="afterInteractive"
              dangerouslySetInnerHTML={{ __html: pixelScript }}
            />
            {/* Meta's own documented <noscript> fallback (see the Prompt
                47 report's cited source) -- a real <img>, not next/image,
                deliberately: this is a 1x1 tracking beacon to a
                third-party host that must render exactly as Meta
                specifies, not an optimizable content image. Matches this
                project's existing, already-justified <img> exceptions
                (admin thumbnails) -- a new, equally-justified category:
                third-party tracking pixel fallback. Wrapped in a real
                <noscript> (not just a comment saying so) -- this beacon
                is meant to fire ONLY when JS (and therefore the Script
                tag above) didn't run at all; without <noscript>, both
                would fire together and double-count every PageView. */}
            <noscript>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                height={1}
                width={1}
                style={{ display: "none" }}
                src={`https://www.facebook.com/tr?id=${metaPixelId}&ev=PageView&noscript=1`}
                alt=""
              />
            </noscript>
          </>
        ) : null}
        <NextIntlClientProvider messages={messages}>
          <QuoteProvider>
            <Header />
            <main className="flex-1">{children}</main>
            <Footer />
            {/* Mounted once at the root, not per-page — same rationale as
                QuoteProvider itself (Prompt 14): it's a persistent
                cross-page overlay, not page content. Its own isSidebarOpen
                state (from context) keeps it invisible/inert until the
                Header's Quote pill opens it. */}
            <QuoteSidebar />
          </QuoteProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
