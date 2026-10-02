/**
 * Masmoum Fragrances — Supabase Storage cache proxy (Prompt 183).
 *
 * WHY THIS EXISTS
 * ----------------
 * Supabase's free-tier "cached egress" quota (5GB/billing cycle) got
 * exceeded (hit 7.77GB) because, after Prompt 177/178 set
 * `images.unoptimized: true` in next.config.ts, every single image view on
 * the site became a full-size, uncompressed-for-display-context hit
 * directly against Supabase Storage -- and a 1-hour default Cache-Control
 * (fixed in lib/config.ts's STORAGE_UPLOAD_CACHE_CONTROL_SECONDS alongside
 * this worker) meant even the SAME visitor re-fetched the same bytes from
 * Supabase repeatedly within a single hour.
 *
 * That upload-time fix helps browsers that have already seen an image.
 * It does nothing for the (much larger, at this site's traffic) set of
 * requests from visitors who haven't -- every one of those still has to
 * hit Supabase's origin and count against the egress quota. This worker
 * is the fix for THAT half: it sits in front of Supabase Storage's public
 * object URLs and caches responses at Cloudflare's edge, SHARED across
 * every visitor worldwide, not just one browser. Once any single visitor
 * has loaded a given image, every other visitor hitting the same edge
 * node gets it straight from Cloudflare -- Supabase's origin, and its
 * egress meter, is never touched again until the cache entry expires.
 *
 * WHY A WORKER AND NOT JUST A PLAIN PROXIED DNS RECORD
 * -----------------------------------------------------
 * A plain Cloudflare-proxied CNAME to *.supabase.co doesn't work: Cloudflare
 * forwards the ORIGINAL Host header (cdn.masmoumfragrances.com) to the
 * origin, but Supabase's edge routes by hostname and has no project
 * registered under that name, so the request would 404 before it ever
 * reaches Storage. Rewriting the Host header per-request to the real
 * Supabase hostname is an Enterprise-only Cloudflare feature (Origin
 * Rules' "Host header override") -- Workers is the only mechanism that
 * can do this on the Free plan, which is why this is a Worker and not a
 * DNS-only setup. (Checked directly against Cloudflare's own docs before
 * building this -- see the Prompt 183 report for sources.)
 *
 * KNOWN TRADEOFF -- READ BEFORE RELYING ON THIS ALONE
 * -----------------------------------------------------
 * Workers Free is capped at 100,000 requests/day (Cloudflare error 1027
 * past that, not a silent fallback). Every request through this route --
 * cache hit or miss -- is one Worker invocation, because the Worker code
 * is what checks the cache. At this site's real traffic, a normal
 * browsing session (several product-grid pages, each rendering many
 * full-size thumbnails since Vercel's own optimizer is deliberately kept
 * off -- see next.config.ts) can plausibly add up to more daily image
 * requests than that ceiling. If Cloudflare Workers analytics show usage
 * approaching 100k/day, the fix is NOT to remove this worker -- it's
 * either (a) Cloudflare's Workers Paid plan, $5/month for 10M requests, a
 * trivial cost next to paying Supabase's own overage repeatedly, or
 * (b) narrowing BUCKETS below to the highest-traffic ones only. This is
 * documented here, not hidden, because the whole point of Prompt 183 was
 * not shipping another fix that quietly breaks again next cycle.
 *
 * WHAT IT DOES
 * ------------
 * - Only handles GET/HEAD against /storage/v1/object/public/<bucket>/...
 *   for the bucket names this project actually uses (see BUCKETS below).
 *   Anything else falls through to a direct, uncached proxy -- correct,
 *   just not cached, so nothing this worker doesn't understand ever
 *   breaks silently.
 * - Requests with a Range header (video scrubbing, home-videos bucket)
 *   bypass the cache entirely and proxy straight through. Range + shared
 *   edge caching has real correctness edge cases; skipping the cache for
 *   these specifically is the simple, safe choice -- video is a small
 *   fraction of this site's total image egress anyway.
 * - On a cache miss: fetches the real object from Supabase, and -- only
 *   for a genuine 200 response -- stores a copy in Cloudflare's cache with
 *   a forced long Cache-Control, so even objects uploaded BEFORE the
 *   lib/config.ts fix (which can't retroactively change their stored
 *   header without being re-uploaded) still get the full benefit of this
 *   cache going forward. Non-200 responses (e.g. a transient Supabase
 *   error) are returned but never cached, so a bad response can't get
 *   stuck serving stale errors.
 */

const SUPABASE_ORIGIN = "https://wphxzbzctxumofscgajn.supabase.co";

// Every public Storage bucket this project currently uses (lib/supabase/storage.ts's
// StorageBucket type) -- kept in sync manually since Workers have no access
// to this repo's TypeScript types at runtime.
const BUCKETS = new Set([
  "hero-images",
  "product-images",
  "home-videos",
  "private-label-images",
  "category-images",
  "perfume-gender-images",
  "bottle-color-images",
  "design-requests",
]);

// Forced edge + browser cache lifetime for anything this worker caches,
// independent of what Cache-Control the origin object actually carries.
// Matches lib/config.ts's STORAGE_UPLOAD_CACHE_CONTROL_SECONDS (1 year) --
// safe because every object path is a crypto.randomUUID() set once at
// upload and never overwritten (Prompt 7), so there is no "stale" case to
// worry about: the bytes at a given path never change.
const CACHE_CONTROL = "public, max-age=31536000, immutable";

export default {
  async fetch(request, _env, ctx) {
    const url = new URL(request.url);

    if (request.method !== "GET" && request.method !== "HEAD") {
      return proxyUncached(request, url);
    }

    const bucket = extractBucket(url.pathname);
    const isRangeRequest = request.headers.has("range");

    if (!bucket || !BUCKETS.has(bucket) || isRangeRequest) {
      // Unrecognized path shape or a Range request -- proxy straight
      // through, uncached, rather than risk caching something incorrectly.
      return proxyUncached(request, url);
    }

    const cache = caches.default;
    const cacheKey = new Request(url.toString(), request);

    const cached = await cache.match(cacheKey);
    if (cached) {
      return cached;
    }

    const originResponse = await fetchFromOrigin(request, url);

    if (originResponse.status !== 200) {
      // Don't cache errors (e.g. a transient Supabase problem) -- just
      // return it so the client sees the real status.
      return originResponse;
    }

    const cacheableResponse = new Response(originResponse.body, originResponse);
    cacheableResponse.headers.set("Cache-Control", CACHE_CONTROL);
    // Supabase already sends this for public objects; set it explicitly
    // too so a missing/narrower header never blocks a cross-origin <img>
    // load from the app's own domain.
    cacheableResponse.headers.set("Access-Control-Allow-Origin", "*");

    ctx.waitUntil(cache.put(cacheKey, cacheableResponse.clone()));

    return cacheableResponse;
  },
};

function extractBucket(pathname) {
  const match = pathname.match(/^\/storage\/v1\/object\/public\/([^/]+)\//);
  return match ? match[1] : null;
}

function originUrlFor(url) {
  return SUPABASE_ORIGIN + url.pathname + url.search;
}

/** Plain pass-through proxy -- no cache read or write. */
async function proxyUncached(request, url) {
  return fetch(originUrlFor(url), request);
}

async function fetchFromOrigin(request, url) {
  return fetch(originUrlFor(url), {
    method: request.method,
    headers: request.headers,
  });
}
