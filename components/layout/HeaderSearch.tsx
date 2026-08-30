"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/client";
import { getPublicStorageUrl } from "@/lib/supabase/storage";

type SearchResult = {
  id: string;
  slug: string;
  name: string;
  imageUrl: string | null;
};

// Search-as-you-type guardrails (Prompt 62) -- all three exist to protect
// Supabase's free-tier read quota at this project's 10k-visitors/day
// scale, per the task's explicit requirement:
//   - MIN_QUERY_LENGTH: no query fires for a 1-character input (the
//     highest-frequency, least-useful keystroke -- "a", "s"... would
//     match nearly every product and cost a request for almost no
//     signal).
//   - DEBOUNCE_MS: collapses a burst of keystrokes (a whole word typed in
//     ~1s) into a single request instead of one per character.
//   - RESULT_LIMIT: bounds each response's row/image-URL count regardless
//     of how many products actually match a broad term.
const MIN_QUERY_LENGTH = 2;
const DEBOUNCE_MS = 300;
const RESULT_LIMIT = 6;

/**
 * ARCHITECTURE DECISION (Prompt 62) -- queries Supabase directly from the
 * browser (anon key, via lib/supabase/client.ts's existing createClient(),
 * already used for the admin login form) rather than a Server Action or a
 * Route Handler. This project's two established data-fetching patterns
 * don't fit a live search-as-you-type at all:
 *   - Server Actions (lib/admin/*.ts) are this project's pattern for
 *     MUTATIONS, invoked from a form submit -- not a per-keystroke read.
 *   - The ISR-tagged createPublicClient reads (lib/catalog.ts) work
 *     because a category/product page's query shape is the SAME for
 *     every visitor, so Next's fetch cache can actually serve repeat
 *     requests without hitting Supabase again. A search query's shape is
 *     different on every keystroke, for every visitor -- there is
 *     nothing to cache, so wrapping it in that pattern would add
 *     complexity for zero benefit.
 * A Route Handler was the other real option (a plain GET endpoint this
 * component could fetch()) -- rejected specifically because it inserts a
 * Vercel serverless function invocation into the path of EVERY debounced
 * keystroke, for EVERY visitor who opens the search box, on top of the
 * Supabase request that still has to happen either way. At 10k
 * visitors/day, that's a second quota (serverless invocations) spent for
 * no benefit over calling Supabase straight from the browser, since the
 * anon key is already public (embedded in every page) and RLS -- not the
 * server hop -- is what actually gates access.
 *
 * Confirmed the anon key can't see more than intended here regardless of
 * anything in THIS component: products' real RLS policy (supabase/
 * migrations/0004_products.sql, "products_public_select_active") already
 * restricts anon SELECT to `is_active = true` rows only, and
 * product_images' own policy (0006_product_images.sql,
 * "product_images_public_select_of_active_products") follows the same
 * parent-product is_active check -- both were already relied on by every
 * existing server-side public read (lib/catalog.ts) using the SAME anon
 * key this component uses; nothing new is being granted, this is a new
 * CALLER of an already-existing, already-audited grant.
 *
 * ILIKE, not full-text search: rejected tsvector/tsquery because this is
 * live partial-substring matching while the visitor is still mid-word
 * (e.g. "amb" should already match "Amber Oud") -- Postgres full-text
 * search matches whole lexemes/stems, not arbitrary substrings, and would
 * need prefix-query syntax (`amb:*`) to approximate this at all, for no
 * real gain at this catalog's actual size (dozens of products, confirmed
 * via the real homepage tab data seen in Prompts 60/61 -- "Test Perfume",
 * "Perfumes", "Body Mist", "Hair Mist", ...). No new index was added for
 * this either: a leading-wildcard ILIKE can't use a plain btree index and
 * always sequential-scans, but a sequential scan over a few dozen rows on
 * every debounced keystroke is negligible -- worth revisiting (a
 * pg_trgm GIN index) only if the real catalog grows into the thousands.
 *
 * Locale-scoped column, not name_en OR name_ar always: searches
 * name_ar on /ar, name_en on /en -- matches what's actually displayed in
 * that locale (an English visitor's query has no reason to match an
 * Arabic-only string, and vice versa) and is a single-column ILIKE
 * instead of an OR across two columns, which is both the more relevant
 * result set and the cheaper query.
 */
