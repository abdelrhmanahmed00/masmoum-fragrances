import { notFound } from "next/navigation";
import { setRequestLocale, getTranslations } from "next-intl/server";
import ProductCard from "@/components/product/ProductCard";
import FilterGroup from "@/components/product/FilterGroup";
import PerfumeGenderTemplate from "@/components/category/PerfumeGenderTemplate";
import {
  getCategoryBySlug,
  getCollectionBySlug,
  getBrandBySlug,
  getActiveCategorySlugs,
  getActiveCollectionsList,
  getBrandsWithActiveProductsInCategory,
  getCategoryProducts,
  parseGenderParam,
  VALID_GENDERS,
} from "@/lib/catalog";

// ISR per lib/config.ts's plan: pre-rendered for every known active
// category slug (generateStaticParams below) and revalidated on this
// interval. The route also reads searchParams (for filters), which Next.js
// can't fully pre-render ahead of time (no PPR/cacheComponents enabled in
// this project — see next.config.ts) — the *page* therefore renders
// per-request when a query string is present, but the underlying Supabase
// query itself still goes through createPublicClient's revalidate-tagged
// fetch, so repeated requests for the same filter combination are still
// served from Next's fetch cache rather than hitting Supabase again. See
// the Prompt 11 report for the build-output verification of this.
//
// Route segment config exports must be static literals Next.js can parse
// without executing the module graph — `export const revalidate =
// REVALIDATE_SECONDS.category` (an imported value) fails the build with
// "Invalid segment configuration export detected". 3600 is that constant's
// current value (lib/config.ts) — kept in sync manually since it can't be
// imported here.
export const revalidate = 3600;

export async function generateStaticParams() {
  const categories = await getActiveCategorySlugs();
  return categories.map((c) => ({ slug: c.slug }));
}

