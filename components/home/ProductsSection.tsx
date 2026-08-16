import { getTranslations } from "next-intl/server";
import { createPublicClient } from "@/lib/supabase/server";
import { REVALIDATE_SECONDS } from "@/lib/config";
import {
  PRODUCT_CARD_SELECT,
  toCardData,
  type RawProductCard,
} from "@/lib/catalog";
import ProductTabs from "@/components/product/ProductTabs";
import type { ProductTabData } from "@/types/product";

// PRODUCT_CARD_SELECT/toCardData used to be duplicated here (Prompt 9) —
// consolidated into lib/catalog.ts as of Prompt 14, which needed to change
// the query/mapping shape (adding each product's default size) in lockstep
// across every card-rendering call site anyway.

const PAGE_SIZE = 8;

async function getAllProductsTab(): Promise<ProductTabData> {
  const supabase = createPublicClient(REVALIDATE_SECONDS.category);
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
    // /products doesn't exist yet (a later prompt) -- same "can 404 for
    // now" allowance already used for Header/Footer nav links.
    seeMoreHref: "/products",
  };
}

async function getCollectionTab(collection: {
  id: string;
  slug: string;
  name_en: string;
  name_ar: string;
}): Promise<ProductTabData> {
  const supabase = createPublicClient(REVALIDATE_SECONDS.category);
  // Queried FROM products (not from product_collections) so `order` and
  // `range` apply directly to products.sort_order -- ordering a *referenced*
  // table only reorders a nested array within one parent row, which isn't
  // what we want here (we want the outer rows, one per product, ordered).
  // product_collections!inner both performs the join and, combined with the
  // .eq below, filters to only products actually in this collection.
  const { data, error, count } = await supabase
    .from("products")
    .select(
      `${PRODUCT_CARD_SELECT}, product_collections!inner(collection_id)`,
      { count: "exact" }
    )
    .eq("is_active", true)
    .eq("product_collections.collection_id", collection.id)
    .order("sort_order", { ascending: true })
    .range(0, PAGE_SIZE - 1);

  const products =
    error || !data
      ? []
      : data.map((p) => toCardData(p as unknown as RawProductCard));

  return {
    id: collection.id,
    label_en: collection.name_en,
    label_ar: collection.name_ar,
    products,
    totalCount: count ?? products.length,
    seeMoreHref: `/collections/${collection.slug}`,
  };
}

async function getActiveCollections() {
  const supabase = createPublicClient(REVALIDATE_SECONDS.category);
  const { data, error } = await supabase
    .from("collections")
    .select("id, slug, name_en, name_ar")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  return error || !data ? [] : data;
}

export default async function ProductsSection() {
  const t = await getTranslations("Products");
  const collections = await getActiveCollections();

  // "All" is always first, always present -- not a collection row itself,
  // just the baseline active-products list. Collection tabs are entirely
  // dynamic: nothing about their names/count is hardcoded here.
  const tabs = await Promise.all([
    getAllProductsTab(),
    ...collections.map((collection) => getCollectionTab(collection)),
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