export default function HeaderSearch() {
  const t = useTranslations("Header");
  const locale = useLocale();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close on outside click / Escape. The categories dropdown (Prompt 50)
  // gets away with plain onMouseEnter/Leave because it's a hover menu
  // with nothing to type into; this panel holds a text input, and the
  // pointer legitimately leaves it while the visitor is still focused and
  // typing -- hover-based closing would close it out from under them.
  useEffect(() => {
    if (!isOpen) return;

    function handlePointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setIsOpen(false);
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) inputRef.current?.focus();
  }, [isOpen]);

  useEffect(() => {
    const trimmed = query.trim();
    // Prompt 81: no setState here for the too-short case (was
    // setResults([])/setIsLoading(false), flagged by
    // react-hooks/set-state-in-effect -- a real lint error, not a style
    // nit: calling setState synchronously right at the top of an effect
    // is exactly the "derive state instead of an effect" anti-pattern
    // that rule exists to catch). Neither reset is actually needed: the
    // JSX below already gates the entire results/loading UI behind
    // `trimmedLength >= MIN_QUERY_LENGTH`, so stale `results`/`isLoading`
    // values are invisible while the query is too short regardless of
    // what they hold internally -- and the moment the query becomes long
    // enough again, handleQueryChange (below) sets isLoading itself and
    // this effect overwrites `results` from the new fetch, so nothing
    // stale can ever actually render.
    if (trimmed.length < MIN_QUERY_LENGTH) return;

    // setIsLoading(true) also moved out of here for the same reason --
    // it's now set eagerly in handleQueryChange, as part of the SAME
    // user-triggered event that changes `query` in the first place
    // (setState in an event handler isn't what this rule is about at
    // all; it only flags synchronous setState calls inside an effect's
    // own body). This effect's own setState calls now only ever happen
    // inside the async `setTimeout` callback below -- genuinely
    // asynchronous, in response to the debounced fetch actually
    // resolving, which is exactly the pattern the rule wants.
    const controller = new AbortController();
    const nameColumn = locale === "ar" ? "name_ar" : "name_en";

    const timer = setTimeout(async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("products")
        .select(
          "id, slug, name_en, name_ar, images:product_images(storage_path, is_primary)"
        )
        .eq("is_active", true)
        .ilike(nameColumn, `%${trimmed}%`)
        .limit(RESULT_LIMIT)
        .abortSignal(controller.signal);

      // A superseded request (aborted because the visitor kept typing)
      // resolves with an error we don't want to render -- just drop it,
      // the newer request's effect will set state instead.
      if (controller.signal.aborted) return;

      if (error) {
        setResults([]);
      } else {
        setResults(
          (data ?? []).map((product) => {
            const primaryImage =
              product.images.find((img) => img.is_primary) ??
              product.images[0] ??
              null;
            return {
              id: product.id,
              slug: product.slug,
              name: locale === "ar" ? product.name_ar : product.name_en,
              imageUrl: primaryImage
                ? getPublicStorageUrl(
                    "product-images",
                    primaryImage.storage_path
                  )
                : null,
            };
          })
        );
      }
      setIsLoading(false);
    }, DEBOUNCE_MS);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, locale]);

  const trimmedLength = query.trim().length;

  return (
    <div className="relative" ref={containerRef}>
      {/* Prompt 108: base icon color back to brand-gold -- the bar is
          black again, gold-on-black is the real 11.1:1 pairing
          HeaderClient.tsx's own top comment cites. Hover dims via
          opacity (same "dim, don't hue-shift" pattern as every other
          header hover): hover:text-brand-gold/70 -- gold at 70% opacity
          over black, computed properly (not linearly scaled): effective
          rgb(154,127,96), luminance 0.230, contrast vs. black = 5.60:1,
          comfortably above 4.5:1 (matches HeaderClient.tsx's own
          Categories-trigger math for the identical blend). Icon size
          h-5 w-5 unchanged -- Prompt 107's mobile-sizing fix stays as-is,
          out of this color-only prompt's scope. */}
      <button
        type="button"
        className="p-2 text-brand-gold transition-colors hover:text-brand-gold/70"
        aria-haspopup="true"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((open) => !open)}
      >
        <span className="sr-only">{t("search")}</span>
        <svg
          viewBox="0 0 24 24"
          className="h-5 w-5"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
        >
          <circle cx="11" cy="11" r="7" />
          <path strokeLinecap="round" d="M21 21l-4.3-4.3" />
        </svg>
      </button>

      {/* Same dark-glass treatment as the categories dropdown (Prompt 56):
          identical bg-brand-black/75 + backdrop-blur-md + rounded-card +
          border-brand-gold/20 panel, positioned the same
          absolute/top-full/pt-3 way -- end-0 instead of start-0 since
          this trigger sits further along the end zone than Menu, so the
          panel opens toward the zone it has room in rather than
          overlapping Menu/the wordmark. Kept at these exact DARK values
          across every header-shape/color prompt since (64/65/66/67, 79's
          second inversion, 107's third, and now 108's fourth flip back)
          -- deliberately NOT tracking the bar's own color role, same
          "panel is a different surface than the persistent bar"
          reasoning as HeaderClient.tsx's own categories-dropdown
          comment (full detail there, not repeated here). */}
      <div
        className={
          "absolute end-0 top-full pt-3 " + (isOpen ? "block" : "hidden")
        }
      >
        <div className="w-72 rounded-card border border-brand-gold/20 bg-brand-black/75 p-3 shadow-lg backdrop-blur-md">
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(event) => {
              const value = event.target.value;
              setQuery(value);
              // Eagerly starts the loading indicator as part of THIS
              // event (see the effect's own comment above for why this
              // moved out of the effect body) -- mirrors the effect's
              // own MIN_QUERY_LENGTH gate exactly, so isLoading only ever
              // flips on when a fetch is actually about to be scheduled.
              if (value.trim().length >= MIN_QUERY_LENGTH) {
                setIsLoading(true);
              }
            }}
            placeholder={t("searchPlaceholder")}
            className="w-full rounded-btn border border-brand-gold/30 bg-transparent px-3 py-2 text-sm text-brand-cream placeholder:text-brand-cream/50 focus:border-brand-gold focus:outline-none"
          />

          {trimmedLength >= MIN_QUERY_LENGTH ? (
            <ul className="mt-2 max-h-80 overflow-y-auto">
              {isLoading ? (
                <li className="px-2 py-3 text-center text-sm text-brand-cream/60">
                  {t("searching")}
                </li>
              ) : results.length > 0 ? (
                results.map((product) => (
                  <li key={product.id}>
                    <Link
                      href={`/products/${product.slug}`}
                      onClick={() => setIsOpen(false)}
                      className="flex items-center gap-3 rounded-btn px-2 py-2 text-sm text-brand-cream transition-colors hover:bg-brand-gold/10 hover:text-brand-gold"
                    >
                      <span className="relative h-10 w-10 shrink-0 overflow-hidden rounded-btn bg-brand-white/10">
                        {product.imageUrl ? (
                          <Image
                            src={product.imageUrl}
                            alt=""
                            fill
                            sizes="40px"
                            className="object-cover"
                          />
                        ) : null}
                      </span>
                      {/* No price anywhere in this result -- not fetched
                          (the select above never asks for it), let alone
                          rendered -- per this project's core wholesale
                          requirement (no public pricing anywhere). */}
                      <span className="truncate">{product.name}</span>
                    </Link>
                  </li>
                ))
              ) : (
                <li className="px-2 py-3 text-center text-sm text-brand-cream/60">
                  {t("noResults")}
                </li>
              )}
            </ul>
          ) : null}
        </div>
      </div>
    </div>
  );
}
