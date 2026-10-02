/**
 * -----------------------------------------------------------------------
 * CACHING STRATEGY — decision record (no data-fetching logic yet)
 * -----------------------------------------------------------------------
 *
 * Context: ~10,000 visitors/day, Supabase + Vercel free/low tiers. The
 * limiting resources are Supabase DB reads and Vercel bandwidth/function
 * invocations, not compute — so the plan optimizes for minimizing repeat
 * reads rather than for raw request throughput.
 *
 * Decision: use Incremental Static Regeneration (ISR) via a `revalidate`
 * value on product and category pages, instead of full SSR (dynamic
 * rendering on every request).
 *
 *   - Product & category pages: statically generated at build time where
 *     feasible (generateStaticParams) and revalidated on an interval via
 *     `export const revalidate = <seconds>` (see REVALIDATE_SECONDS below
 *     for the planned values). This means a Supabase read happens once per
 *     revalidation window per page, not once per visitor — the dominant
 *     cost driver at this traffic level.
 *   - Homepage / marketing pages: same ISR approach; content changes
 *     infrequently (new arrivals, featured categories).
 *   - Quote request flow: dynamic/SSR by nature (user-specific, mutates
 *     data) — not a caching candidate.
 *   - Any admin or authenticated views (future): SSR, never cached.
 *
 * Why ISR over SSR: SSR would issue a fresh Supabase query per page view,
 * which at 10k visitors/day risks burning through free-tier DB read quotas
 * and adds latency to every request. ISR serves a cached static response
 * from Vercel's CDN for the vast majority of requests and only touches
 * Supabase on a background revalidation, which is both cheaper and faster.
 *
 * Why not fully static (no revalidation): the catalog and pricing can
 * change between deploys; a bounded revalidate window keeps content
 * reasonably fresh without paying the per-request SSR cost.
 *
 * This file documents the plan only. Actual `revalidate` exports and data
 * fetching are added alongside the pages/queries that need them.
 */

export const REVALIDATE_SECONDS = {
  /** Product detail pages — catalog/pricing changes infrequently. */
  product: 3600, // 1 hour
  /** Category listing pages — same rationale as products. */
  category: 3600, // 1 hour
  /** Homepage / marketing content — featured items, banners, etc. */
  marketing: 1800, // 30 minutes
  /** site_settings (contact info, etc.) — rendered on every page via the
   *  Footer, but changes only when an admin edits it, so a long window is
   *  fine and keeps the read count low across the whole site. */
  siteSettings: 3600, // 1 hour
  /** integration_settings' meta_pixel_id (Prompt 47) — rendered on every
   *  page via the root layout's Meta Pixel base script, same rationale as
   *  siteSettings above: changes only via an admin edit, so a long window
   *  keeps the per-page-load read count down. Only the pixel ID is ever
   *  read through this cached path — the CAPI token is read uncached,
   *  on-demand, only from the quote submission Server Action (see
   *  lib/meta-conversions-api.ts). */
  metaIntegration: 3600, // 1 hour
  /** Static pages (Policy, Private Label, ...; Prompt 49) — changes only
   *  when an admin edits a page, same long-window rationale as every
   *  other rarely-changing dashboard-managed content type above. */
  pages: 3600, // 1 hour
} as const;

/**
 * Cache-Control max-age (seconds) applied to every Storage object at
 * UPLOAD time, via the `cacheControl` option on `.storage.from(...).upload()`
 * (Prompt 183). Supabase's JS SDK defaults this to 3600 (1 hour) if omitted
 * -- far too short for this project's images, which are never actually
 * mutable at a given path: Prompt 7 (see the path-construction comment next
 * to every upload call) deliberately gives every upload a brand-new
 * crypto.randomUUID() path specifically so a replaced image is never served
 * from the same URL a stale cache might still hold. That decision means
 * every object this header applies to is permanently immutable at its
 * storage_path -- there is no "edit in place" case to invalidate against --
 * so there's no downside to caching it for as long as both browsers and
 * Supabase's own Storage CDN will honor it.
 *
 * Why this matters beyond browser convenience: Supabase's free-tier
 * "cached egress" quota (5GB/cycle) is metered on bytes actually served to
 * visitors, and a 1-hour header means every browser re-fetches the full
 * original file from Supabase at least once an hour on any page with that
 * image open/revisited, with zero benefit since the bytes never change. A
 * 1-year header turns most of that into a local disk-cache hit that never
 * reaches Supabase at all for any returning visitor within the year -- see
 * the Prompt 183 egress investigation for the math on how big a lever this
 * is at this site's traffic.
 */
export const STORAGE_UPLOAD_CACHE_CONTROL_SECONDS = 31536000; // 1 year

/**
 * Prompt 190 -- egress reduction, lever 3 (query-level): /products and
 * category pages previously fetched every active product in one
 * unbounded query (confirmed live: the "perfumes" category alone has 147
 * active products) -- each with its own thumbnail image, on a single
 * page view. 24 is a multiple of both grid breakpoints this project's
 * listing pages actually use (grid-cols-2 mobile, md:grid-cols-4 desktop:
 * 24/2=12, 24/4=6), so a full page never ends on an awkward partial row.
 */
export const PRODUCTS_PAGE_SIZE = 24;

export const siteConfig = {
  name: "Masmoum Fragrances",
  description: "B2B wholesale fragrance manufacturer",
} as const;
