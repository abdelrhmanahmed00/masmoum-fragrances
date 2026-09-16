import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createProduct } from "@/lib/admin/products";

// TEMPORARY -- Prompt 155 batch-create route, deleted immediately after
// use. Deployed to and invoked against PRODUCTION, same discipline as
// every prior batch. Brand and category are LOOKED UP only (both already
// exist from Prompt 154) -- no create path needed here.
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
    .eq("slug", "memwa")
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
    { slug: "090", name_en: "Memwa Mini Black Diamond Eau de Toilette for Women – 30ml", name_ar: "مي موا ميني بلاك دايموند - أو دو تواليت نسائي 30 مل", gender: "women" },
    { slug: "091", name_en: "Memwa Mini Black Diamond Eau de Toilette for Men – 30ml", name_ar: "مي موا ميني بلاك دايموند - أو دو تواليت رجالي 30 مل", gender: "men" },
    { slug: "092", name_en: "Memwa Lady Billion Eau de Toilette for Women – 30ml", name_ar: "مي موا ليدي بيليون - أو دو تواليت نسائي 30 مل", gender: "women" },
    { slug: "093", name_en: "Memwa Mini Bouquet Red Eau de Toilette for Women – 25ml", name_ar: "مي موا ميني بوكيه ريد - أو دو تواليت نسائي 25 مل", gender: "women" },
    { slug: "094", name_en: "Memwa IDÔTI Aura Eau de Parfum – 50ml", name_ar: "مي موا آيدوتي أورا - أو دو بارفان 50 مل", gender: "not_applicable" },
    { slug: "095", name_en: "Memwa IDÔTI L'Intense Eau de Parfum – 50ml", name_ar: "مي موا آيدوتي لانتنس - أو دو بارفان 50 مل", gender: "not_applicable" },
    { slug: "096", name_en: "Memwa IDÔTI Aura Eau de Parfum – 30ml", name_ar: "مي موا آيدوتي أورا - أو دو بارفان 30 مل", gender: "not_applicable" },
    { slug: "097", name_en: "Memwa IDÔTI Nectar Eau de Parfum – 30ml", name_ar: "مي موا آيدوتي نيكتار - أو دو بارفان 30 مل", gender: "not_applicable" },
    { slug: "098", name_en: "Memwa IDÔTI Le Parfum Eau de Parfum – 30ml", name_ar: "مي موا آيدوتي لو بارفان - أو دو بارفان 30 مل", gender: "not_applicable" },
    { slug: "099", name_en: "Memwa IDÔTI L'Intense Eau de Parfum – 30ml", name_ar: "مي موا آيدوتي لانتنس - أو دو بارفان 30 مل", gender: "not_applicable" },
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
    form.set("description_en", "Memwa");
    form.set("description_ar", "مي موا");
    form.set("moq", "72");
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
