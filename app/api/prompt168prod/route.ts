import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createProduct } from "@/lib/admin/products";

// TEMPORARY -- Prompt 168 batch-create route, deleted immediately after
// use. Deployed to and invoked against PRODUCTION, same discipline as
// every prior batch. Brand and category are LOOKED UP only.
//
// All 4 names use "Eau de Toilette" (not the preliminary list's "Eau de
// Parfum") -- every one of the 4 real photos explicitly prints "EAU DE
// TOILETTE" on the box, confirmed directly from the archive files, not
// the reference screenshots.
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
    { slug: "180", name_en: "Victoria Flower Florette Seductive Eau de Toilette – 30ml", name_ar: "فيكتوريا فلاور فلوريت سيدكتيف - أو دو تواليت 30 مل", gender: "women" },
    { slug: "181", name_en: "Victoria Flower Florette Passionate Eau de Toilette – 30ml", name_ar: "فيكتوريا فلاور فلوريت باشونيت - أو دو تواليت 30 مل", gender: "women" },
    { slug: "182", name_en: "Victoria Flower Florette Delicate Eau de Toilette – 30ml", name_ar: "فيكتوريا فلاور فلوريت ديليكيت - أو دو تواليت 30 مل", gender: "women" },
    { slug: "183", name_en: "Victoria Flower – Crimson Flame Eau de Toilette – 30ml", name_ar: "فيكتوريا فلاور – كريمسون فليم أو دو تواليت 30 مل", gender: "women" },
  ];

  const created: { slug: string; id?: string; error?: string }[] = [];
  for (const p of PRODUCTS) {
    const form = new FormData();
    form.set("name_en", p.name_en);
    form.set("name_ar", p.name_ar);
    form.set("slug", p.slug);
    form.set("category_id", category.id);
    form.set("brand_id", brand.id);
    form.set("gender", p.gender);
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
