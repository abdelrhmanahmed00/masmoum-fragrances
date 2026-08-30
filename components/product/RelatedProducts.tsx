import { getLocale, getTranslations } from "next-intl/server";
import ProductCard from "./ProductCard";
import type { ProductCardData } from "@/types/product";

/**
 * "You May Also Like" (Prompt 75) — the product detail page's own
 * server-fetched `products` prop, rendered here rather than inline in
 * that page: keeps the page's own body focused on the current product,
 * and mirrors this project's existing pattern of a dedicated section
 * component per homepage/listing block (ProductsSection.tsx,
 * VideosSection.tsx) rather than growing one page file indefinitely.
 *
 * No "use client" — this has no interactivity of its own; ProductCard's
 * own "Add to Quote" button already isolates its client boundary
 * (AddToQuoteButton), same reasoning ProductCard's own file comment
 * gives for why IT doesn't need "use client" either.
 *
 * Renders nothing at all when `products` is empty — the product detail
 * page relies on this (doesn't check emptiness itself) so there's a
 * single place that decides "is there anything to show", not two.
 */
export default async function RelatedProducts({
  products,
}: {
  products: ProductCardData[];
}) {
  if (products.length === 0) return null;

  const locale = await getLocale();
  const t = await getTranslations("ProductDetail");
  // Same soldOut/unavailable vocabulary every OTHER product grid on the
  // site already uses (ProductTabs.tsx, /products, /categories/[slug])
  // -- this is fundamentally the same kind of grid, not tied to this
  // page's own single-product ProductDetail.soldOut/unavailable strings
  // (which exist for a different purpose, ProductPurchasePanel's own
  // disabled state messaging).
  const tProducts = await getTranslations("Products");

  return (
    <section className="mt-16">
      {/* Prompt 76: same gold-highlight-behind-heading technique built in
          Prompt 60 for "Our Products" (ProductsSection.tsx) -- reused
          verbatim (full derivation lives in that file's own comment).
          Applies unchanged: this heading already used the identical type
          scale (text-2xl font-medium md:text-3xl, copied from
          ProductsSection.tsx in Prompt 75), so the /40 opacity and
          0.55em/10% sizing need no adjustment.
          Wrap check: "You May Also Like" is 18 characters; the same
          ~0.55em-per-character estimate Prompt 60 used gives ~9.9em
          (~238px at 24px) -- fits comfortably under a 320px viewport's
          available width after the product detail page's own px-4
          gutter. Arabic "قد يعجبك أيضًا" is shorter still. */}
      <h2 className="mb-8 text-center text-2xl font-medium text-brand-black md:text-3xl">
        <span className="relative inline-block">
          <span
            aria-hidden="true"
            className="absolute inset-x-0 bottom-[10%] -z-10 h-[0.55em] bg-brand-gold/40"
          />
          {t("relatedHeading")}
        </span>
      </h2>
      {/* Same grid classes as ProductsSection.tsx/ProductTabs.tsx and
          every other product listing (Prompts 9/11/25) -- reused
          verbatim, not a new grid invented for this section. */}
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
            soldOutLabel={tProducts("soldOut")}
            unavailableLabel={tProducts("unavailable")}
          />
        ))}
      </div>
    </section>
  );
}
