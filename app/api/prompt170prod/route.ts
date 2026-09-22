import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { createClient } from "@supabase/supabase-js";
import { updateProduct } from "@/lib/admin/products";

// TEMPORARY -- Prompt 170 Part 3 gender-fix route, deleted immediately
// after use. Deployed to and invoked against PRODUCTION. Reuses the real
// updateProduct() -- its validate() does a FULL FormData replace, so
// each product's CURRENT full row is fetched first and reconstructed
// into a complete FormData with every field preserved except gender
// (men -> kids), same "fetch full row, rebuild full FormData" technique
// as every prior bulk-field-change prompt this session.
const SLUGS = ["006", "007", "008", "009", "010"];

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
    .select("*")
    .in("slug", SLUGS);

  if (fetchError || !products || products.length !== SLUGS.length) {
    return NextResponse.json({
      status: "error",
      step: "fetch-products",
      message: fetchError?.message ?? `expected ${SLUGS.length}, got ${products?.length}`,
    });
  }

  const results: { slug: string; id: string; status: string; message?: string }[] = [];

  for (const p of products) {
    const form = new FormData();
    form.set("name_en", p.name_en);
    form.set("name_ar", p.name_ar);
    form.set("slug", p.slug);
    form.set("category_id", p.category_id);
    if (p.brand_id) form.set("brand_id", p.brand_id);
    form.set("gender", "kids"); // <-- the only real change
    form.set("description_en", p.description_en);
    form.set("description_ar", p.description_ar);
    if (p.fragrance_top_notes_en) form.set("fragrance_top_notes_en", p.fragrance_top_notes_en);
    if (p.fragrance_top_notes_ar) form.set("fragrance_top_notes_ar", p.fragrance_top_notes_ar);
    if (p.fragrance_middle_notes_en) form.set("fragrance_middle_notes_en", p.fragrance_middle_notes_en);
    if (p.fragrance_middle_notes_ar) form.set("fragrance_middle_notes_ar", p.fragrance_middle_notes_ar);
    if (p.fragrance_base_notes_en) form.set("fragrance_base_notes_en", p.fragrance_base_notes_en);
    if (p.fragrance_base_notes_ar) form.set("fragrance_base_notes_ar", p.fragrance_base_notes_ar);
    form.set("moq", String(p.moq));
    if (p.stock_quantity !== null && p.stock_quantity !== undefined) {
      form.set("stock_quantity", String(p.stock_quantity));
    }
    if (p.is_active) form.set("is_active", "on");
    if (p.is_featured) form.set("is_featured", "on");
    form.set("sort_order", String(p.sort_order));

    const result = await updateProduct(supabase, p.id, form);
    results.push({
      slug: p.slug,
      id: p.id,
      status: result.status,
      message: result.status === "error" ? result.message : undefined,
    });
  }

  revalidateTag("products", { expire: 0 });
  revalidateTag("categories", { expire: 0 });

  return NextResponse.json({ status: "done", results });
}
