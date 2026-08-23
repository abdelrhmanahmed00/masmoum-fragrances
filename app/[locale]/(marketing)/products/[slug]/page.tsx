import { notFound } from "next/navigation";
import { setRequestLocale, getTranslations } from "next-intl/server";
import {
  getProductBySlug,
  getActiveProductSlugs,
  getRelatedProducts,
} from "@/lib/catalog";
import { getPublicStorageUrl } from "@/lib/supabase/storage";
import ProductGallery from "@/components/product/ProductGallery";
import ProductPurchasePanel from "@/components/product/ProductPurchasePanel";
import AccordionItem from "@/components/product/AccordionItem";
import MetaViewContentTracker from "@/components/product/MetaViewContentTracker";
import RelatedProducts from "@/components/product/RelatedProducts";

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

  // "You May Also Like" (Prompt 75) -- depends on product.categoryId, so
  // this can't be parallelized with the getProductBySlug call above (the
  // category to search by isn't known until that resolves). Renders
  // nothing at all when empty (RelatedProducts.tsx's own job, not
  // checked here) -- covers both "product has no category" and "no
  // OTHER active products in this category" the same way, gracefully.
  const relatedProducts = await getRelatedProducts({
    categoryId: product.categoryId,
    excludeProductId: product.id,
  });

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
    // Prompt 57 split this into pb-8/pt-header-offset/md:pb-12 to clear
    // the header's then-`fixed` positioning. Prompt 63 merged it back to
    // plain py-8/md:py-12 when the header reverted to `sticky`. Prompt 70
    // splits it out again -- the header is `fixed` once more (for
    // hide-on-scroll-down/show-on-scroll-up). Prompt 73: pt-header-offset
    // lg:pt-header-offset-lg -- the two EXACT per-breakpoint header
    // heights, no rounding (globals.css has the full arithmetic) --
    // pb-8/md:pb-12 keeps this page's own bottom rhythm (kept distinct
    // from the other marketing pages' py-12/md:py-16, exactly as it's
    // been since before Prompt 57 first touched it). Prompt 84: the same
    // two classes still apply unchanged -- the header's real per-width,
    // per-direction height is now handled by extra CSS cascade rules on
    // these same tokens in globals.css, not by new classes here.
    <div className="mx-auto max-w-6xl px-4 pb-8 pt-header-offset lg:pt-header-offset-lg md:pb-12 lg:px-8">
      {/* Meta Pixel ViewContent (Prompt 47) -- fires once per real page
          view, using whatever name this locale actually rendered (so
          Meta's own reporting UI reflects what the visitor saw), not
          always the English name regardless of locale. Renders nothing;
          a no-op when the pixel itself isn't configured (see the
          component's own comment). */}
      <MetaViewContentTracker productId={product.id} productName={name} />
      {/* Prompt 84 -- extra breathing room ABOVE the gallery specifically,
          stacked on top of (not replacing) the pt-header-offset* padding
          above, which only clears the header with zero deliberate slack
          (by design -- other pages, and the homepage Hero, all rely on
          that same exact-clearance behavior; that shared token itself
          stays untouched here). This is the OPPOSITE of the homepage
          Hero's intentional flush-against-header design (Prompt 73/84) --
          a deliberate per-page addition, not a correction to the shared
          offset. mt-8 md:mt-12 chosen to mirror this page's own existing
          pb-8/md:pb-12 bottom rhythm (visible a few lines up) rather than
          inventing an unrelated new spacing value -- top and bottom of
          this page's main content now breathe by the same amount. */}
      <div className="mt-8 grid grid-cols-1 gap-8 md:mt-12 md:grid-cols-2 md:gap-12">
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
            stockQuantity={product.stockQuantity}
            moq={product.moq}
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

      {/* "You May Also Like" (Prompt 75) -- a sibling of the two-column
          gallery/details grid above (not nested inside it), so it spans
          the full page width rather than being confined to the right
          column. Below the accordion sections, at the bottom of the
          page, per the task's own placement spec. */}
      <RelatedProducts products={relatedProducts} />
    </div>
  );
}
