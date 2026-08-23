import { createPublicClient } from "@/lib/supabase/server";
import { getPublicStorageUrl } from "@/lib/supabase/storage";
import { REVALIDATE_SECONDS } from "@/lib/config";
import { resolveAvailableStock } from "@/lib/stock";
import type { ProductCardData } from "@/types/product";
import type { ProductDetail } from "@/types/product-detail";

// Shared by the category/collection listing pages AND, as of Prompt 14,
// ProductsSection.tsx too (previously an intentional duplicate — see
// Prompt 11's note; consolidated now because Prompt 14 needs to change the
// card query/mapping shape in lockstep everywhere anyway, so the drift
// risk of keeping two copies outweighs the churn of merging them).

export const PRODUCT_CARD_SELECT =
  "id, slug, name_en, name_ar, stock_quantity, moq, category:categories(name_en, name_ar), images:product_images(storage_path, is_primary), sizes:product_sizes(id, size_label, sort_order, is_active, stock_quantity)";

type RawCategory = { name_en: string; name_ar: string } | null;
type RawImage = { storage_path: string; is_primary: boolean };
type RawSize = {
  id: string;
  size_label: string;
  sort_order: number;
  is_active: boolean;
  /** Prompt 33 -- raw, unresolved. resolveAvailableStock (lib/stock.ts)
   *  is what turns this + the product's own stock_quantity into the
   *  actual number that governs a given size. */
  stock_quantity: number | null;
};
export type RawProductCard = {
  id: string;
  slug: string;
  name_en: string;
  name_ar: string;
  stock_quantity: number | null;
  moq: number;
  category: RawCategory;
  images: RawImage[];
  sizes: RawSize[];
};

export function toCardData(product: RawProductCard): ProductCardData {
  const primaryImage =
    product.images.find((img) => img.is_primary) ?? product.images[0] ?? null;

  const defaultSize =
    product.sizes
      .filter((s) => s.is_active)
      .slice()
      .sort((a, b) => a.sort_order - b.sort_order)[0] ?? null;

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
    defaultSize: defaultSize
      ? { id: defaultSize.id, label: defaultSize.size_label }
      : null,
    // Prompt 33: resolved through the DEFAULT size specifically (the one
    // this card's "Add to Quote" actually adds, since cards have no size
    // picker) -- not the raw product.stock_quantity. A card with no sizes
    // at all resolves identically to before (resolveAvailableStock with a
    // null size input just returns the product-level value, or null).
    stockQuantity: resolveAvailableStock(
      product.stock_quantity,
      defaultSize?.stock_quantity ?? null
    ),
    moq: product.moq,
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
  const supabase = createPublicClient(REVALIDATE_SECONDS.category, [
    "categories",
  ]);
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
  // Tagged "collections" (Prompt 26) so an admin edit invalidates this
  // page's own collection-name lookup on demand -- see the Prompt 26
  // report for the full tagging scheme (mirrors Prompt 23's for
  // categories).
  const supabase = createPublicClient(REVALIDATE_SECONDS.category, [
    "collections",
  ]);
  const { data, error } = await supabase
    .from("collections")
    .select("id, slug, name_en, name_ar")
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();

  return error || !data ? null : data;
}

export async function getActiveCategorySlugs(): Promise<{ slug: string }[]> {
  const supabase = createPublicClient(REVALIDATE_SECONDS.category, [
    "categories",
  ]);
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
  // Tagged "collections" too -- this is the filter-pill list on category
  // pages, which must reflect an admin adding/renaming/deactivating a
  // collection immediately, same reasoning as getCollectionBySlug above.
  const supabase = createPublicClient(REVALIDATE_SECONDS.category, [
    "collections",
  ]);
  const { data, error } = await supabase
    .from("collections")
    .select("id, slug, name_en, name_ar")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  return error || !data ? [] : data;
}

/** All active categories, ordered by sort_order — the homepage's product
 *  tabs (Prompt 24; previously collection-driven, see ProductsSection.tsx's
 *  own comment for why that changed). No equivalent existed before this
 *  prompt: getActiveCategorySlugs above returns slugs only (for
 *  generateStaticParams), and getCategoryBySlug is a single-row lookup --
 *  this is the first "full list of active category rows" fetcher, mirroring
 *  getActiveCollectionsList's exact shape above. Tagged "categories" since
 *  this reads the categories table directly (see the Prompt 23 report for
 *  the full tagging scheme). */
