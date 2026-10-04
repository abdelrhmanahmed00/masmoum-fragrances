import { NextResponse, type NextRequest } from "next/server";
import { list } from "@vercel/blob";

/**
 * Early-warning check for Vercel Blob's Storage Size quota (Prompt 195,
 * Step 4). Secret-gated, same pattern as /api/revalidate -- reuses
 * REVALIDATION_SECRET rather than adding a second secret to manage for
 * what is, functionally, the same class of "admin-only operational
 * utility route" as that one.
 *
 * HONEST SCOPE, confirmed by actually testing the alternative before
 * writing this: Vercel's own API does NOT expose Blob Data Transfer or
 * Operations usage -- every endpoint I could find in Vercel's own OpenAPI
 * spec for this returned 403/404 with the available token, and even a
 * fully-permissioned token's documented response shape for "get a store"
 * only returns storage size/count, never transfer or operation counts
 * broken out by period. This route therefore covers Storage Size ONLY
 * (the 1GB Hobby cap) -- it is NOT a substitute for checking the Vercel
 * dashboard's own Data Transfer / Simple Operations / Advanced Operations
 * graphs, which have no working programmatic equivalent. See
 * docs/monthly-usage-check.md for what to check there and how often.
 */

const HOBBY_STORAGE_QUOTA_BYTES = 1024 * 1024 * 1024; // 1 GiB

export async function GET(request: NextRequest) {
  const secret = request.nextUrl.searchParams.get("secret");

  if (!process.env.REVALIDATION_SECRET || secret !== process.env.REVALIDATION_SECRET) {
    return NextResponse.json({ error: "Invalid or missing secret." }, { status: 401 });
  }

  let cursor: string | undefined;
  let totalBytes = 0;
  let totalObjects = 0;

  try {
    do {
      const res = await list({ cursor, limit: 1000 });
      for (const blob of res.blobs) {
        totalBytes += blob.size;
        totalObjects++;
      }
      cursor = res.cursor;
    } while (cursor);
  } catch (error) {
    return NextResponse.json(
      {
        error: "Could not list Blob store contents.",
        detail: error instanceof Error ? error.message : String(error),
      },
      { status: 502 }
    );
  }

  const percentOfStorageQuota = (totalBytes / HOBBY_STORAGE_QUOTA_BYTES) * 100;
  const flag =
    percentOfStorageQuota >= 80 ? "critical" : percentOfStorageQuota >= 50 ? "warning" : "ok";

  return NextResponse.json({
    storageSize: {
      totalBytes,
      totalObjects,
      quotaBytes: HOBBY_STORAGE_QUOTA_BYTES,
      percentOfStorageQuota: Math.round(percentOfStorageQuota * 100) / 100,
      flag,
    },
    IMPORTANT_NOTE:
      "This covers Storage Size ONLY (the 1GB Hobby cap). It does NOT cover Blob Data Transfer or Operations usage -- Vercel's API does not expose those programmatically with any token tested. Check the Vercel dashboard directly for those; see docs/monthly-usage-check.md.",
    checkedAt: new Date().toISOString(),
  });
}
