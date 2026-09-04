import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";

// TEMPORARY -- Prompt 124 production fix only. Deleted immediately after
// use, in a follow-up commit.
//
// Root cause (see the Prompt 124 report): every prior product batch's
// revalidateTag() call ran against a LOCAL `next start` server, never
// against the real Vercel production deployment. Vercel's Next.js Data
// Cache persists ACROSS deployments -- a redeploy alone does not reset
// it, it only re-runs generateStaticParams for SSG pages (which is why
// individual /products/[slug] pages for 031-056 already work correctly).
// The dynamic /products listing and the homepage tabs both read via a
// separately-cached fetch() tagged "products"/"brands"/"categories",
// which stayed stale at its last real write (~30 products) until
// something calls revalidateTag() from CODE ACTUALLY RUNNING ON
// PRODUCTION. This route does exactly that, invoked via a real HTTPS
// request to the live masmoum-fragrances-iota.vercel.app deployment --
// not localhost.
export async function POST() {
  revalidateTag("products", "max");
  revalidateTag("brands", "max");
  revalidateTag("categories", "max");
  return NextResponse.json({ status: "done" });
}
