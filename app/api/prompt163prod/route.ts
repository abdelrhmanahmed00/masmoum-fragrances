import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { findOrCreateBrand } from "@/lib/admin/brands";
import { createProduct } from "@/lib/admin/products";

// TEMPORARY -- Prompt 163 batch-create route, deleted immediately after
// use. Deployed to and invoked against PRODUCTION, same discipline as
// every prior batch.
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

  // 1) Memwa: look up only.
  const { data: memwaBrand, error: memwaBrandError } = await supabase
    .from("brands")
    .select("id, slug, name_en")
    .eq("slug", "memwa")
    .maybeSingle();
  if (memwaBrandError || !memwaBrand) {
    return NextResponse.json({ status: "error", step: "memwa-brand", message: memwaBrandError?.message ?? "not found" });
  }

  // 2) Alomda: find-or-create (confirmed via real DB check before this
  // route ran that no such brand row exists yet).
  const alomdaForm = new FormData();
  alomdaForm.set("name_en", "Alomda");
  alomdaForm.set("name_ar", "العمدة");
  alomdaForm.set("slug", "alomda");
  alomdaForm.set("is_active", "on");
  const alomdaResult = await findOrCreateBrand(supabase, alomdaForm);
  if (alomdaResult.status !== "success") {
    return NextResponse.json({ status: "error", step: "alomda-brand", message: alomdaResult.message });
  }
  const alomdaBrandId = alomdaResult.brand.id;

  // 3) Kalemat: find-or-create.
  const kalematForm = new FormData();
  kalematForm.set("name_en", "Kalemat");
  kalematForm.set("name_ar", "كلمات");
  kalematForm.set("slug", "kalemat");
  kalematForm.set("is_active", "on");
  const kalematResult = await findOrCreateBrand(supabase, kalematForm);
  if (kalematResult.status !== "success") {
    return NextResponse.json({ status: "error", step: "kalemat-brand", message: kalematResult.message });
  }
  const kalematBrandId = kalematResult.brand.id;

  // 4) Category: look up only.
  const { data: category, error: categoryError } = await supabase
    .from("categories")
    .select("id, slug, name_en")
    .eq("slug", "perfumes")
    .maybeSingle();
  if (categoryError || !category) {
    return NextResponse.json({ status: "error", step: "category", message: categoryError?.message ?? "not found" });
  }

  const PRODUCTS = [
    { slug: "133", name_en: "Memwa La Peris Possibilities Eau de Parfum – 80ml", name_ar: "مي موا لا بيريس بوسيبيليتيز - أو دو بارفان 80 مل", gender: "women", brandId: memwaBrand.id, descEn: "Memwa", descAr: "مي موا", moq: "72" },
    { slug: "134", name_en: "Memwa La Peris My Day Eau de Parfum – 80ml", name_ar: "مي موا لا بيريس ماي داي - أو دو بارفان 80 مل", gender: "women", brandId: memwaBrand.id, descEn: "Memwa", descAr: "مي موا", moq: "72" },
    { slug: "135", name_en: "Alomda 70 Eau de Toilette – 80ml", name_ar: "العمدة 70 - أو دو تواليت 80 مل", gender: "men", brandId: alomdaBrandId, descEn: "Alomda", descAr: "العمدة", moq: "72" },
    { slug: "136", name_en: "Memwa Good Lady Red Eau de Toilette for Women – 90ml", name_ar: "مي موا جود ليدي ريد - أو دو تواليت نسائي 90 مل", gender: "women", brandId: memwaBrand.id, descEn: "Memwa", descAr: "مي موا", moq: "72" },
    { slug: "137", name_en: "Memwa Good Lady Eau de Toilette for Women – 90ml", name_ar: "مي موا جود ليدي - أو دو تواليت نسائي 90 مل", gender: "women", brandId: memwaBrand.id, descEn: "Memwa", descAr: "مي موا", moq: "72" },
    { slug: "138", name_en: "Memwa Fantom Baco Ribbon for Men", name_ar: "مي موا فانتوم باكو ريبون رجالي", gender: "men", brandId: memwaBrand.id, descEn: "Memwa", descAr: "مي موا", moq: "72" },
    { slug: "139", name_en: "Memwa Fame Shining Gold Baco Ribbon for Women", name_ar: "مي موا فيم شايننج جولد باكو ريبون نسائي", gender: "women", brandId: memwaBrand.id, descEn: "Memwa", descAr: "مي موا", moq: "72" },
    { slug: "140", name_en: "Kalemat Jasmin Rouge Eau de Parfum – 100ml", name_ar: "كلمات جاسمين روج - أو دو بارفان 100 مل", gender: "women", brandId: kalematBrandId, descEn: "Kalemat", descAr: "كلمات", moq: "72" },
    { slug: "141", name_en: "Kalemat Mandarino Di Amalfi Eau de Parfum – 100ml", name_ar: "كلمات ماندارينو دي أمالفي - أو دو بارفان 100 مل", gender: "unisex", brandId: kalematBrandId, descEn: "Kalemat", descAr: "كلمات", moq: "72" },
    { slug: "142", name_en: "Memwa Sivaro Eau de Toilette for Men – 110ml", name_ar: "مي موا سيفارو - أو دو تواليت رجالي 110 مل", gender: "men", brandId: memwaBrand.id, descEn: "Memwa", descAr: "مي موا", moq: "72" },
  ];

  const created: { slug: string; id?: string; error?: string }[] = [];
  for (const p of PRODUCTS) {
    const form = new FormData();
    form.set("name_en", p.name_en);
    form.set("name_ar", p.name_ar);
    form.set("slug", p.slug);
    form.set("category_id", category.id);
    form.set("brand_id", p.brandId);
    form.set("gender", p.gender);
    form.set("description_en", p.descEn);
    form.set("description_ar", p.descAr);
    form.set("moq", p.moq);
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

  return NextResponse.json({
    status: "done",
    memwaBrand,
    alomdaBrand: { id: alomdaBrandId, created: alomdaResult.brand },
    kalematBrand: { id: kalematBrandId, created: kalematResult.brand },
    category,
    created,
  });
}
