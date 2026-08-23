import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const nextConfig: NextConfig = {
  // Gzip/Brotli compression of served assets (on by default, kept explicit
  // since bandwidth is a hard budget constraint at ~10k visitors/day).
  compress: true,

  experimental: {
    serverActions: {
      // Prompt 38 bug fix: Next.js's default Server Actions body limit is
      // 1MB (confirmed against this installed version's own docs --
      // node_modules/next/dist/docs/01-app/03-api-reference/05-config/
      // 01-next-config-js/serverActions.md -- the config key/location has
      // moved between Next versions, so this was checked directly rather
      // than assumed from general knowledge). Every real upload feature
      // in this project submits its file(s) as a multipart Server Action
      // body (Products images, Hero Slides, Home Videos -- Prompts 34/35/
      // 37), so 1MB silently broke any realistically-sized real file, not
      // just an edge case -- it just hadn't been triggered by this
      // point's small test fixtures.
      //
      // 30mb, not just "20MB" (home-videos' own largest single-file
      // bucket limit, Prompt 10): HomeVideoForm.tsx submits a video file
      // (up to 20MB) AND an optional thumbnail image (up to 5MB) in the
      // SAME multipart body in one Server Action call -- the real
      // worst-case combined body is up to ~25MB, not 20MB. This docs
      // page's own guidance is to leave headroom for multipart boundary/
      // field-metadata overhead on top of the raw file bytes ("an
      // additional 10-20 KB is a reasonable rule of thumb" for typical
      // uploads, though a multi-file submission's overhead is somewhat
      // higher than that rule of thumb's single-file framing). 30mb
      // covers the full 25MB worst case with comfortable headroom above
      // it, without being so large it defeats the limit's own purpose
      // (bounding worst-case server resource consumption per request).
      //
      // This is a single global setting -- every Server Action in the
      // app is covered automatically, nothing to repeat per-feature, and
      // no existing per-feature code (lib/admin/product-images.ts,
      // hero-slides.ts, home-videos.ts) needs any change.
      //
      // NOT addressed here, flagged for the future deployment-prep
      // prompt instead: hosting platforms (e.g. Vercel) can impose their
      // OWN separate request body size limit independent of this Next.js
      // config -- raising bodySizeLimit here does not guarantee the
      // platform will actually accept a 20-25MB request once deployed.
      // That needs to be verified against whatever platform this project
      // actually deploys to, not assumed now.
      bodySizeLimit: "30mb",
    },

    // Second, DISTINCT limit found while verifying the fix above (not
    // part of the original bug report -- caught by actually testing a
    // realistic ~20-25MB upload end to end, not stopping at the first
    // confirmation). This project's proxy.ts (Next 16's rename of
    // middleware.ts -- see that file's own note) runs on every /admin/*
    // route, including every upload form's POST. Next.js separately
    // buffers the request body IN THE PROXY LAYER, capped by its own
    // default 10MB limit (confirmed against this installed version's
    // docs -- node_modules/next/dist/docs/01-app/03-api-reference/05-config/
    // 01-next-config-js/proxyClientMaxBodySize.md), independent of
    // serverActions.bodySizeLimit above. Left at its 10MB default, this
    // would have silently TRUNCATED (not rejected -- the docs are
    // explicit the request "will not fail or return an error to the
    // client") any upload past 10MB, which then breaks multipart parsing
    // downstream with an unrelated-looking "expected boundary after
    // body" error -- reproduced for real while verifying this fix (see
    // the Prompt 38 report), not assumed from the docs alone. Set to the
    // same 30mb as bodySizeLimit above -- there's no reason for the two
    // gates to disagree, since a request that shouldn't be truncated
    // here would just fail the Server Action's own limit right after
    // anyway.
    proxyClientMaxBodySize: "30mb",
  },

  images: {
    // Supabase Storage is the only external image source for now. Scoped to
    // the public storage path rather than the whole hostname.
    remotePatterns: [
      new URL(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://placeholder.supabase.co"}/storage/v1/object/public/**`
      ),
    ],
    // Next.js 16 default is [75] already; kept explicit so the tradeoff is
    // visible here. A single quality avoids generating extra cached variants
    // per image, which matters for Supabase/Vercel free-tier limits.
    qualities: [75],
    // Trimmed default sizes — this is a wholesale catalog, not a
    // photography-heavy retail site, so we don't need every breakpoint.
    imageSizes: [64, 96, 128, 256, 384],
    deviceSizes: [640, 828, 1080, 1200, 1920],
  },
};

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

export default withNextIntl(nextConfig);
