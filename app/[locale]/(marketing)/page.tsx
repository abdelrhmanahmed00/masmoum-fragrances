import { setRequestLocale } from "next-intl/server";
import Hero from "@/components/home/Hero";
import ProductsSection from "@/components/home/ProductsSection";

// setRequestLocale is required here (not just in the root layout) because
// this page's subtree (ProductsSection) calls getTranslations. Without it,
// next-intl reads the locale through an async, request-bound path that
// forces the whole route to opt out of static rendering — confirmed by
// bisecting this exact regression: adding ProductsSection turned /[locale]
// from "● SSG" into "ƒ Dynamic" in the build output, and it was resolved
// by adding this call, matching next-intl's documented static-rendering
// requirement to call setRequestLocale in every segment that reads the
// locale, not only the layout. See lib/config.ts for why staying static/
// ISR (not dynamic-per-request) matters here.
//
// Rest of the homepage (videos section, etc.) still placeholder — see
// Prompt 9 report.
export default async function HomePage({
  params,
}: PageProps<"/[locale]">) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <>
      <Hero />
      <ProductsSection />
    </>
  );
}
