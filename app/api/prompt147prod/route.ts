import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { getAllActiveProducts } from "@/lib/catalog";

// Diagnostic only (Prompt 147): calls the EXACT same function the
// /products listing page calls, directly, so its real output on
// production can be inspected without going through page rendering.
export async function GET() {
  const products = await getAllActiveProducts();
  const target = products.filter((p) =>
    ["031", "032", "033", "034", "035", "036", "037", "038"].includes(p.slug)
  );
  return NextResponse.json({
    total: products.length,
    target: target.map((p) => ({ slug: p.slug, imageUrl: p.imageUrl })),
  });
}

// TEMPORARY -- Prompt 147 production fix only. Deleted immediately after
// use, in a follow-up commit. Same technique, same root cause, as the
// Prompt 124 precedent (see the removed app/api/prompt124prod/route.ts in
// git history): revalidateTag()/updateTag() calls made during Prompt
// 146's image-upload batch ran against a LOCAL `next start` server
// (localhost:3001), never against the real Vercel production deployment.
// Vercel's Next.js Data Cache is per-deployment and persists across
// requests -- it has no way to know about an invalidation that happened
// inside a different, local process. The public /products listing, the
// homepage tabs, and even each product's own detail page all read via a
// fetch() tagged "products" (see lib/catalog.ts), so all of them kept
// serving their last real cached response (before Prompt 146's uploads)
// until something calls revalidateTag() from code ACTUALLY RUNNING ON
// PRODUCTION. This route does exactly that, invoked via a real HTTPS
// request to the live masmoum-fragrances-iota.vercel.app deployment --
// not localhost.
export async function POST() {
  // { expire: 0 } (not "max"): confirmed via a real, failed first attempt
  // with "max" that stale-while-revalidate semantics do NOT reliably
  // self-heal a fully dynamic (searchParams-driven, x-vercel-cache: MISS
  // every request) route within a practical number of requests/wait time
  // -- the Next 16 docs (revalidateTag.md) explicitly call this out:
  // "max" marks the tag stale and only revalidates in the BACKGROUND on
  // next visit, so the SAME visit (and, empirically here, several
  // subsequent ones) can keep serving the old response. The docs
  // explicitly recommend { expire: 0 } for exactly this situation --
  // "webhooks or third-party services that need immediate expiration" --
  // which forces the next request to be a real blocking cache miss
  // instead of stale-then-eventually-maybe-fresh.
  revalidateTag("products", { expire: 0 });
  revalidateTag("categories", { expire: 0 });
  revalidateTag("brands", { expire: 0 });
  return NextResponse.json({ status: "done" });
}
