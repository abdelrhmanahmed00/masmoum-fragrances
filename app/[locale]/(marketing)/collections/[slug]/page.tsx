import { notFound } from "next/navigation";
import { setRequestLocale, getTranslations } from "next-intl/server";
import ProductCard from "@/components/product/ProductCard";
import {
  getCollectionBySlug,
  getActiveCollectionSlugs,
  getCollectionProducts,
} from "@/lib/catalog";

// Same ISR/searchParams reasoning as the category page — see its comment.
// This page has no filters (per the project's asymmetric filter design:
// gender + collection filters live on category pages, not the other way
// around), so it doesn't read searchParams at all and can be a plain
// static/ISR page with no per-request dynamic fallback needed.
//
// Literal 3600, not an import — see the category page's comment on why
// route segment config exports can't reference REVALIDATE_SECONDS.
export const revalidate = 3600;

export async function generateStaticParams() {
  const collections = await getActiveCollectionSlugs();
  return collections.map((c) => ({ slug: c.slug }));
}

export default async function CollectionPage({
  params,
}: PageProps<"/[locale]/collections/[slug]">) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const collection = await getCollectionBySlug(slug);
  if (!collection) notFound();

  const t = await getTranslations("Products");
  const products = await getCollectionProducts({ collectionId: collection.id });
  const name = locale === "ar" ? collection.name_ar : collection.name_en;

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
        {name}
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