export async function getActiveCategoriesList(): Promise<CategoryRow[]> {
  const supabase = createPublicClient(REVALIDATE_SECONDS.category, [
    "categories",
  ]);
  const { data, error } = await supabase
    .from("categories")
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
  // Tagged "categories" (Prompt 23 -- PRODUCT_CARD_SELECT embeds
  // category:categories(name_en, name_ar) via a join) AND "products"
  // (Prompt 27 -- this reads the products table itself, so a product
  // create/edit/delete needs this invalidated too, not just a category
  // rename). See the Prompt 27 report for the full list of call sites
  // that carry "products".
  const supabase = createPublicClient(REVALIDATE_SECONDS.category, [
    "categories",
    "products",
  ]);

  // product_collections!inner(collection_id) is only added to the select
  // when actually filtering by collection -- same join+filter pattern
  // confirmed correct in Prompt 9 (querying FROM products, not FROM
  // product_collections, so `order` applies to the outer rows directly).
  let query = supabase
    .from("products")
    .select(
      collectionId
        ? `${PRODUCT_CARD_SELECT}, product_collections!inner(collection_id)`
        : PRODUCT_CARD_SELECT
    )
    .eq("is_active", true)
    .eq("category_id", categoryId)
    .order("sort_order", { ascending: true });

  if (gender) query = query.eq("gender", gender);
  if (collectionId) query = query.eq("product_collections.collection_id", collectionId);

  const { data, error } = await query;
  return error || !data
    ? []
    : data.map((p) => toCardData(p as unknown as RawProductCard));
}

export async function getCollectionProducts({
  collectionId,
}: {
  collectionId: string;
}): Promise<ProductCardData[]> {
  // Tagged "categories" + "products" -- same reasoning as
  // getCategoryProducts above.
  const supabase = createPublicClient(REVALIDATE_SECONDS.category, [
    "categories",
    "products",
  ]);
  const { data, error } = await supabase
    .from("products")
    .select(`${PRODUCT_CARD_SELECT}, product_collections!inner(collection_id)`)
    .eq("is_active", true)
    .eq("product_collections.collection_id", collectionId)
    .order("sort_order", { ascending: true });

  return error || !data
    ? []
    : data.map((p) => toCardData(p as unknown as RawProductCard));
}

/** Every active product, no category/collection filter -- the site-wide
 *  /products listing page (Prompt 25), which is what the homepage's
 *  "All" tab (Prompt 24) links to. Unbounded (no range/count), same as
 *  getCollectionProducts above and for the same reason: this backs a
 *  full listing page that shows everything, not a capped preview -- the
 *  homepage's own capped "All" tab has its own separate, bounded query
 *  in ProductsSection.tsx (getAllProductsTab) and was deliberately never
 *  built on this function either. */
export async function getAllActiveProducts(): Promise<ProductCardData[]> {
  // Tagged "categories" + "products" -- same reasoning as
  // getCategoryProducts/getCollectionProducts above.
  const supabase = createPublicClient(REVALIDATE_SECONDS.category, [
    "categories",
    "products",
  ]);
  const { data, error } = await supabase
    .from("products")
    .select(PRODUCT_CARD_SELECT)
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  return error || !data
    ? []
    : data.map((p) => toCardData(p as unknown as RawProductCard));
}

export async function getActiveProductSlugs(): Promise<{ slug: string }[]> {
  const supabase = createPublicClient(REVALIDATE_SECONDS.product);
  const { data, error } = await supabase
    .from("products")
    .select("slug")
    .eq("is_active", true);

  return error || !data ? [] : data;
}

const PRODUCT_DETAIL_SELECT = `
  id, slug, name_en, name_ar, description_en, description_ar, gender,
  fragrance_top_notes_en, fragrance_top_notes_ar,
  fragrance_middle_notes_en, fragrance_middle_notes_ar,
  fragrance_base_notes_en, fragrance_base_notes_ar,
  moq, stock_quantity, category_id,
  category:categories(name_en, name_ar),
  images:product_images(storage_path, is_primary, sort_order),
  sizes:product_sizes(id, size_label, sort_order, is_active, stock_quantity)
`;

type RawProductDetail = {
  id: string;
  slug: string;
  name_en: string;
  name_ar: string;
  description_en: string | null;
  description_ar: string | null;
  gender: ProductDetail["gender"];
  fragrance_top_notes_en: string | null;
  fragrance_top_notes_ar: string | null;
  fragrance_middle_notes_en: string | null;
  fragrance_middle_notes_ar: string | null;
  fragrance_base_notes_en: string | null;
  fragrance_base_notes_ar: string | null;
  moq: number;
  stock_quantity: number | null;
  /** Plain FK column, distinct from the joined `category` field below
   *  (which only carries the already-localized name_en/name_ar, Prompt
   *  75's own getRelatedProducts needs the actual id to filter by). */
  category_id: string | null;
  category: RawCategory;
  images: { storage_path: string; is_primary: boolean; sort_order: number }[];
  sizes: {
    id: string;
    size_label: string;
    sort_order: number;
    is_active: boolean;
    stock_quantity: number | null;
  }[];
};

