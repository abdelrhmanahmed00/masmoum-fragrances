import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createProduct } from "@/lib/admin/products";

// TEMPORARY -- Prompt 164 batch-create route, deleted immediately after
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
    { slug: "143", name_en: "Memwa Midnight Dream Eau de Parfum – 100ml", name_ar: "مي موا ميدنايت دريم - أو دو بارفان 100 مل", gender: "unisex" },
    { slug: "144", name_en: "Memwa Just Precious Eau de Parfum – 100ml", name_ar: "مي موا جاست بريشوس - أو دو بارفان 100 مل", gender: "women" },
    { slug: "145", name_en: "Memwa Sé Passione Eau de Toilette for Women – 100ml", name_ar: "مي موا سيه باشيوني - أو دو تواليت نسائي 100 مل", gender: "women" },
    { slug: "146", name_en: "Memwa Emperor Eau de Toilette for Men – 80ml", name_ar: "مي موا إمبراطور - أو دو تواليت رجالي 80 مل", gender: "men" },
    { slug: "147", name_en: "Memwa Emperor Eau de Toilette for Women – 80ml", name_ar: "مي موا إمبراطور - أو دو تواليت نسائي 80 مل", gender: "women" },
    { slug: "148", name_en: "Memwa Emvektos Eau de Toilette for Men Silver – 100ml", name_ar: "مي موا إمفيكتوس - أو دو تواليت رجالي سيلفر 100 مل", gender: "men" },
    { slug: "149", name_en: "Memwa Emvektos Eau de Toilette for Men Gold – 100ml", name_ar: "مي موا إمفيكتوس - أو دو تواليت رجالي جولد 100 مل", gender: "men" },
    { slug: "150", name_en: "Memwa Red Bag Eau de Toilette for Women – 120ml", name_ar: "مي موا ريد باج - أو دو تواليت نسائي 120 مل", gender: "women" },
    { slug: "151", name_en: "Memwa Lady in Blue Eau de Toilette for Women – 100ml", name_ar: "مي موا ليدي إن بلو - أو دو تواليت نسائي 100 مل", gender: "women" },
    { slug: "152", name_en: "Memwa Pink Bag Eau de Toilette for Women – 120ml", name_ar: "مي موا بينك باج - أو دو تواليت نسائي 120 مل", gender: "women" },
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
