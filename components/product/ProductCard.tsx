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
  /** Prompt 87 (Phase B) -- already-localized, same shape/convention as
   *  categoryLabel above. null for every product until an admin assigns
   *  a brand (Phase A's own explicit closing state) -- rendered as
   *  nothing at all in that case, not an empty label, see this
   *  component's own body below. */
  brandLabel: string | null;
  imageUrl: string | null;
  defaultSize: { id: string; label: string } | null;
  /** null = unlimited/always available; 0 = sold out (Prompt 28). Any
   *  other positive number behaves identically to null on this card --
   *  publicly we only ever show a binary available/sold-out signal, not
   *  the exact count (a B2B wholesale site showing exact stock to
   *  competitors browsing the public catalog isn't desirable, and
   *  nothing in the spec asked for it). */
  stockQuantity: number | null;
  /** Prompt 29: the MOQ-vs-stock edge case. If a product requires a
   *  minimum order of e.g. 10 but only 3 are in stock, no quantity
   *  satisfies both constraints -- treated as unavailable the same as
   *  sold out (not shown as a broken/uncappable "Add to Quote" for 1
   *  unit that doesn't actually meet the seller's own MOQ policy). */
  moq: number;
  /** Pre-localized, passed down the same way `name`/`categoryLabel`
   *  already are -- this component has no "use client"/useTranslations
   *  of its own (see the comment below) and is shared between server
   *  pages (getTranslations) and a client component (ProductTabs.tsx,
   *  useTranslations), so translation happens upstream, not here. */
  soldOutLabel: string;
  /** Shown instead of soldOutLabel for the MOQ-vs-stock case above --
   *  distinct wording on purpose (see ProductCard's own comment): "Sold
   *  Out" would be misleading when stock genuinely isn't zero. */
  unavailableLabel: string;
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
  brandLabel,
  imageUrl,
  defaultSize,
  stockQuantity,
  moq,
  soldOutLabel,
  unavailableLabel,
}: ProductCardProps) {
  const isSoldOut = stockQuantity === 0;
  const isMoqUnavailable =
    stockQuantity !== null && stockQuantity > 0 && moq > stockQuantity;
  const isUnavailable = isSoldOut || isMoqUnavailable;
  const badgeLabel = isSoldOut
    ? soldOutLabel
    : isMoqUnavailable
      ? unavailableLabel
      : null;

  // Prompt 87 (Phase B) -- category + brand share ONE small-label line
  // rather than each getting their own row: reuses the exact existing
  // text-xs/tracking-wide/text-brand-gray/uppercase convention already
  // established for categoryLabel alone (no new label style invented),
  // joined with a middot when both are present. Building this as a
  // filtered-and-joined array (not a fixed "category · brand" template
  // string) is what guarantees the "brand null -> renders exactly as
  // before, no empty middot, no layout shift" requirement: when
  // brandLabel is null (every product until an admin assigns one), this
  // array only ever contains categoryLabel (or is empty, if that's also
  // null) -- byte-for-byte the same output this line produced before this
  // prompt.
  const metaLabel = [categoryLabel, brandLabel].filter(Boolean).join(" · ");

  return (
    <article className="flex h-full flex-col overflow-hidden rounded-card bg-brand-white shadow-card">
      <Link
        href={`/products/${slug}`}
        className="relative block aspect-square bg-brand-surface"
      >
        {badgeLabel ? (
          <span className="absolute start-2 top-2 z-10 rounded-full bg-brand-black px-2 py-0.5 text-xs font-medium text-brand-white">
            {badgeLabel}
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
        {metaLabel ? (
          <p className="text-xs tracking-wide text-brand-gray uppercase">
            {metaLabel}
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
            stockQuantity={stockQuantity}
            sizeId={defaultSize?.id ?? null}
            sizeLabel={defaultSize?.label ?? null}
            disabled={isUnavailable}
          />
        </div>
      </div>
    </article>
  );
}
