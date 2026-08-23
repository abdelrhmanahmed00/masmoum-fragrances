import { setRequestLocale, getTranslations } from "next-intl/server";
import ProductCard from "@/components/product/ProductCard";
import { getAllActiveProducts } from "@/lib/catalog";

// Sibling to app/[locale]/(marketing)/products/[slug]/page.tsx -- a static
// segment (this file) and a dynamic segment ([slug]) coexisting under the
// same parent is a standard, unambiguous Next.js App Router pattern: the
// static path always resolves to this file for the exact literal "/products"
// URL, [slug] only ever matches anything else under /products/*. Confirmed
// by the build output (see the Prompt 25 report), not just assumed.
//
// Same ISR/no-filters reasoning as /collections/[slug] (see that page's own
// comment): no searchParams read, so this stays a plain static/ISR page.
// No gender/collection filters here either, for the same reason the
// collections page has none -- this project's filter design is asymmetric
// (gender + collection filters live on category pages only, per Prompt 9's
// original decision); this page is the unfiltered baseline view, matching
// exactly what the homepage's own capped "All" tab shows, just uncapped.
//
// Literal 3600, not an import -- route segment config exports must be
// static literals (see the category page's comment, Prompt 11, for the
// full explanation), kept in sync manually with REVALIDATE_SECONDS.category.
export const revalidate = 3600;

export default async function AllProductsPage({
  params,
}: PageProps<"/[locale]/products">) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("Products");
  const products = await getAllActiveProducts();

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

      {products.length === 0 ? (
        <div className="py-16 text-center text-brand-gray">
          <p>{t("emptyState")}</p>
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
