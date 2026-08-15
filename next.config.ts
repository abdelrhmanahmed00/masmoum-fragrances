import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const nextConfig: NextConfig = {
  // Gzip/Brotli compression of served assets (on by default, kept explicit
  // since bandwidth is a hard budget constraint at ~10k visitors/day).
  compress: true,

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
