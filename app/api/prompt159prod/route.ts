import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createProduct } from "@/lib/admin/products";

// TEMPORARY -- Prompt 159 batch-create route, deleted immediately after
// use. Deployed to and invoked against PRODUCTION, same discipline as
// every prior batch. All brands/category are LOOKED UP only -- no create
// path needed here.
//
// Correction from the task's own stated brand: all 4 "Musk Collection"
// products (119-122) are linked to the existing "Golf Orchid" brand, NOT
// Victoria Flower -- confirmed by the client after every one of the 4
// product boxes was found to read "BY GULF ORCHID" printed directly on
// the packaging (real, first-party evidence, overriding the task's own
// catalog-page-based assumption). description_en/ar for these 4 follows
// suit (Golf Orchid / جولف أوركيد, matching Prompt 149's own convention
// of description = brand name), not the task's stated "Victoria Flower".
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

  const { data: memwaBrand, error: memwaBrandError } = await supabase
    .from("brands")
    .select("id, slug, name_en")
    .eq("slug", "memwa")
    .maybeSingle();
  if (memwaBrandError || !memwaBrand) {
    return NextResponse.json({ status: "error", step: "memwa-brand", message: memwaBrandError?.message ?? "not found" });
  }

  const { data: golfOrchidBrand, error: golfOrchidBrandError } = await supabase
    .from("brands")
    .select("id, slug, name_en")
    .eq("slug", "golf-orchid")
    .maybeSingle();
  if (golfOrchidBrandError || !golfOrchidBrand) {
    return NextResponse.json({ status: "error", step: "golf-orchid-brand", message: golfOrchidBrandError?.message ?? "not found" });
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
    // Memwa
    { slug: "115", name_en: "Memwa Mini Hero Eau de Toilette for Men – 30ml", name_ar: "مي موا ميني هيرو - أو دو تواليت رجالي 30 مل", gender: "men", brandId: memwaBrand.id, descEn: "Memwa", descAr: "مي موا", moq: "72" },
    { slug: "116", name_en: "Memwa Aleen Eau de Toilette for Women – 30ml", name_ar: "مي موا آلين - أو دو تواليت نسائي 30 مل", gender: "women", brandId: memwaBrand.id, descEn: "Memwa", descAr: "مي موا", moq: "72" },
    { slug: "117", name_en: "Memwa Red Eau de Toilette for Men – 30ml", name_ar: "مي موا ريد - أو دو تواليت رجالي 30 مل", gender: "men", brandId: memwaBrand.id, descEn: "Memwa", descAr: "مي موا", moq: "72" },
    { slug: "118", name_en: "Memwa Mini So Cute Eau de Toilette for Women – 25ml", name_ar: "مي موا ميني سو كيوت - أو دو تواليت نسائي 25 مل", gender: "women", brandId: memwaBrand.id, descEn: "Memwa", descAr: "مي موا", moq: "72" },
    // Musk Collection -- corrected to Golf Orchid brand
    { slug: "119", name_en: "Golf Orchid Musk Collection Pomegranate Eau de Parfum – 60ml", name_ar: "جولف أوركيد مسك كوليكشن رمان أو دو بارفان 60 مل", gender: "unisex", brandId: golfOrchidBrand.id, descEn: "Golf Orchid", descAr: "جولف أوركيد", moq: "48" },
    { slug: "120", name_en: "Golf Orchid Musk Collection Tahara Vanilla Eau de Parfum – 60ml", name_ar: "جولف أوركيد مسك كوليكشن طهارة فانيليا أو دو بارفان 60 مل", gender: "unisex", brandId: golfOrchidBrand.id, descEn: "Golf Orchid", descAr: "جولف أوركيد", moq: "48" },
    { slug: "121", name_en: "Golf Orchid Musk Collection Tropical Fruits Eau de Parfum – 60ml", name_ar: "جولف أوركيد مسك كوليكشن تروبيكال فروتس أو دو بارفان 60 مل", gender: "unisex", brandId: golfOrchidBrand.id, descEn: "Golf Orchid", descAr: "جولف أوركيد", moq: "48" },
    { slug: "122", name_en: "Golf Orchid Musk Collection Blueberry Eau de Parfum – 60ml", name_ar: "جولف أوركيد مسك كوليكشن بلوبيري أو دو بارفان 60 مل", gender: "unisex", brandId: golfOrchidBrand.id, descEn: "Golf Orchid", descAr: "جولف أوركيد", moq: "48" },
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
    golfOrchidBrand,
    category,
    created,
  });
}
