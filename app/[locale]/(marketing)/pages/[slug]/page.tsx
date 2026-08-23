import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { getPageBySlug, getActivePageSlugs } from "@/lib/pages";
import PageContent from "@/components/pages/PageContent";

// ISR per lib/config.ts's plan -- pre-rendered for every known active
// page slug (generateStaticParams below) and revalidated on this
// interval, same shape as /categories/[slug] and /collections/[slug].
// Literal 3600, not an import -- route segment config exports must be
// static literals (see the category page's own comment for the build
// error this avoids) -- kept in sync manually with
// REVALIDATE_SECONDS.pages in lib/config.ts.
export const revalidate = 3600;

// /pages/[slug] -- a dedicated path segment, not a bare
// /[locale]/[slug] catch-all at the locale root. Chosen specifically so
// this can never collide with an existing or future top-level route:
// /products, /categories, /collections, and /quote already each own
// their own top-level segment name, and any real category/product/
// collection slug lives UNDER one of those segments, never bare at the
// locale root -- so there is no shared slug namespace this could
// collide with either. This mirrors the exact same
// "/<segment>/[slug]" shape those three content types already use
// (/categories/[slug], /collections/[slug], /products/[slug]) rather
// than inventing a new pattern. Extensible for later: a future About or
// Contact page (Prompt 48's flagged 404 gap -- explicitly NOT built this
// prompt) could become another row in the SAME pages table, reachable at
// /pages/about, with zero new code.
export async function generateStaticParams() {
  const pages = await getActivePageSlugs();
  return pages.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/pages/[slug]">): Promise<Metadata> {
  const { locale, slug } = await params;
  const page = await getPageBySlug(slug);
  if (!page) return {};
  const title = locale === "ar" ? page.title_ar : page.title_en;
  return { title: `${title} — Masmoum Fragrances` };
}

export default async function StaticPage({
  params,
}: PageProps<"/[locale]/pages/[slug]">) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const page = await getPageBySlug(slug);
  if (!page) notFound();

  const title = locale === "ar" ? page.title_ar : page.title_en;
  const content = locale === "ar" ? page.content_ar : page.content_en;

  return (
    // Prompt 57 split this into pb-12/pt-header-offset/md:pb-16 to clear
    // the header's then-`fixed` positioning. Prompt 63 merged it back to
    // plain py-12/md:py-16 when the header reverted to `sticky`. Prompt
    // 70 splits it out again -- the header is `fixed` once more (for
    // hide-on-scroll-down/show-on-scroll-up). Prompt 73: pt-header-offset
    // lg:pt-header-offset-lg -- the two EXACT per-breakpoint header
    // heights, no rounding (globals.css has the full arithmetic) --
    // pb-12/md:pb-16 keeps the original bottom rhythm.
    <div className="mx-auto max-w-3xl px-4 pb-12 pt-header-offset lg:pt-header-offset-lg md:pb-16 lg:px-8">
      <h1 className="mb-8 text-2xl font-medium text-brand-black md:text-3xl">
        {title}
      </h1>
      <PageContent content={content} />
    </div>
  );
}