export default async function CategoryPage({
  params,
  searchParams,
}: PageProps<"/[locale]/categories/[slug]">) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const sp = await searchParams;

  const category = await getCategoryBySlug(slug);
  if (!category) notFound();

  const t = await getTranslations("Products");
  const name = locale === "ar" ? category.name_ar : category.name_en;
  const basePath = `/categories/${slug}`;

  const gender = parseGenderParam(sp.gender);

  // Gender filter is meaningful for Perfumes only, per the project
  // requirement -- not shown (and not applied, even if present in the
  // URL) on categories like Home Fragrance where it doesn't apply.
  const showGenderFilter = category.slug === "perfumes";

  // Prompt 127 (Phase 3) -- the special Perfumes-only sub-template: no
  // gender param at all yet (a fresh visit to /categories/perfumes)
  // renders the 3-tile Men/Women/Unisex picker INSTEAD of the normal
  // filters+grid, and fetches NOTHING product/collection/brand-related --
  // this stage shows no products, per the task's own spec, so there's
  // nothing for those queries to do yet. Scoped by `showGenderFilter`
  // (i.e. category.slug === "perfumes"), so every other category page
  // never even evaluates this branch differently than it did before this
  // prompt. Once a real gender value IS present in the URL (any of the 3
  // tiles, or a direct link/bookmark), this condition is false and
  // everything below runs exactly as it already did pre-Prompt-127 --
  // the gender-filtered grid + brand filter row (Phase 2) are PURE
  // navigation targets, no new filtering logic was added to them.
  if (showGenderFilter && !gender) {
    return (
      <div className="mx-auto max-w-7xl px-4 pb-12 pt-header-offset lg:pt-header-offset-lg md:pb-16 lg:px-8">
        <h1 className="mb-8 text-center text-2xl font-medium text-brand-black md:text-3xl">
          {name}
        </h1>
        <PerfumeGenderTemplate basePath={basePath} />
      </div>
    );
  }

  const collectionParam = typeof sp.collection === "string" ? sp.collection : undefined;
  const brandParam = typeof sp.brand === "string" ? sp.brand : undefined;
  const [selectedCollection, selectedBrand] = await Promise.all([
    collectionParam ? getCollectionBySlug(collectionParam) : Promise.resolve(null),
    brandParam ? getBrandBySlug(brandParam) : Promise.resolve(null),
  ]);

  const [products, collections, brands] = await Promise.all([
    getCategoryProducts({
      categoryId: category.id,
      gender: showGenderFilter ? gender : undefined,
      collectionId: selectedCollection?.id ?? null,
      brandId: selectedBrand?.id ?? null,
    }),
    getActiveCollectionsList(),
    // Prompt 126 (Phase 2) -- category-SCOPED, not
    // getBrandsWithActiveProducts' site-wide list (that's /products' own
    // function, reused as-is there, untouched here).
    getBrandsWithActiveProductsInCategory(category.id),
  ]);

  const hasFilters = Boolean(
    (showGenderFilter && gender) || selectedCollection || selectedBrand
  );

  return (
    // Prompt 57 split this into pb-12/pt-header-offset/md:pb-16 -- the
    // header had switched from `sticky` to `fixed`. Prompt 63 merged it
    // back to plain py-12/md:py-16 when the header reverted to `sticky`.
    // Prompt 70 splits it out again -- the header is `fixed` once more
    // (for hide-on-scroll-down/show-on-scroll-up). Prompt 73:
    // pt-header-offset lg:pt-header-offset-lg -- the two EXACT
    // per-breakpoint header heights, no rounding (globals.css has the
    // full arithmetic) -- pb-12/md:pb-16 keeps the original bottom
    // rhythm.
    <div className="mx-auto max-w-7xl px-4 pb-12 pt-header-offset lg:pt-header-offset-lg md:pb-16 lg:px-8">
      <h1 className="mb-8 text-center text-2xl font-medium text-brand-black md:text-3xl">
        {name}
      </h1>

      {showGenderFilter || collections.length > 0 || brands.length > 0 ? (
        <div className="mb-8 flex flex-wrap items-center justify-center gap-x-8 gap-y-4">
          {/* Prompt 126 (Phase 2) -- placed FIRST in this row, ahead of
              the pre-existing gender/collection filters: it reuses
              FilterGroup's bolder "pill" variant (ProductTabs.tsx's own
              bordered-pill look, same as /products' own brand filter,
              Prompt 87), which visually reads as more prominent than the
              plainer "filled" gender/collection filters next to it --
              leading with the visually-heavier control creates a
              deliberate hierarchy (brand first, then the finer-grained
              gender/collection refinements) rather than an arbitrary
              order. The existing filters' own appearance/order relative
              to EACH OTHER is completely untouched. */}
          {brands.length > 0 ? (
            <FilterGroup
              label={t("brandLabel")}
              allLabel={t("allBrands")}
              basePath={basePath}
              paramKey="brand"
              currentValue={brandParam}
              options={brands.map((brand) => ({
                value: brand.slug,
                label: locale === "ar" ? brand.name_ar : brand.name_en,
              }))}
              preserveParams={{ gender, collection: collectionParam }}
              variant="pill"
            />
          ) : null}

          {showGenderFilter ? (
            <FilterGroup
              label={t("genderLabel")}
              allLabel={t("allGenders")}
              basePath={basePath}
              paramKey="gender"
              currentValue={gender}
              options={VALID_GENDERS.map((g) => ({
                value: g,
                label: t(`gender.${g}`),
              }))}
              preserveParams={{ collection: collectionParam, brand: brandParam }}
            />
          ) : null}

          {collections.length > 0 ? (
            <FilterGroup
              label={t("collectionLabel")}
              allLabel={t("allCollections")}
              basePath={basePath}
              paramKey="collection"
              currentValue={collectionParam}
              options={collections.map((c) => ({
                value: c.slug,
                label: locale === "ar" ? c.name_ar : c.name_en,
              }))}
              preserveParams={{ gender, brand: brandParam }}
            />
          ) : null}
        </div>
      ) : null}

      {products.length === 0 ? (
        <div className="py-16 text-center text-brand-gray">
          <p>{hasFilters ? t("noFilterResults") : t("emptyState")}</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
          {products.map((product) => (
            <ProductCard
              key={product.id}
              id={product.id}
              slug={product.slug}
              name={locale === "ar" ? product.name_ar : product.name_en}
              name_en={product.name_en}
              name_ar={product.name_ar}
              categoryLabel={
                product.categoryName
                  ? locale === "ar"
                    ? product.categoryName.ar
                    : product.categoryName.en
                  : null
              }
              categoryName={product.categoryName}
              brandLabel={
                product.brandName
                  ? locale === "ar"
                    ? product.brandName.ar
                    : product.brandName.en
                  : null
              }
              imageUrl={product.imageUrl}
              defaultSize={product.defaultSize}
              stockQuantity={product.stockQuantity}
              moq={product.moq}
              soldOutLabel={t("soldOut")}
              unavailableLabel={t("unavailable")}
            />
          ))}
        </div>
      )}
    </div>
  );
}
