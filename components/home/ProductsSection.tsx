import { getTranslations } from "next-intl/server";
import { createPublicClient } from "@/lib/supabase/server";
import { REVALIDATE_SECONDS } from "@/lib/config";
import {
  PRODUCT_CARD_SELECT,
  toCardData,
  getActiveCategoriesList,
  type RawProductCard,
} from "@/lib/catalog";
import ProductTabs from "@/components/product/ProductTabs";
import type { ProductTabData } from "@/types/product";

// PRODUCT_CARD_SELECT/toCardData used to be duplicated here (Prompt 9) —
// consolidated into lib/catalog.ts as of Prompt 14, which needed to change
// the query/mapping shape (adding each product's default size) in lockstep
// across every card-rendering call site anyway.
//
// Prompt 24: tabs are category-driven, not collection-driven (client
// clarification — the reference site's tab-switching *mechanism* was
// always confirmed-correct, per Prompt 9/9's own comment in
// ProductTabs.tsx, which is untouched here; only which data populates it
// changed). Collections themselves are NOT removed or altered anywhere —
// the collections table, /collections/[slug] pages (Prompt 11), and the
// collection-filter pills on category pages (Prompt 11) all stay exactly
// as they were. getActiveCategoriesList is new (lib/catalog.ts) since no
// "full list of active category rows" fetcher existed before this prompt
// (getActiveCategorySlugs returns slugs only, for generateStaticParams).
// getCategoryTab below is deliberately its OWN function rather than reusing
// lib/catalog.ts's existing getCategoryProducts: that function is
// unbounded (no range/count) because the full /categories/[slug] listing
// page needs every matching product, not a capped preview -- the exact
// same reason getCollectionTab (now removed) was never built on top of
// getCollectionProducts either. Reusing PRODUCT_CARD_SELECT/toCardData
// (already imported above) is the actual duplication this avoids;
// duplicating the bounded-vs-unbounded query shape itself would be wrong,
// not lazy.

const PAGE_SIZE = 8;

async function getAllProductsTab(): Promise<ProductTabData> {
  // Tagged "categories" (PRODUCT_CARD_SELECT embeds category data via a
  // join, Prompt 23) + "products" (Prompt 27 -- this reads the products
  // table directly, so a product create/edit/delete must invalidate the
  // homepage tabs too, not just a category rename) + "brands" (Prompt 87
  // -- PRODUCT_CARD_SELECT now also embeds brand:brands(...)).
  const supabase = createPublicClient(REVALIDATE_SECONDS.category, [
    "categories",
    "products",
    "brands",
  ]);
  const { data, error, count } = await supabase
    .from("products")
    .select(PRODUCT_CARD_SELECT, { count: "exact" })
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .range(0, PAGE_SIZE - 1);

  const products =
    error || !data
      ? []
      : data.map((p) => toCardData(p as unknown as RawProductCard));

  return {
    id: "all",
    label_en: null,
    label_ar: null,
    products,
    totalCount: count ?? products.length,
    // Real listing page as of Prompt 25 (app/[locale]/(marketing)/products/
    // page.tsx) -- previously null, a flagged gap from Prompt 24 since no
    // such page existed yet and pointing here would have 404'd.
    seeMoreHref: "/products",
  };
}

async function getCategoryTab(category: {
  id: string;
  slug: string;
  name_en: string;
  name_ar: string;
}): Promise<ProductTabData> {
  // Tagged "categories" + "products" + "brands" -- same reasoning as
  // getAllProductsTab above.
  const supabase = createPublicClient(REVALIDATE_SECONDS.category, [
    "categories",
    "products",
    "brands",
  ]);
  const { data, error, count } = await supabase
    .from("products")
    .select(PRODUCT_CARD_SELECT, { count: "exact" })
    .eq("is_active", true)
    .eq("category_id", category.id)
    .order("sort_order", { ascending: true })
    .range(0, PAGE_SIZE - 1);

  const products =
    error || !data
      ? []
      : data.map((p) => toCardData(p as unknown as RawProductCard));

  return {
    id: category.id,
    label_en: category.name_en,
    label_ar: category.name_ar,
    products,
    totalCount: count ?? products.length,
    // Real listing page, confirmed built (Prompt 11) -- unlike "All"
    // above, this always has somewhere valid to send the visitor.
    seeMoreHref: `/categories/${category.slug}`,
  };
}

