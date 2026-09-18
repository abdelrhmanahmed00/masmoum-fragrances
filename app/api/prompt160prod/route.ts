import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { findOrCreateBrand } from "@/lib/admin/brands";
import { createProduct } from "@/lib/admin/products";

// TEMPORARY -- Prompt 160 batch-create route, deleted immediately after
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

  // 2) Le Vie Di Milano: find-or-create.
  const brandForm = new FormData();
  brandForm.set("name_en", "Le Vie Di Milano");
  brandForm.set("name_ar", "لو في دي ميلانو");
  brandForm.set("slug", "le-vie-di-milano");
  brandForm.set("is_active", "on");

  const brandResult = await findOrCreateBrand(supabase, brandForm);
  if (brandResult.status !== "success") {
    return NextResponse.json({ status: "error", step: "levie-brand", message: brandResult.message });
  }
  const levieBrandId = brandResult.brand.id;

  // 3) Category: look up only.
  const { data: category, error: categoryError } = await supabase
    .from("categories")
    .select("id, slug, name_en")
    .eq("slug", "perfumes")
    .maybeSingle();
  if (categoryError || !category) {
    return NextResponse.json({ status: "error", step: "category", message: categoryError?.message ?? "not found" });
  }

  const PRODUCTS = [
    { slug: "123", name_en: "Memwa Afternoon Swim Eau de Parfum – 100ml", name_ar: "مي موا أفترنون سويم - أو دو بارفان 100 مل", gender: "unisex", brandId: memwaBrand.id, descEn: "Memwa", descAr: "مي موا", moq: "72" },
    { slug: "124", name_en: "Memwa Spell On You Eau de Parfum – 100ml", name_ar: "مي موا سبيل أون يو - أو دو بارفان 100 مل", gender: "women", brandId: memwaBrand.id, descEn: "Memwa", descAr: "مي موا", moq: "72" },
    { slug: "125", name_en: "Le Vie Di Milano Lady Rose Eau de Toilette – 80ml", name_ar: "لو في دي ميلانو ليدي روز - أو دو تواليت 80 مل", gender: "women", brandId: levieBrandId, descEn: "Le Vie Di Milano", descAr: "لو في دي ميلانو", moq: "48" },
    { slug: "126", name_en: "Le Vie Di Milano Ever Girl Eau de Toilette – 80ml", name_ar: "لو في دي ميلانو إيفر جيرل - أو دو تواليت 80 مل", gender: "women", brandId: levieBrandId, descEn: "Le Vie Di Milano", descAr: "لو في دي ميلانو", moq: "48" },
    { slug: "127", name_en: "Le Vie Di Milano Tompavali Eau de Toilette – 80ml", name_ar: "لو في دي ميلانو تومبافالي - أو دو تواليت 80 مل", gender: "women", brandId: levieBrandId, descEn: "Le Vie Di Milano", descAr: "لو في دي ميلانو", moq: "48" },
    { slug: "128", name_en: "Le Vie Di Milano Royal Palace Eau de Toilette – 80ml", name_ar: "لو في دي ميلانو رويال بالاس - أو دو تواليت 80 مل", gender: "women", brandId: levieBrandId, descEn: "Le Vie Di Milano", descAr: "لو في دي ميلانو", moq: "48" },
    { slug: "129", name_en: "Memwa Bolsare Rose Golden Eau de Toilette for Women – 80ml", name_ar: "مي موا بولساري روز جولدن - أو دو تواليت نسائي 80 مل", gender: "women", brandId: memwaBrand.id, descEn: "Memwa", descAr: "مي موا", moq: "72" },
    { slug: "130", name_en: "Memwa Olympeat Eau de Toilette for Women – 100ml", name_ar: "مي موا أوليمبيت - أو دو تواليت نسائي 100 مل", gender: "women", brandId: memwaBrand.id, descEn: "Memwa", descAr: "مي موا", moq: "72" },
    { slug: "131", name_en: "Memwa Sè Giorgio Mirani Eau de Parfum for Women – 100ml", name_ar: "مي موا سيه جورجيو ميراني - أو دو بارفان نسائي 100 مل", gender: "women", brandId: memwaBrand.id, descEn: "Memwa", descAr: "مي موا", moq: "72" },
    { slug: "132", name_en: "Memwa Sè Passion Eau de Parfum for Women – 100ml", name_ar: "مي موا سيه باشن - أو دو بارفان نسائي 100 مل", gender: "women", brandId: memwaBrand.id, descEn: "Memwa", descAr: "مي موا", moq: "72" },
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
    levieBrand: { id: levieBrandId, created: brandResult.brand },
    category,
    created,
  });
}
