import type { Metadata } from "next";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { getBottleColorImageMap } from "@/lib/bottle-colors";
import BottleDesigner from "@/components/design-your-bottle/BottleDesigner";

// Prompt 131/132 -- Custom Bottle Designer. Own dedicated top-level route
// (sibling to /products, /private-label, /quote, ...), same "a fully
// custom, non-catalog tool gets its own real route" reasoning as
// /private-label's own top comment (Prompt 92) -- not a fit for the
// generic /pages/[slug] Pages CMS (this needs real interactive client
// code, not admin-authored text blocks) and not a fit under /products
// either (it isn't a catalog listing).
//
// No searchParams read -- Phase 2 is a pure client-side visual builder,
// nothing here is driven by the URL (unlike /products or
// /categories/[slug]'s filter params) -- so this stays a plain static/
// ISR page, same discipline as every other searchParams-free marketing
// page in this project (confirmed via the real build output, see this
// prompt's own report).
export const revalidate = 1800; // REVALIDATE_SECONDS.marketing

export const metadata: Metadata = {
  title: "Design Your Own Bottle — Masmoum Fragrances",
};

export default async function DesignYourBottlePage({
  params,
}: PageProps<"/[locale]/design-your-bottle">) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("BottleDesigner");
  const images = await getBottleColorImageMap();

  return (
    <div className="mx-auto max-w-7xl px-4 pb-12 pt-header-offset lg:pt-header-offset-lg md:pb-16 lg:px-8">
      <h1 className="mb-2 text-center text-2xl font-medium text-brand-black md:text-3xl">
        {t("heading")}
      </h1>
      <p className="mb-8 text-center text-sm text-brand-gray">{t("intro")}</p>

      {/* Client component: color selection + drag-positioning are real
          interactive state, this page's Server Component wrapper only
          fetches the 5 real bottle images once and hands them down as a
          plain prop -- same "server fetches, one small client boundary
          owns the interactivity" split as every other server/client pair
          in this project (Footer/FooterContactAccordion,
          Header/HeaderClient, ...). */}
      <BottleDesigner images={images} />
    </div>
  );
}