export default async function ProductsSection() {
  const t = await getTranslations("Products");
  const categories = await getActiveCategoriesList();

  // "All" is always first, always present -- not a category row itself,
  // just the baseline active-products list. Category tabs are entirely
  // dynamic: nothing about their names/count/order is hardcoded here --
  // the 6 seeded categories plus any added later via Categories CRUD
  // (Prompt 23) all show up automatically, in sort_order.
  const tabs = await Promise.all([
    getAllProductsTab(),
    ...categories.map((category) => getCategoryTab(category)),
  ]);

  return (
    <section className="mx-auto max-w-7xl px-4 py-12 md:py-16 lg:px-8">
      {/* Prompt 60: gold "highlighter" band behind the heading text.
          CONFIRMED real technique from re-inspecting shop-gulforchid.com's
          live inline <style> block (not the theme.css/chunk.css bundles --
          this section's CSS ships inline in the page HTML) for its
          `.vikst-ftabs__heading` rule:

            .vikst-ftabs__heading { position:relative; display:inline-block; z-index:1; }
            .vikst-ftabs__heading span { position:relative; display:inline-block; z-index:1; }
            .vikst-ftabs__heading span::before {
              content:""; position:absolute; left:0; right:0; bottom:10%;
              height:0.55em; background:#E7D4B4; z-index:-1;
            }

          i.e. a plain background-color box (NOT box-decoration-break, NOT
          a linear-gradient, NOT text-shadow/mark) on a ::before positioned
          absolutely inside a `position:relative; display:inline-block`
          span that wraps just the heading text -- so the box is exactly
          text-width, not section-width, and sits behind the glyphs
          (z-index:-1) starting 10% up from the span's own bottom edge and
          rising 0.55em, giving the "highlighter stroke sits mid-letter,
          not a full solid block" look visible in the reference screenshot.
          Replicated 1:1 below via inset-x-0/bottom-[10%]/h-[0.55em] on an
          absolutely-positioned span, `-z-10` so it paints behind the
          sibling text node (in CSS paint order, a negative-z-index
          positioned descendant paints before its ancestor's own in-flow
          content, which a zero/auto z-index would NOT).

          Color: reference uses a hardcoded #E7D4B4 (not their --underline
          gold token, which is the full-strength #dcb689 used for tab/
          border accents elsewhere on their own site). Reverse-solving
          "white blended with #dcb689 at what alpha = #E7D4B4" comes out to
          ~60-65% per channel -- confirming a *tinted*, not full-strength,
          gold is the right family of value, not a literal new color. This
          project has no #E7D4B4-equivalent token and isn't adding one --
          using brand-gold itself at bg-brand-gold/40 (i.e. #dcb689 at 40%
          over the white section background) intentionally lands lighter
          than that ~60% reference-equivalent: a "soft highlight" reads
          right at this heading's smaller size (2xl/3xl vs. the
          reference's 42px), where full-strength brand-gold (already used
          at 100% for borders/pills in the Header/Hero) would look like a
          swatch, not a marker stroke.

          Multi-line wrapping: verified, not assumed. This exact reference
          technique does NOT robustly survive real multi-line wrapping --
          the ::before is one box sized in em units for a single line
          (bottom:10%/height:0.55em are relative to the whole, possibly
          multi-line, inline-block span), so on the reference's own much
          longer "YOUR JOURNEY STARTS HERE" heading at narrow widths this
          would only band the last line, not each line -- box-decoration-
          break isn't in play here, since it isn't a text-level background,
          it's a single absolutely-positioned pseudo-element. That's a real
          limitation of the technique being replicated, not something this
          project needs to work around: t("heading") is "Our Products" (en)
          / "منتجاتنا" (ar) -- the Arabic string is one unbroken word with
          no space/hyphen break opportunity, so it structurally cannot
          wrap to a second line at any width (nothing here sets
          overflow-wrap:anywhere to force mid-word breaks); the English
          string, at this heading's 24px/30px sizing (far smaller than the
          reference's 42px), comfortably fits on one line even at a 320px
          viewport (small margin: ~13 characters * ~0.55em average advance
          for a font-medium sans ≈ 8.25em ≈ 198px at 24px, well under a
          320px viewport minus the section's own px-4 gutters). Confirmed
          via this markup/CSS + typography math, not a live pixel
          measurement -- no headless browser is available in this
          environment to screenshot it; flagged as needing your live visual
          check per the task's own instruction.

          No RTL variant needed on inset-x-0: verified via the real
          compiled CSS that Tailwind v4 emits it as the logical
          `inset-inline:0` (both inline-start and inline-end pinned to 0),
          not physical left/right -- either way it's symmetric, so it's
          direction-agnostic the same way the Header logo's
          left-1/2/-translate-x-1/2 centering was (Prompt 56) -- there is
          no "start/end" asymmetry here for an RTL variant to mirror. */}
      <h2 className="mb-8 text-center text-2xl font-medium text-brand-black md:text-3xl">
        <span className="relative inline-block">
          <span
            aria-hidden="true"
            className="absolute inset-x-0 bottom-[10%] -z-10 h-[0.55em] bg-brand-gold/40"
          />
          {t("heading")}
        </span>
      </h2>
      <ProductTabs tabs={tabs} />
    </section>
  );
}