export async function getProductBySlug(
  slug: string
): Promise<ProductDetail | null> {
  // Tagged "categories" (PRODUCT_DETAIL_SELECT embeds category data via a
  // join) + "products" (Prompt 27 -- this IS the product's own detail
  // read, so an edit to this exact product needs it invalidated too).
  const supabase = createPublicClient(REVALIDATE_SECONDS.product, [
    "categories",
    "products",
  ]);
  const { data, error } = await supabase
    .from("products")
    .select(PRODUCT_DETAIL_SELECT)
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();

  if (error || !data) return null;

  const raw = data as unknown as RawProductDetail;

  return {
    id: raw.id,
    slug: raw.slug,
    name_en: raw.name_en,
    name_ar: raw.name_ar,
    description_en: raw.description_en,
    description_ar: raw.description_ar,
    gender: raw.gender,
    fragrance_top_notes_en: raw.fragrance_top_notes_en,
    fragrance_top_notes_ar: raw.fragrance_top_notes_ar,
    fragrance_middle_notes_en: raw.fragrance_middle_notes_en,
    fragrance_middle_notes_ar: raw.fragrance_middle_notes_ar,
    fragrance_base_notes_en: raw.fragrance_base_notes_en,
    fragrance_base_notes_ar: raw.fragrance_base_notes_ar,
    moq: raw.moq,
    stockQuantity: raw.stock_quantity,
    categoryName: raw.category
      ? { en: raw.category.name_en, ar: raw.category.name_ar }
      : null,
    categoryId: raw.category_id,
    images: raw.images
      .slice()
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((img) => ({
        storagePath: img.storage_path,
        isPrimary: img.is_primary,
        sortOrder: img.sort_order,
      })),
    sizes: raw.sizes
      .filter((s) => s.is_active)
      .slice()
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((s) => ({
        id: s.id,
        sizeLabel: s.size_label,
        sortOrder: s.sort_order,
        // Prompt 33: each size resolved independently against the SAME
        // product-level stock_quantity -- this is exactly the "shared
        // pool" semantics: two sizes with no override of their own both
        // resolve to the same product-level number here, on purpose.
        stockQuantity: resolveAvailableStock(
          raw.stock_quantity,
          s.stock_quantity
        ),
      })),
  };
}

// "You May Also Like" (Prompt 75) -- capped to one full row at this
// project's own established grid breakpoint (grid-cols-2 md:grid-cols-4,
// confirmed against ProductsSection.tsx/the category & /products listing
// pages, Prompts 9/11/25 -- reused here, not a new grid invented for
// this section), so 4, not a larger "4-8" number that would leave an
// awkward partial second row on desktop.
const RELATED_PRODUCTS_LIMIT = 4;

/** Other active products in the SAME category as the product currently
 *  being viewed, excluding that product itself. Deliberately NOT built
 *  on top of getCategoryProducts above (which is intentionally
 *  UNBOUNDED, for the full /categories/[slug] listing page) -- this
 *  needs its own bounded, excluding query instead, same "don't force an
 *  unbounded listing function into a capped-preview role" reasoning
 *  ProductsSection.tsx's own getCategoryTab already established for the
 *  homepage's tabs.
 *  categoryId === null (a product with no category assigned) returns []
 *  immediately without querying -- "related by category" is meaningless
 *  with no category to relate by, and the product detail page hides the
 *  whole section when this returns empty (see that page's own comment). */
export async function getRelatedProducts({
  categoryId,
  excludeProductId,
}: {
  categoryId: string | null;
  excludeProductId: string;
}): Promise<ProductCardData[]> {
  if (!categoryId) return [];

  // Tagged "categories" + "products", same reasoning as every other
  // product-reading function in this file (PRODUCT_CARD_SELECT embeds a
  // category join, and this reads the products table directly) --
  // reused, not a new tag invented for this one function.
  const supabase = createPublicClient(REVALIDATE_SECONDS.product, [
    "categories",
    "products",
  ]);
  const { data, error } = await supabase
    .from("products")
    .select(PRODUCT_CARD_SELECT)
    .eq("is_active", true)
    .eq("category_id", categoryId)
    .neq("id", excludeProductId)
    .order("sort_order", { ascending: true })
    .limit(RELATED_PRODUCTS_LIMIT);

  return error || !data
    ? []
    : data.map((p) => toCardData(p as unknown as RawProductCard));
}
