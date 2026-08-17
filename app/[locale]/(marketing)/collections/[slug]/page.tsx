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
    <div className="mx-auto max-w-7xl px-4 py-12 md:py-16 lg:px-8">
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
              imageUrl={product.imageUrl}
              defaultSize={product.defaultSize}
              stockQuantity={product.stockQuantity}
              soldOutLabel={t("soldOut")}
            />
          ))}
        </div>
      )}
    </div>
  );
}
