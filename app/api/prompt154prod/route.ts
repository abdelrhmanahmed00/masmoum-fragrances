import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { findOrCreateBrand } from "@/lib/admin/brands";
import { createProduct } from "@/lib/admin/products";

// TEMPORARY -- Prompt 154 batch-create route, deleted immediately after
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

  // 1) Brand: find-or-create "Memwa".
  const brandForm = new FormData();
  brandForm.set("name_en", "Memwa");
  brandForm.set("name_ar", "مي موا");
  brandForm.set("slug", "memwa");
  brandForm.set("is_active", "on");

  const brandResult = await findOrCreateBrand(supabase, brandForm);
  if (brandResult.status !== "success") {
    return NextResponse.json({ status: "error", step: "brand", message: brandResult.message });
  }
  const brandId = brandResult.brand.id;

  // 2) Category: look up "perfumes".
  const { data: category, error: categoryError } = await supabase
    .from("categories")
    .select("id, slug, name_en")
    .eq("slug", "perfumes")
    .maybeSingle();

  if (categoryError || !category) {
    return NextResponse.json({
      status: "error",
      step: "category",
      message: categoryError?.message ?? "Category not found",
    });
  }
  const categoryId = category.id;

  // 3) Create 10 distinct products, slugs 080-089, each with its own real
  // gender (per the task's explicit name_en/name_ar/gender per slug).
  const PRODUCTS = [
    { slug: "080", name_en: "Memwa 1212 VIP Men Eau de Toilette for Men – 30ml", name_ar: "مي موا 1212 في آي بي رجالي - أو دو تواليت رجالي 30 مل", gender: "men" },
    { slug: "081", name_en: "Memwa Black Eau de Toilette for Men – 30ml", name_ar: "مي موا بلاك - أو دو تواليت رجالي 30 مل", gender: "men" },
    { slug: "082", name_en: "Memwa Demir Homme Sport Eau de Toilette for Men – 30ml", name_ar: "مي موا ديمير هوم سبورت - أو دو تواليت رجالي 30 مل", gender: "men" },
    { slug: "083", name_en: "Memwa Mini 7 Land Eau de Toilette for Men – 30ml", name_ar: "مي موا ميني 7 لاند - أو دو تواليت رجالي 30 مل", gender: "men" },
    { slug: "084", name_en: "Memwa Mini SKKS Eau de Toilette for Men – 30ml", name_ar: "مي موا ميني إس كي كي إس - أو دو تواليت رجالي 30 مل", gender: "men" },
    { slug: "085", name_en: "Memwa Mini Valencia Eau de Toilette for Men – 30ml", name_ar: "مي موا ميني فالنسيا - أو دو تواليت رجالي 30 مل", gender: "men" },
    { slug: "086", name_en: "Memwa Mini In Love With You Eau de Toilette for Men – 25ml", name_ar: "مي موا ميني إن لاف ويذ يو - أو دو تواليت رجالي 25 مل", gender: "men" },
    { slug: "087", name_en: "Memwa Mini Coco Monalisa Chantael Eau de Toilette for Women – 30ml", name_ar: "مي موا ميني كوكو موناليزا شانتيل - أو دو تواليت نسائي 30 مل", gender: "women" },
    { slug: "088", name_en: "Memwa Mini Eau de Toilette for Women No. 150 – 30ml", name_ar: "مي موا ميني أو دو تواليت نسائي رقم 150 - 30 مل", gender: "women" },
    { slug: "089", name_en: "Memwa Mini Eau de Toilette for Women No. 151 – 30ml", name_ar: "مي موا ميني أو دو تواليت نسائي رقم 151 - 30 مل", gender: "women" },
  ];

  const created: { slug: string; id?: string; error?: string }[] = [];
  for (const p of PRODUCTS) {
    const form = new FormData();
    form.set("name_en", p.name_en);
    form.set("name_ar", p.name_ar);
    form.set("slug", p.slug);
    form.set("category_id", categoryId);
    form.set("brand_id", brandId);
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

  return NextResponse.json({
    status: "done",
    brand: { id: brandId, created: brandResult.brand },
    category: { id: categoryId, slug: category.slug },
    created,
  });
}
