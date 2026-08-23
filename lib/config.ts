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

export const siteConfig = {
  name: "Masmoum Fragrances",
  description: "B2B wholesale fragrance manufacturer",
} as const;
