"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useQuote } from "@/components/quote/QuoteProvider";

// Brand wordmark — a proper noun, so it stays as-is in both locales rather
// than going through next-intl. Real logo image swaps in when the client
// sends one; this is a styled text placeholder until then.
const BRAND_NAME = "MASMOUM FRAGRANCES";

// Static top-level nav shell (page names), matching the reference site's
// header structure (logo left / nav center / action pill right, mirrored
// automatically in RTL by flexbox + logical properties — see Footer.tsx
// for the equivalent link set). Intentionally NOT dashboard-editable: this
// is site navigation, not product/category data. The first three hrefs
// point at /categories/{slug} using the real seeded category slugs
// (perfumes, body-mist, home-fragrance — confirmed against Prompt 2's
// migration); /collections, /about, /contact remain forward-looking
// placeholders (no index/about/contact page exists yet).
const NAV_ITEMS = [
  { key: "perfumes", href: "/categories/perfumes" },
  { key: "bodyMist", href: "/categories/body-mist" },
  { key: "homeFragrance", href: "/categories/home-fragrance" },
  { key: "collections", href: "/collections" },
  { key: "about", href: "/about" },
  { key: "contact", href: "/contact" },
] as const;

export default function Header() {
  const t = useTranslations("Header");
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  // totalItems = distinct line count, matching the client's own "Quote (3)"
  // spec for this pill (their Quote Summary example distinguishes "TOTAL
  // ITEMS" from "TOTAL QTY" — the pill uses the former; the latter is for
  // the future summary page). Starts at 0 identically on server and first
  // client render (see QuoteProvider's hydration note), then updates once
  // localStorage is read post-mount — no hydration mismatch.
  const { totalItems } = useQuote();

  return (
    <header className="sticky top-0 z-50 border-b border-brand-border bg-brand-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 lg:px-8">
        {/* Mobile: hamburger (hidden on desktop) */}
        <button
          type="button"
          className="-ms-2 p-2 text-brand-black lg:hidden"
          aria-expanded={isMenuOpen}
          aria-controls="mobile-nav"
          onClick={() => setIsMenuOpen(true)}
        >
          <span className="sr-only">{t("openMenu")}</span>
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" d="M3 6h18M3 12h18M3 18h18" />
          </svg>
        </button>

        {/* Logo */}
        <Link
          href="/"
          className="text-base font-semibold tracking-wide text-brand-black lg:flex-1"
        >
          {BRAND_NAME}
        </Link>

        {/* Desktop nav — centered */}
        <nav className="hidden lg:flex lg:flex-1 lg:justify-center">
          <ul className="flex items-center gap-8 text-sm font-medium">
            {NAV_ITEMS.map((item) => (
              <li key={item.key}>
                <Link
                  href={item.href}
                  className="text-brand-black transition-colors hover:text-brand-gray"
                >
                  {t(`nav.${item.key}`)}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* Quote indicator — opposite side from the logo */}
        <Link
          href="/quote"
          className="flex items-center gap-2 rounded-full border border-brand-black px-4 py-1.5 text-sm font-medium text-brand-black transition-colors hover:bg-brand-black hover:text-brand-white lg:flex-1 lg:justify-end"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth={2}>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
            />
          </svg>
          <span>
            {t("quote")} ({totalItems})
          </span>
        </Link>
      </div>

      {/* Mobile off-canvas nav — full-screen backdrop + panel sliding in
          from the logical start edge (left in LTR, right in RTL via the
          rtl: variant, mirroring the reference site's own drawer). */}
      <div
        className={
          "fixed inset-0 z-[60] lg:hidden " +
          (isMenuOpen ? "pointer-events-auto" : "pointer-events-none")
        }
        aria-hidden={!isMenuOpen}
      >
        <div
          className={
            "absolute inset-0 bg-brand-black/50 transition-opacity duration-300 " +
            (isMenuOpen ? "opacity-100" : "opacity-0")
          }
          onClick={() => setIsMenuOpen(false)}
        />
        <div
          id="mobile-nav"
          className={
            "absolute inset-y-0 start-0 w-4/5 max-w-sm overflow-y-auto bg-brand-white shadow-brand transition-transform duration-300 " +
            (isMenuOpen ? "translate-x-0" : "-translate-x-full rtl:translate-x-full")
          }
        >
          <div className="flex items-center justify-between border-b border-brand-border px-4 py-4">
            <span className="text-sm font-semibold text-brand-black">
              {BRAND_NAME}
            </span>
            <button
              type="button"
              className="p-2 text-brand-black"
              onClick={() => setIsMenuOpen(false)}
            >
              <span className="sr-only">{t("closeMenu")}</span>
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          </div>
          <ul className="flex flex-col px-4">
            {NAV_ITEMS.map((item) => (
              <li key={item.key} className="border-b border-brand-border">
                <Link
                  href={item.href}
                  className="block py-3 text-brand-black"
                  onClick={() => setIsMenuOpen(false)}
                >
                  {t(`nav.${item.key}`)}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </header>
  );
}
