import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";

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
  revalidateTag("products", "max");
  revalidateTag("categories", "max");
  revalidateTag("brands", "max");
  return NextResponse.json({ status: "done" });
}
