import { notFound } from "next/navigation";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { getProductBySlug, getActiveProductSlugs } from "@/lib/catalog";
import { getPublicStorageUrl } from "@/lib/supabase/storage";
import ProductGallery from "@/components/product/ProductGallery";
import ProductPurchasePanel from "@/components/product/ProductPurchasePanel";
import AccordionItem from "@/components/product/AccordionItem";

// Slug-based, no searchParams -- same static-friendly shape as
// /collections/[slug] (Prompt 11), so this is a plain SSG/ISR page, not
// forced dynamic. Literal 3600, not an import: route segment config
// exports must be static literals Next.js can parse without executing the
// module graph (see the category page's comment, Prompt 11, for the full
// explanation and the build error this avoids) -- kept in sync manually
// with REVALIDATE_SECONDS.product in lib/config.ts.
export const revalidate = 3600;

export async function generateStaticParams() {
  const products = await getActiveProductSlugs();
  return products.map((p) => ({ slug: p.slug }));
}

export default async function ProductPage({
  params,
}: PageProps<"/[locale]/products/[slug]">) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const product = await getProductBySlug(slug);
  if (!product) notFound();

  const t = await getTranslations("ProductDetail");

  const images = product.images.map((img) => ({
    url: getPublicStorageUrl("product-images", img.storagePath),
    sortOrder: img.sortOrder,
  }));

  const name = locale === "ar" ? product.name_ar : product.name_en;
  const description =
    locale === "ar" ? product.description_ar : product.description_en;
  const categoryLabel = product.categoryName
    ? locale === "ar"
      ? product.categoryName.ar
      : product.categoryName.en
    : null;
  const topNotes =
    locale === "ar"
      ? product.fragrance_top_notes_ar
      : product.fragrance_top_notes_en;
  const middleNotes =
    locale === "ar"
      ? product.fragrance_middle_notes_ar
      : product.fragrance_middle_notes_en;
  const baseNotes =
    locale === "ar"
      ? product.fragrance_base_notes_ar
      : product.fragrance_base_notes_en;
  const hasNotes = Boolean(topNotes || middleNotes || baseNotes);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 md:py-12 lg:px-8">
      <div className="grid grid-cols-1 gap-8 md:grid-cols-2 md:gap-12">
        <ProductGallery images={images} productName={name} />

        <div>
          {categoryLabel ? (
            <p className="text-xs tracking-wide text-brand-gray uppercase">
              {categoryLabel}
            </p>
          ) : null}

          <h1 className="mt-1 text-2xl font-medium text-brand-black md:text-3xl">
            {name}
          </h1>

          {/* NO price shown anywhere on this page -- wholesale price on
              request only, per the project's core requirement. */}

          {product.moq ? (
            <p className="mt-2 text-sm text-brand-gray">
              {t("moq", { count: product.moq })}
            </p>
          ) : null}

          <ProductPurchasePanel
            productId={product.id}
            productSlug={product.slug}
            productNameEn={product.name_en}
            productNameAr={product.name_ar}
            categoryName={product.categoryName}
            imageUrl={images[0]?.url ?? null}
            sizes={product.sizes}
          />

          <div className="mt-8">
            {description ? (
              <AccordionItem title={t("description")} defaultOpen>
                <p className="whitespace-pre-line">{description}</p>
              </AccordionItem>
            ) : null}

            {hasNotes ? (
              <AccordionItem title={t("notes")}>
                <div className="space-y-3">
                  {topNotes ? (
                    <div>
                      <p className="font-medium text-brand-black">
                        {t("topNotes")}
                      </p>
                      <p>{topNotes}</p>
                    </div>
                  ) : null}
                  {middleNotes ? (
                    <div>
                      <p className="font-medium text-brand-black">
                        {t("middleNotes")}
                      </p>
                      <p>{middleNotes}</p>
                    </div>
                  ) : null}
                  {baseNotes ? (
                    <div>
                      <p className="font-medium text-brand-black">
                        {t("baseNotes")}
                      </p>
                      <p>{baseNotes}</p>
                    </div>
                  ) : null}
                </div>
              </AccordionItem>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
