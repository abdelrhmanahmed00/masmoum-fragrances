"use client";

import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";

/**
 * Prompt 62: locale toggle for the Header's end zone. Shows the CURRENT
 * locale's code (per the task's own explicit spec: "showing the current
 * locale... that switches to the other locale") -- clicking it navigates
 * to the OTHER locale.
 *
 * Mechanism -- confirmed against this project's actual installed
 * next-intl version (4.13.6) rather than assumed from memory, per this
 * repo's own AGENTS.md instruction to verify against real docs/types for
 * a "not the Next.js you know" codebase: createNavigation's real .d.ts
 * (node_modules/next-intl/dist/types/navigation/react-client/
 * createNavigation.d.ts) shows `usePathname`/`useRouter().replace` collapse
 * to a plain `string` href (not the `{pathname, params}` object shape)
 * whenever routing.ts has no `pathnames` map configured -- which is this
 * project's exact setup (i18n/routing.ts only sets `locales`/
 * `defaultLocale`, no localized-path-per-locale table). That means path
 * SEGMENTS -- including dynamic ones like a product's slug -- are
 * identical across locales here; only the `[locale]` prefix itself
 * changes. So `usePathname()` (which already strips that prefix and
 * resolves any dynamic segments to their real current value, e.g.
 * "/products/some-real-slug", confirmed via the same .d.ts) can be
 * handed straight to `router.replace(pathname, { locale })` with no
 * params object needed -- this works identically for a static route
 * (/quote) and a dynamic one (/products/[slug], /categories/[slug]),
 * verified in the Prompt 62 report via a real curl-replayed navigation
 * against an actual product page.
 *
 * Deliberately NOT preserving the current URL's query string (via
 * next/navigation's useSearchParams) even though one real page in this
 * project reads one (/categories/[slug]'s gender/collection filters,
 * Prompt 11): Next's own docs (use-search-params.md, checked against
 * this installed version) require any Client Component that calls
 * useSearchParams to be wrapped in its own <Suspense> boundary during
 * static rendering, or "the build fails". Header renders on every single
 * page in the app (every one of them SSG/ISR) -- correctly wrapping just
 * this one small piece in Suspense to preserve an edge-case query string
 * is possible, but not worth the added structural risk to a component
 * this central for a feature the task's own example (a product page)
 * doesn't even need: `usePathname()` alone (confirmed above, no Suspense
 * requirement unless the experimental `cacheComponents` flag is on --
 * checked next.config.ts, it isn't) already satisfies exactly what was
 * asked. Net effect of this trade-off: switching locale from a
 * *filtered* category page drops the filter (goes to the unfiltered
 * category in the other locale) rather than preserving it -- a minor,
 * deliberate, documented gap, not a bug.
 */
export default function LanguageSwitcher() {
  const t = useTranslations("Header");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  // Only two locales exist (routing.locales), so "the other one" is a
  // plain toggle -- no need for a dropdown/select, matching the task's
  // own "toggle/button" framing rather than a multi-option menu.
  const otherLocale = routing.locales.find((l) => l !== locale) ?? locale;

  function switchLocale() {
    router.replace(pathname, { locale: otherLocale });
  }

  return (
    <button
      type="button"
      onClick={switchLocale}
      aria-label={
        otherLocale === "ar" ? t("switchToArabic") : t("switchToEnglish")
      }
      // Prompt 108: back to the pre-107 black-bar pairing. Border
      // border-brand-black/60 -> border-brand-gold/60 -- checked
      // properly (not linearly scaled): gold at 60% opacity over black
      // = effective rgb(132,109,82), luminance 0.165, contrast vs.
      // black = 4.30:1, clearing the 3:1 non-text/border floor (matches
      // HeaderClient.tsx's own Quote-pill-border math for the identical
      // blend). Text text-brand-black -> text-brand-gold (this
      // component's base text color; 11.1:1 against black, real math on
      // HeaderClient.tsx's own top comment). Hover: still no text-color
      // change (same reasoning as always -- a hover text color would
      // either collide with the new base or need a shade that tests
      // poorly, so the border alone keeps carrying the hover signal):
      // border-brand-gold/60 -> hover:border-brand-gold (brightens to
      // full). Deliberately still WITHOUT Quote's heavier hover
      // invert-to-solid-fill -- this remains the quieter, secondary-
      // utility treatment it's always been.
      // Sizing UNCHANGED from Prompt 107 (out of this prompt's scope):
      // mobile-only px-2 (lg:px-3) stays exactly as Prompt 107 left it.
      className="rounded-full border border-brand-gold/60 px-2 py-1 text-xs font-semibold tracking-wide text-brand-gold uppercase transition-colors hover:border-brand-gold lg:px-3"
    >
      {locale}
    </button>
  );
}
