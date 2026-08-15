import { defineRouting } from "next-intl/routing";

/**
 * Single source of truth for supported locales and locale-based routing.
 * English is the default (unprefixed-friendly) locale; Arabic is secondary
 * and drives RTL layout in app/[locale]/layout.tsx.
 */
export const routing = defineRouting({
  locales: ["en", "ar"],
  defaultLocale: "en",
});

export type AppLocale = (typeof routing.locales)[number];
