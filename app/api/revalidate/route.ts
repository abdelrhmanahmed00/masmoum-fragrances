import { NextResponse, type NextRequest } from "next/server";
import { revalidateTag } from "next/cache";

/**
 * On-demand cache revalidation (Prompt 189).
 *
 * Why this exists: every read in lib/catalog.ts goes through
 * createPublicClient's tagged `fetch()` (REVALIDATE_SECONDS.* + a tag list --
 * "products"/"categories"/"brands"), and the ONLY place that tag ever gets
 * busted is the matching `updateTag(...)` call inside the real admin Server
 * Actions (app/admin/(dashboard)/.../actions.ts), which only fires after a
 * write made THROUGH the admin UI. Prompt 189 found a real, confirmed gap:
 * data written directly against Supabase (outside this app entirely, e.g.
 * a one-off migration/backfill script) never calls those Server Actions, so
 * the tagged fetch cache keeps serving its old value until its own
 * `revalidate` window naturally elapses -- `/admin/products/[id]/edit`'s own
 * pages looked correct immediately only because build-time-rendered routes
 * re-query Supabase fresh on every deploy; the dynamically-rendered
 * `/products` listing does not re-render per deploy, so it kept serving a
 * stale tagged fetch result from before the backfill.
 *
 * This route exists so a fix like that (or any future out-of-band write)
 * has a real way to bust the cache immediately afterward, rather than
 * waiting out REVALIDATE_SECONDS or triggering a deploy that may not even
 * help (build-time pages refresh on deploy; dynamically-rendered ones with
 * their own tagged data fetches do not). Secret-gated since this is the
 * only route in the app that can force Supabase reads on every subsequent
 * request until the cache repopulates -- not something to leave open.
 */
export async function POST(request: NextRequest) {
  const secret = request.nextUrl.searchParams.get("secret");

  if (!process.env.REVALIDATION_SECRET || secret !== process.env.REVALIDATION_SECRET) {
    return NextResponse.json({ error: "Invalid or missing secret." }, { status: 401 });
  }

  const tag = request.nextUrl.searchParams.get("tag");
  if (!tag) {
    return NextResponse.json({ error: "Missing required 'tag' query param." }, { status: 400 });
  }

  // NOT updateTag -- confirmed by reading next/dist/server/web/spec-extension/revalidate.js
  // directly: updateTag unconditionally throws outside a Server Action
  // ("workStore.page.endsWith('/route')" check), which is exactly what this
  // file is. revalidateTag is the one usable from a Route Handler.
  //
  // Second arg is `{ expire: 0 }`, not a named profile string (e.g. "max"):
  // named profiles are looked up from workStore.cacheLifeProfiles, which is
  // only populated by the `cacheLife` config under the `cacheComponents`
  // experimental flag -- this project doesn't have that enabled (see
  // app/[locale]/(marketing)/products/page.tsx's own comment), so a string
  // profile isn't guaranteed to resolve here. `{ expire: 0 }` is a plain
  // object Next.js's own revalidate() treats identically to the deprecated
  // bare single-arg call (immediate full revalidation) without depending on
  // any profile configuration -- confirmed from the same source read.
  revalidateTag(tag, { expire: 0 });

  return NextResponse.json({ revalidated: true, tag, now: Date.now() });
}
