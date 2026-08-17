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
  // Tagged "categories" too -- PRODUCT_CARD_SELECT embeds category data
  // via a join, so a category rename needs the homepage tabs invalidated
  // the same as an actual category-table read (see the Prompt 23 report).
  const supabase = createPublicClient(REVALIDATE_SECONDS.category, [
    "categories",
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
    // FLAGGED GAP (Prompt 24, explicit per its own task item 3): there is
    // no site-wide "/products" listing page, and building one isn't part
    // of this fix. Rather than link "See more" at a route that 404s (the
    // previous, pre-existing "/products" placeholder), this is null --
    // ProductTabs will render NO "See more" link for "All" even once
    // there are more than PAGE_SIZE active products. Needs a real
    // decision later: either build a genuine all-products listing page,
    // or decide "All" should stay capped at PAGE_SIZE with no way to see
    // the rest.
    seeMoreHref: null,
  };
}

async function getCategoryTab(category: {
  id: string;
  slug: string;
  name_en: string;
  name_ar: string;
}): Promise<ProductTabData> {
  // Tagged "categories" too -- same reasoning as getAllProductsTab above.
  const supabase = createPublicClient(REVALIDATE_SECONDS.category, [
    "categories",
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
      <h2 className="mb-8 text-center text-2xl font-medium text-brand-black md:text-3xl">
        {t("heading")}
      </h2>
      <ProductTabs tabs={tabs} />
    </section>
  );
}
