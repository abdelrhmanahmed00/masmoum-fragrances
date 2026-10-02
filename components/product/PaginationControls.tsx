import { Link } from "@/i18n/navigation";

/**
 * Prompt 190 -- egress reduction, lever 3: /products and category pages
 * used to fetch every matching product in one unbounded query (the
 * "perfumes" category alone has 147 active products -- confirmed live,
 * not assumed). Pagination caps each page view to PRODUCTS_PAGE_SIZE
 * products' worth of rows AND thumbnail images. Server-rendered, no
 * client JS -- same plain <Link>-changes-the-query-string mechanism as
 * FilterGroup.tsx (this project's established, already-proven pattern
 * for anything that should be a shareable/bookmarkable URL rather than
 * client-side state).
 *
 * Windowed page numbers (current ± 1, plus first/last, "…" between gaps)
 * rather than listing every page -- this project's biggest listing today
 * tops out around 7 pages, where a window buys nothing over listing them
 * all, but the windowing costs nothing either and stays correct if the
 * catalog grows well past that.
 */
export default function PaginationControls({
  basePath,
  currentPage,
  totalPages,
  preserveParams,
  previousLabel,
  nextLabel,
  pageLabel,
}: {
  basePath: string;
  currentPage: number;
  totalPages: number;
  /** Other active filter params (gender/collection/brand) to keep when
   *  moving between pages -- same prop shape/purpose as FilterGroup's
   *  own preserveParams. */
  preserveParams: Record<string, string | undefined>;
  /** Pre-resolved translation strings -- same "page calls getTranslations,
   *  shared component receives plain strings" pattern this project's
   *  other shared components already use (e.g. ProductCard's
   *  soldOutLabel/unavailableLabel), not a next-intl hook called directly
   *  inside this file: this is a plain Server Component, not async, so it
   *  can't call the async getTranslations itself. */
  previousLabel: string;
  nextLabel: string;
  pageLabel: (page: number) => string;
}) {
  if (totalPages <= 1) return null;

  function hrefFor(page: number) {
    const params = new URLSearchParams();
    for (const [key, val] of Object.entries(preserveParams)) {
      if (val) params.set(key, val);
    }
    if (page > 1) params.set("page", String(page));
    const qs = params.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  }

  const pages = new Set<number>([1, totalPages, currentPage]);
  if (currentPage > 1) pages.add(currentPage - 1);
  if (currentPage < totalPages) pages.add(currentPage + 1);
  const sortedPages = Array.from(pages)
    .filter((p) => p >= 1 && p <= totalPages)
    .sort((a, b) => a - b);

  const linkClass =
    "rounded-btn border px-3 py-1.5 text-sm transition-colors border-brand-border text-brand-black hover:border-brand-black";
  const activeLinkClass =
    "rounded-btn border px-3 py-1.5 text-sm border-brand-black bg-brand-black text-brand-white";
  const disabledClass =
    "rounded-btn border px-3 py-1.5 text-sm border-brand-border text-brand-gray/50 cursor-not-allowed";

  return (
    <nav
      aria-label="Pagination"
      className="mt-10 flex flex-wrap items-center justify-center gap-2"
    >
      {currentPage > 1 ? (
        <Link href={hrefFor(currentPage - 1)} className={linkClass}>
          {previousLabel}
        </Link>
      ) : (
        <span aria-disabled="true" className={disabledClass}>
          {previousLabel}
        </span>
      )}

      {sortedPages.map((page, index) => {
        const prevPage = sortedPages[index - 1];
        const showGap = index > 0 && prevPage !== undefined && page - prevPage > 1;
        return (
          <span key={page} className="flex items-center gap-2">
            {showGap ? <span className="px-1 text-brand-gray">…</span> : null}
            <Link
              href={hrefFor(page)}
              aria-current={page === currentPage}
              aria-label={pageLabel(page)}
              className={page === currentPage ? activeLinkClass : linkClass}
            >
              {page}
            </Link>
          </span>
        );
      })}

      {currentPage < totalPages ? (
        <Link href={hrefFor(currentPage + 1)} className={linkClass}>
          {nextLabel}
        </Link>
      ) : (
        <span aria-disabled="true" className={disabledClass}>
          {nextLabel}
        </span>
      )}
    </nav>
  );
}
