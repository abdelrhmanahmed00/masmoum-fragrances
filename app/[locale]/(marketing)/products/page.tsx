import { setRequestLocale, getTranslations } from "next-intl/server";
import ProductCard from "@/components/product/ProductCard";
import FilterGroup from "@/components/product/FilterGroup";
import {
  getAllActiveProducts,
  getBrandBySlug,
  getBrandsWithActiveProducts,
} from "@/lib/catalog";

// Sibling to app/[locale]/(marketing)/products/[slug]/page.tsx -- a static
// segment (this file) and a dynamic segment ([slug]) coexisting under the
// same parent is a standard, unambiguous Next.js App Router pattern: the
// static path always resolves to this file for the exact literal "/products"
// URL, [slug] only ever matches anything else under /products/*. Confirmed
// by the build output (see the Prompt 25 report), not just assumed.
//
// Prompt 87 (Phase B) supersedes this file's own former "no searchParams,
// stays static" comment: gender/collection filters are still deliberately
// absent here (that asymmetry -- filters live on category pages only --
// was Prompt 9's own decision and is untouched), but a BRAND filter is
// now added, per this prompt's explicit task. See the searchParams read
// below for what that does to this route's rendering strategy, and this
// file's own revalidate comment for why the underlying data fetch stays
// ISR-cached regardless.
//
// Literal 3600, not an import -- route segment config exports must be
// static literals (see the category page's comment, Prompt 11, for the
// full explanation), kept in sync manually with REVALIDATE_SECONDS.category.
export const revalidate = 3600;

export default async function AllProductsPage({
  params,
  searchParams,
}: PageProps<"/[locale]/products">) {
  const { locale } = await params;
  setRequestLocale(locale);
  // Prompt 87: reading searchParams here is what actually changes this
  // route's rendering strategy from ● (SSG) to ƒ (Dynamic) -- confirmed
  // via a real build, not assumed. Next.js can't statically pre-render a
  // page whose output depends on an arbitrary query string (no PPR/
  // cacheComponents enabled in this project, see next.config.ts) -- the
  // exact same mechanism, and the exact same tradeoff, already accepted
  // for /categories/[slug] the moment its own gender/collection filters
  // were added (Prompt 24's own precedent). The underlying Supabase reads
  // below still go through createPublicClient's revalidate-tagged fetch
  // (REVALIDATE_SECONDS.category, "brands"/"categories"/"products" tags),
  // so repeated requests for the SAME filter combination are still served
  // from Next's Data Cache rather than hitting Supabase again -- only the
  // page's own HTML render moved from build-time to request-time, not the
  // data layer's own caching.
  const sp = await searchParams;

  const t = await getTranslations("Products");

  const brandParam = typeof sp.brand === "string" ? sp.brand : undefined;
  const [selectedBrand, brands] = await Promise.all([
    brandParam ? getBrandBySlug(brandParam) : Promise.resolve(null),
    getBrandsWithActiveProducts(),
  ]);

  const products = await getAllActiveProducts({
    brandId: selectedBrand?.id ?? null,
  });

  const hasFilters = Boolean(selectedBrand);

  return (
    // Prompt 57 split this into pb-12/pt-header-offset/md:pb-16 to clear
    // the header's then-`fixed` positioning. Prompt 63 merged it back to
    // plain py-12/md:py-16 when the header reverted to `sticky`. Prompt
    // 70 splits it out again -- the header is `fixed` once more (for
    // hide-on-scroll-down/show-on-scroll-up). Prompt 73: pt-header-offset
    // lg:pt-header-offset-lg -- the two EXACT per-breakpoint header
    // heights, no rounding (globals.css has the full arithmetic) --
    // pb-12/md:pb-16 keeps the original bottom rhythm.
    <div className="mx-auto max-w-7xl px-4 pb-12 pt-header-offset lg:pt-header-offset-lg md:pb-16 lg:px-8">
      <h1 className="mb-8 text-center text-2xl font-medium text-brand-black md:text-3xl">
        {t("allProductsHeading")}
      </h1>

      {/* Prompt 87 -- only rendered when there's at least one real filter
          option, same "don't show an empty/pointless filter row" pattern
          the category page already uses for its own gender/collection
          groups. `variant="pill"` reuses ProductTabs.tsx's Prompt 61
          bordered-pill look (see FilterGroup.tsx's own comment for why),
          not this component's original "filled" look -- deliberately
          different from the category page's gender/collection filters,
          which keep their existing appearance untouched. */}
      {brands.length > 0 ? (
        <div className="mb-8 flex flex-wrap items-center justify-center gap-x-8 gap-y-4">
          <FilterGroup
            label={t("brandLabel")}
            allLabel={t("allBrands")}
            basePath="/products"
            paramKey="brand"
            currentValue={brandParam}
            options={brands.map((brand) => ({
              value: brand.slug,
              label: locale === "ar" ? brand.name_ar : brand.name_en,
            }))}
            preserveParams={{}}
            variant="pill"
          />
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
