import { createPublicClient } from "@/lib/supabase/server";
import { getPublicStorageUrl } from "@/lib/supabase/storage";
import { REVALIDATE_SECONDS } from "@/lib/config";
import type { ProductCardData } from "@/types/product";

// Shared by the category/collection listing pages (this file). Note there
// is some intentional overlap with ProductsSection.tsx's own inline
// product-fetching logic (Prompt 9) — that component is left as-is rather
// than refactored to share this file, to avoid touching already-shipped,
// verified code outside this prompt's stated scope.

const PRODUCT_SELECT =
  "id, slug, name_en, name_ar, category:categories(name_en, name_ar), images:product_images(storage_path, is_primary)";

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

function toCardData(product: RawProduct): ProductCardData {
  const primaryImage =
    product.images.find((img) => img.is_primary) ?? product.images[0] ?? null;

  return {
    id: product.id,
    slug: product.slug,
    name_en: product.name_en,
    name_ar: product.name_ar,
    categoryName: product.category
      ? { en: product.category.name_en, ar: product.category.name_ar }
      : null,
    imageUrl: primaryImage
      ? getPublicStorageUrl("product-images", primaryImage.storage_path)
      : null,
  };
}

export type CategoryRow = {
  id: string;
  slug: string;
  name_en: string;
  name_ar: string;
};

export type CollectionRow = {
  id: string;
  slug: string;
  name_en: string;
  name_ar: string;
};

export const VALID_GENDERS = ["men", "women", "unisex"] as const;
export type ProductGender = (typeof VALID_GENDERS)[number];

/** Narrows an arbitrary searchParams value to a real gender enum value, or
 *  undefined if absent/invalid. Required: `products.gender` is a Postgres
 *  enum, so passing an arbitrary string straight to `.eq()` would throw a
 *  DB error (invalid enum input) instead of just yielding zero rows — a
 *  malformed URL must degrade gracefully, not error. */
export function parseGenderParam(value: unknown): ProductGender | undefined {
  return typeof value === "string" &&
    (VALID_GENDERS as readonly string[]).includes(value)
    ? (value as ProductGender)
    : undefined;
}

export async function getCategoryBySlug(
  slug: string
): Promise<CategoryRow | null> {
  const supabase = createPublicClient(REVALIDATE_SECONDS.category);
  const { data, error } = await supabase
    .from("categories")
    .select("id, slug, name_en, name_ar")
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();

  return error || !data ? null : data;
}

export async function getCollectionBySlug(
  slug: string
): Promise<CollectionRow | null> {
  const supabase = createPublicClient(REVALIDATE_SECONDS.category);
  const { data, error } = await supabase
    .from("collections")
    .select("id, slug, name_en, name_ar")
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();

  return error || !data ? null : data;
}

export async function getActiveCategorySlugs(): Promise<{ slug: string }[]> {
  const supabase = createPublicClient(REVALIDATE_SECONDS.category);
  const { data, error } = await supabase
    .from("categories")
    .select("slug")
    .eq("is_active", true);

  return error || !data ? [] : data;
}

export async function getActiveCollectionSlugs(): Promise<{ slug: string }[]> {
  const supabase = createPublicClient(REVALIDATE_SECONDS.category);
  const { data, error } = await supabase
    .from("collections")
    .select("slug")
    .eq("is_active", true);

  return error || !data ? [] : data;
}

/** All active collections — used as the "filter by collection" option
 *  list on category pages. Not scoped to "has products in this specific
 *  category": simpler, and an irrelevant option just yields the existing
 *  "no products match these filters" empty state rather than needing a
 *  more complex, fragile pre-filter query. */
export async function getActiveCollectionsList(): Promise<CollectionRow[]> {
  const supabase = createPublicClient(REVALIDATE_SECONDS.category);
  const { data, error } = await supabase
    .from("collections")
    .select("id, slug, name_en, name_ar")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  return error || !data ? [] : data;
}

export async function getCategoryProducts({
  categoryId,
  gender,
  collectionId,
}: {
  categoryId: string;
  gender?: ProductGender;
  collectionId?: string | null;
}): Promise<ProductCardData[]> {
  const supabase = createPublicClient(REVALIDATE_SECONDS.category);

  // product_collections!inner(collection_id) is only added to the select
  // when actually filtering by collection -- same join+filter pattern
  // confirmed correct in Prompt 9 (querying FROM products, not FROM
  // product_collections, so `order` applies to the outer rows directly).
  let query = supabase
    .from("products")
    .select(
      collectionId
        ? `${PRODUCT_SELECT}, product_collections!inner(collection_id)`
        : PRODUCT_SELECT
    )
    .eq("is_active", true)
    .eq("category_id", categoryId)
    .order("sort_order", { ascending: true });

  if (gender) query = query.eq("gender", gender);
  if (collectionId) query = query.eq("product_collections.collection_id", collectionId);

  const { data, error } = await query;
  return error || !data
    ? []
    : data.map((p) => toCardData(p as unknown as RawProduct));
}

export async function getCollectionProducts({
  collectionId,
}: {
  collectionId: string;
}): Promise<ProductCardData[]> {
  const supabase = createPublicClient(REVALIDATE_SECONDS.category);
  const { data, error } = await supabase
    .from("products")
    .select(`${PRODUCT_SELECT}, product_collections!inner(collection_id)`)
    .eq("is_active", true)
    .eq("product_collections.collection_id", collectionId)
    .order("sort_order", { ascending: true });

  return error || !data
    ? []
    : data.map((p) => toCardData(p as unknown as RawProduct));
}
