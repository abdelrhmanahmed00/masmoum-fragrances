import Image from "next/image";
import { Link } from "@/i18n/navigation";
import AddToQuoteButton from "./AddToQuoteButton";

type ProductCardProps = {
  id: string;
  slug: string;
  /** Already localized, for display (title text + image alt). */
  name: string;
  /** Both languages, passed straight through to AddToQuoteButton so the
   *  quote line item can be displayed in either locale later without a
   *  re-fetch — see types/quote.ts. */
  name_en: string;
  name_ar: string;
  categoryLabel: string | null;
  /** Same category, both languages -- passed straight through to
   *  AddToQuoteButton (Prompt 19) for the quote line item's snapshot,
   *  same reasoning as name_en/name_ar above. `categoryLabel` above stays
   *  as the already-localized string this card itself displays. */
  categoryName: { en: string; ar: string } | null;
  imageUrl: string | null;
  defaultSize: { id: string; label: string } | null;
  /** null = unlimited/always available; 0 = sold out (Prompt 28). Any
   *  other positive number behaves identically to null on this card --
   *  publicly we only ever show a binary available/sold-out signal, not
   *  the exact count (a B2B wholesale site showing exact stock to
   *  competitors browsing the public catalog isn't desirable, and
   *  nothing in the spec asked for it). */
  stockQuantity: number | null;
  /** Pre-localized, passed down the same way `name`/`categoryLabel`
   *  already are -- this component has no "use client"/useTranslations
   *  of its own (see the comment below) and is shared between server
   *  pages (getTranslations) and a client component (ProductTabs.tsx,
   *  useTranslations), so translation happens upstream, not here. */
  soldOutLabel: string;
};

// No "use client" here: it has no hooks of its own. It's fine that it's
// imported by ProductTabs.tsx (a client component) — the "Add to Quote"
// button's interactivity is isolated in its own small client component
// (AddToQuoteButton) rather than forcing this whole presentational card
// to own that boundary.
export default function ProductCard({
  id,
  slug,
  name,
  name_en,
  name_ar,
  categoryLabel,
  categoryName,
  imageUrl,
  defaultSize,
  stockQuantity,
  soldOutLabel,
}: ProductCardProps) {
  const isSoldOut = stockQuantity === 0;
  return (
    <article className="flex h-full flex-col overflow-hidden rounded-card bg-brand-white shadow-card">
      <Link
        href={`/products/${slug}`}
        className="relative block aspect-square bg-brand-surface"
      >
        {isSoldOut ? (
          <span className="absolute start-2 top-2 z-10 rounded-full bg-brand-black px-2 py-0.5 text-xs font-medium text-brand-white">
            {soldOutLabel}
          </span>
        ) : null}
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={name}
            fill
            sizes="(min-width: 1024px) 25vw, 50vw"
            className="object-cover"
          />
        ) : (
          // Clean placeholder graphic — a product should always have a
          // primary image once data entry is done properly, but this
          // must not crash if one somehow doesn't.
          <div className="flex h-full w-full items-center justify-center text-brand-gray">
            <svg
              viewBox="0 0 24 24"
              className="h-10 w-10"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 16.5V6a1 1 0 011-1h16a1 1 0 011 1v12a1 1 0 01-1 1H4a1 1 0 01-1-1zm0 0l6-6 4 4 3-3 5 5"
              />
              <circle cx="8" cy="8" r="1.5" />
            </svg>
          </div>
        )}
      </Link>

      <div className="flex flex-1 flex-col items-center gap-1 p-4 text-center">
        {categoryLabel ? (
          <p className="text-xs tracking-wide text-brand-gray uppercase">
            {categoryLabel}
          </p>
        ) : null}
        <Link
          href={`/products/${slug}`}
          className="text-sm font-medium text-brand-black hover:text-brand-gray"
        >
          {name}
        </Link>
        <div className="mt-3 w-full">
          <AddToQuoteButton
            productId={id}
            productSlug={slug}
            productNameEn={name_en}
            productNameAr={name_ar}
            categoryNameEn={categoryName?.en ?? null}
            categoryNameAr={categoryName?.ar ?? null}
            imageUrl={imageUrl}
            sizeId={defaultSize?.id ?? null}
            sizeLabel={defaultSize?.label ?? null}
            disabled={isSoldOut}
          />
        </div>
      </div>
    </article>
  );
}
