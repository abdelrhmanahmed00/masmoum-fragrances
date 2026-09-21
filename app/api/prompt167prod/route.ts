import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createProduct } from "@/lib/admin/products";

// TEMPORARY -- Prompt 167 batch-create route, deleted immediately after
// use. Deployed to and invoked against PRODUCTION, same discipline as
// every prior batch. Brand and category are LOOKED UP only.
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
    { slug: "170", name_en: "Victoria Flower – Velvet Rouge Eau de Toilette – 30ml", name_ar: "فيكتوريا فلاور – فيلفيت روج أو دو تواليت 30 مل", gender: "women" },
    { slug: "171", name_en: "Victoria Flower – Velvet Midnight Eau de Toilette – 30ml", name_ar: "فيكتوريا فلاور – فيلفيت ميدنايت أو دو تواليت 30 مل", gender: "women" },
    { slug: "172", name_en: "Victoria Flower – Blush Bloom Eau de Toilette – 30ml", name_ar: "فيكتوريا فلاور – بلاش بلوم أو دو تواليت 30 مل", gender: "women" },
    { slug: "173", name_en: "Victoria Flower – Rose Muse Eau de Toilette – 100ml", name_ar: "فيكتوريا فلاور – روز ميوز أو دو تواليت 100 مل", gender: "women" },
    { slug: "174", name_en: "Victoria Flower – Solar Kiss Eau de Toilette – 100ml", name_ar: "فيكتوريا فلاور – سولار كيس أو دو تواليت 100 مل", gender: "women" },
    { slug: "175", name_en: "Victoria Flower – Cris Lumière Eau de Toilette – 30ml", name_ar: "فيكتوريا فلاور – كريس لوميير أو دو تواليت 30 مل", gender: "women" },
    { slug: "176", name_en: "Victoria Flower – Azure Muse Eau de Toilette – 100ml", name_ar: "فيكتوريا فلاور – آزور ميوز أو دو تواليت 100 مل", gender: "women" },
    { slug: "177", name_en: "Victoria Flower – Ocean Depth Eau de Toilette – 30ml", name_ar: "فيكتوريا فلاور – أوشن ديبث أو دو تواليت 30 مل", gender: "men" },
    { slug: "178", name_en: "Victoria Flower – Shadow King Eau de Toilette – 100ml", name_ar: "فيكتوريا فلاور – شادو كينج أو دو تواليت 100 مل", gender: "men" },
    { slug: "179", name_en: "Victoria Flower – Amber Root Eau de Toilette – 100ml", name_ar: "فيكتوريا فلاور – آمبر روت أو دو تواليت 100 مل", gender: "women" },
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
