import { notFound } from "next/navigation";
import { setRequestLocale, getTranslations } from "next-intl/server";
import ProductCard from "@/components/product/ProductCard";
import FilterGroup from "@/components/product/FilterGroup";
import {
  getCategoryBySlug,
  getCollectionBySlug,
  getActiveCategorySlugs,
  getActiveCollectionsList,
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

  const gender = parseGenderParam(sp.gender);
  const collectionParam = typeof sp.collection === "string" ? sp.collection : undefined;
  const selectedCollection = collectionParam
    ? await getCollectionBySlug(collectionParam)
    : null;

  // Gender filter is meaningful for Perfumes only, per the project
  // requirement -- not shown (and not applied, even if present in the
  // URL) on categories like Home Fragrance where it doesn't apply.
  const showGenderFilter = category.slug === "perfumes";

  const [products, collections] = await Promise.all([
    getCategoryProducts({
      categoryId: category.id,
      gender: showGenderFilter ? gender : undefined,
      collectionId: selectedCollection?.id ?? null,
    }),
    getActiveCollectionsList(),
  ]);

  const name = locale === "ar" ? category.name_ar : category.name_en;
  const hasFilters = Boolean((showGenderFilter && gender) || selectedCollection);
  const basePath = `/categories/${slug}`;

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 md:py-16 lg:px-8">
      <h1 className="mb-8 text-center text-2xl font-medium text-brand-black md:text-3xl">
        {name}
      </h1>

      {showGenderFilter || collections.length > 0 ? (
        <div className="mb-8 flex flex-wrap items-center justify-center gap-x-8 gap-y-4">
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
              preserveParams={{ collection: collectionParam }}
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
              preserveParams={{ gender }}
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
              imageUrl={product.imageUrl}
              defaultSize={product.defaultSize}
            />
          ))}
        </div>
      )}
    </div>
  );
}
