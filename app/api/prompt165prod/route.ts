import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createProduct } from "@/lib/admin/products";

// TEMPORARY -- Prompt 165 batch-create route, deleted immediately after
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
    { slug: "153", name_en: "Memwa Mini Ocean Eau de Toilette for Men – 25ml", name_ar: "مي موا ميني أوشن - أو دو تواليت رجالي 25 مل", gender: "men" },
    { slug: "154", name_en: "Memwa Mini Olympia Eau de Toilette for Women – 30ml", name_ar: "مي موا ميني أوليمبيا - أو دو تواليت نسائي 30 مل", gender: "women" },
    { slug: "155", name_en: "Memwa Mini Fahrinnhie Eau de Toilette for Men – 30ml", name_ar: "مي موا ميني فارينهاي - أو دو تواليت رجالي 30 مل", gender: "men" },
    { slug: "156", name_en: "Memwa Emvektos Eau de Toilette for Men – 30ml", name_ar: "مي موا إمفيكتوس - أو دو تواليت رجالي 30 مل", gender: "men" },
    { slug: "157", name_en: "Memwa Sê Eau de Toilette for Women – 30ml", name_ar: "مي موا سيه - أو دو تواليت نسائي 30 مل", gender: "women" },
    { slug: "158", name_en: "Memwa Sê Red Eau de Toilette for Women – 30ml", name_ar: "مي موا سيه ريد - أو دو تواليت نسائي 30 مل", gender: "women" },
    { slug: "159", name_en: "Memwa Silver Eau de Toilette for Men – 30ml", name_ar: "مي موا سيلفر - أو دو تواليت رجالي 30 مل", gender: "men" },
    { slug: "160", name_en: "Memwa Mini My Life Eau de Toilette for Women – 35ml", name_ar: "مي موا ميني ماي لايف - أو دو تواليت نسائي 35 مل", gender: "women" },
    { slug: "161", name_en: "Memwa Mini Sunrise Ecseda Eau de Toilette for Women – 30ml", name_ar: "مي موا ميني صانرايز إكسيدا - أو دو تواليت نسائي 30 مل", gender: "women" },
    { slug: "162", name_en: "Memwa Good Lady Red Eau de Toilette for Women – 40ml", name_ar: "مي موا جود ليدي ريد - أو دو تواليت نسائي 40 مل", gender: "women" },
    { slug: "163", name_en: "Memwa Good Lady Eau de Toilette for Women – 40ml", name_ar: "مي موا جود ليدي - أو دو تواليت نسائي 40 مل", gender: "women" },
    { slug: "164", name_en: "Memwa Good Lady Blue Glitters Eau de Toilette for Women – 40ml", name_ar: "مي موا جود ليدي بلو جليترز - أو دو تواليت نسائي 40 مل", gender: "women" },
    { slug: "165", name_en: "Memwa Team Fire Eau de Toilette for Men – 30ml", name_ar: "مي موا تيم فاير - أو دو تواليت رجالي 30 مل", gender: "men" },
    { slug: "166", name_en: "Memwa J'adore Eau de Toilette for Women – 30ml", name_ar: "مي موا جادور - أو دو تواليت نسائي 30 مل", gender: "women" },
    { slug: "167", name_en: "Memwa Dark XS Eau de Toilette for Men – 30ml", name_ar: "مي موا دارك إكس إس - أو دو تواليت رجالي 30 مل", gender: "men" },
    { slug: "168", name_en: "Memwa 7 Land Eau de Toilette for Men – 30ml", name_ar: "مي موا 7 لاند - أو دو تواليت رجالي 30 مل", gender: "men" },
    { slug: "169", name_en: "Memwa Bamboo Eau de Toilette for Women – 30ml", name_ar: "مي موا بامبو - أو دو تواليت نسائي 30 مل", gender: "women" },
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
