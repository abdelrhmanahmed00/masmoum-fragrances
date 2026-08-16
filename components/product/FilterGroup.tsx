import { Link } from "@/i18n/navigation";

type FilterOption = { value: string; label: string };

/**
 * Server-rendered filter pills — no client JS needed at all. Filters
 * reflect in the URL via searchParams (plain <Link>s that change the
 * query string), matching the reference site's own confirmed behavior:
 * instant-apply, URL-reflected (Shopify's native filter app updates the
 * URL via history.pushState after an AJAX refresh — we get the same
 * shareable/bookmarkable URL outcome more simply, via normal server
 * navigation, which fits this project's ISR/SSR architecture better than
 * replicating client-side AJAX filtering would).
 */
export default function FilterGroup({
  label,
  allLabel,
  basePath,
  paramKey,
  currentValue,
  options,
  preserveParams,
}: {
  label: string;
  allLabel: string;
  basePath: string;
  paramKey: string;
  currentValue: string | undefined;
  options: FilterOption[];
  /** Other active filter params to keep when switching this one. */
  preserveParams: Record<string, string | undefined>;
}) {
  function hrefFor(value: string | null) {
    const params = new URLSearchParams();
    for (const [key, val] of Object.entries(preserveParams)) {
      if (val) params.set(key, val);
    }
    if (value) params.set(paramKey, value);
    const qs = params.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  }

  const allOptions = [{ value: "", label: allLabel, isAll: true }, ...options];

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-sm font-medium text-brand-gray">{label}:</span>
      {allOptions.map((option) => {
        const isActive = "isAll" in option ? !currentValue : currentValue === option.value;
        return (
          <Link
            key={option.value || "all"}
            href={hrefFor("isAll" in option ? null : option.value)}
            aria-current={isActive}
            className={
              "rounded-btn border px-3 py-1.5 text-sm transition-colors " +
              (isActive
                ? "border-brand-black bg-brand-black text-brand-white"
                : "border-brand-border text-brand-black hover:border-brand-black")
            }
          >
            {option.label}
          </Link>
        );
      })}
    </div>
  );
}
