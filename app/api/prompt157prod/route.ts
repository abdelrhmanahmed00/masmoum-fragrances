import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createProduct } from "@/lib/admin/products";

// TEMPORARY -- Prompt 157 batch-create route, deleted immediately after
// use. Deployed to and invoked against PRODUCTION, same discipline as
// every prior batch. Brand and category are LOOKED UP only (both already
// exist) -- no create path needed here.
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

  const { data: brand, error: brandError } = await supabase
    .from("brands")
    .select("id, slug, name_en")
    .eq("slug", "victoria-flower")
    .maybeSingle();

  if (brandError || !brand) {
    return NextResponse.json({ status: "error", step: "brand", message: brandError?.message ?? "not found" });
  }

  const { data: category, error: categoryError } = await supabase
    .from("categories")
    .select("id, slug, name_en")
    .eq("slug", "perfumes")
    .maybeSingle();

  if (categoryError || !category) {
    return NextResponse.json({ status: "error", step: "category", message: categoryError?.message ?? "not found" });
  }

  const PRODUCTS = [
    { slug: "100", name_en: "Victoria Flower – Al Malika Eau de Parfum – 30ml", name_ar: "فيكتوريا فلاور – الملكة أو دو بارفان 30 مل" },
    { slug: "101", name_en: "Victoria Flower – Al Amira Eau de Parfum – 30ml", name_ar: "فيكتوريا فلاور – الأميرة أو دو بارفان 30 مل" },
    { slug: "102", name_en: "Victoria Flower – Al Anaqa Eau de Parfum – 30ml", name_ar: "فيكتوريا فلاور – الأناقة أو دو بارفان 30 مل" },
    { slug: "103", name_en: "Victoria Flower – Al Makhmalia Eau de Parfum – 30ml", name_ar: "فيكتوريا فلاور – المخملية أو دو بارفان 30 مل" },
    { slug: "104", name_en: "Victoria Flower – Golden Ember Eau de Parfum – 30ml", name_ar: "فيكتوريا فلاور – جولدن إمبر أو دو بارفان 30 مل" },
    { slug: "105", name_en: "Victoria Flower – Golden Bloom Eau de Parfum – 30ml", name_ar: "فيكتوريا فلاور – جولدن بلوم أو دو بارفان 30 مل" },
  ];

  const created: { slug: string; id?: string; error?: string }[] = [];
  for (const p of PRODUCTS) {
    const form = new FormData();
    form.set("name_en", p.name_en);
    form.set("name_ar", p.name_ar);
    form.set("slug", p.slug);
    form.set("category_id", category.id);
    form.set("brand_id", brand.id);
    form.set("gender", "women");
    form.set("description_en", "Victoria Flower");
    form.set("description_ar", "فيكتوريا فلاور");
    form.set("moq", "48");
    form.set("is_active", "on");

    const result = await createProduct(supabase, form);
    if (result.status === "success") {
      created.push({ slug: p.slug, id: result.id });
    } else {
      created.push({
        slug: p.slug,
        error: result.status === "error" ? result.message : "unknown error",
      });
    }
  }

  return NextResponse.json({ status: "done", brand, category, created });
}
