import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { createClient } from "@supabase/supabase-js";
import { deleteProduct } from "@/lib/admin/products";

// TEMPORARY -- Prompt 169 batch-delete route, deleted immediately after
// use. Deployed to and invoked against PRODUCTION, same discipline as
// every prior batch. Reuses the real deleteProduct() (Storage cleanup +
// quote_request_items guard included), one call per product.
const SLUGS = ["048", "049", "050", "051", "052", "053", "054", "055", "056"];

export async function POST(request: Request) {
  const { email, password } = await request.json();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  const authClient = createClient(supabaseUrl, anonKey);
  const { data: signInData, error: signInError } =
    await authClient.auth.signInWithPassword({ email, password });

  if (signInError || !signInData.session) {
    return NextResponse.json(
      { status: "error", message: "Sign-in failed", detail: signInError?.message },
      { status: 401 }
    );
  }

  const accessToken = signInData.session.access_token;
  const supabase = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });

  const { data: products, error: fetchError } = await supabase
    .from("products")
    .select("id, slug")
    .in("slug", SLUGS);

  if (fetchError || !products || products.length !== SLUGS.length) {
    return NextResponse.json({
      status: "error",
      step: "fetch",
      message: fetchError?.message ?? `expected ${SLUGS.length}, got ${products?.length}`,
    });
  }

  const results: { slug: string; id: string; status: string; message?: string }[] = [];
  for (const p of products.sort((a, b) => a.slug.localeCompare(b.slug))) {
    const result = await deleteProduct(supabase, p.id);
    results.push({
      slug: p.slug,
      id: p.id,
      status: result.status,
      message: result.status === "error" ? result.message : undefined,
    });
  }

  revalidateTag("products", { expire: 0 });

  return NextResponse.json({ status: "done", results });
}
