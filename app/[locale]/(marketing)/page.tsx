import { setRequestLocale } from "next-intl/server";
import Hero from "@/components/home/Hero";
import CategoryTemplatesStrip from "@/components/home/CategoryTemplatesStrip";
import ProductsSection from "@/components/home/ProductsSection";
import StatsSection from "@/components/home/StatsSection";

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
// Prompt 77 briefly inserted a ProductsMarquee (decorative image strip)
// between ProductsSection and the video row that used to follow it;
// Prompt 78 removed it entirely (client didn't like it visually). Prompt
// 80 adds StatsSection ("By The Numbers") -- HARDCODED content (client
// explicitly confirmed this is not dashboard-editable, unlike every
// other section here), so it needs no data-fetching wiring the way
// ProductsSection does. The video row itself (VideosSection/
// VideosCarousel) was removed entirely in a later prompt -- it consumed
// the free Vercel Blob quota and its own direct-upload fix was
// abandoned; StatsSection now follows ProductsSection directly.
export default async function HomePage({
  params,
}: PageProps<"/[locale]">) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <>
      <Hero />
      {/* Prompt 125 -- Category Templates Strip (Phase 1). Additive,
          placed directly after Hero and before ProductsSection ("Our
          Products") -- both sections coexist. */}
      <CategoryTemplatesStrip />
      <ProductsSection />
      <StatsSection />
    </>
  );
}
