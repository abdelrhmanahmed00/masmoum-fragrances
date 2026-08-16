import { getTranslations } from "next-intl/server";
import { createPublicClient } from "@/lib/supabase/server";
import { getPublicStorageUrl } from "@/lib/supabase/storage";
import { REVALIDATE_SECONDS } from "@/lib/config";
import ProductTabs from "@/components/product/ProductTabs";
import type { ProductCardData, ProductTabData } from "@/types/product";

const PAGE_SIZE = 8;

type RawCategory = { name_en: string; name_ar: string } | null;
type RawImage = { storage_path: string; is_primary: boolean };
type RawProduct = {
  id: string;
  slug: string;
  name_en: string;
  name_ar: string;
  category: RawCategory;
  images: RawImage[];
};

const PRODUCT_SELECT =
  "id, slug, name_en, name_ar, category:categories(name_en, name_ar), images:product_images(storage_path, is_primary)";

function toCardData(product: RawProduct): ProductCardData {
  // Primary image, falling back to the first available image, falling
  // back to null (ProductCard renders a placeholder graphic in that case
  // rather than crashing — shouldn't happen once data entry is done
  // properly, but a product could theoretically have zero images).
  const primaryImage =
    product.images.find((img) => img.is_primary) ?? product.images[0] ?? null;

  return {
    id: product.id,
    slug: product.slug,
    name_en: product.name_en,
    name_ar: product.name_ar,
    // category can legitimately come back null even though category_id is
    // NOT NULL in the DB: if the category itself is is_active = false, the
    // categories RLS policy hides it from this embed. Handled as an
    // optional field, not an error.
    categoryName: product.category
      ? { en: product.category.name_en, ar: product.category.name_ar }
      : null,
    imageUrl: primaryImage
      ? getPublicStorageUrl("product-images", primaryImage.storage_path)
      : null,
  };
}

async function getAllProductsTab(): Promise<ProductTabData> {
  const supabase = createPublicClient(REVALIDATE_SECONDS.category);
  const { data, error, count } = await supabase
    .from("products")
    .select(PRODUCT_SELECT, { count: "exact" })
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .range(0, PAGE_SIZE - 1);

  const products =
    error || !data ? [] : data.map((p) => toCardData(p as unknown as RawProduct));

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
    .select(`${PRODUCT_SELECT}, product_collections!inner(collection_id)`, {
      count: "exact",
    })
    .eq("is_active", true)
    .eq("product_collections.collection_id", collection.id)
    .order("sort_order", { ascending: true })
    .range(0, PAGE_SIZE - 1);

  const products =
    error || !data ? [] : data.map((p) => toCardData(p as unknown as RawProduct));

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
