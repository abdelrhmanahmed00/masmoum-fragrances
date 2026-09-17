import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createProduct } from "@/lib/admin/products";

// TEMPORARY -- Prompt 158 batch-create route, deleted immediately after
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
    .eq("slug", "any-klaen")
    .maybeSingle();

  if (brandError || !brand) {
    return NextResponse.json({ status: "error", step: "brand", message: brandError?.message ?? "not found" });
  }

  const { data: category, error: categoryError } = await supabase
    .from("categories")
    .select("id, slug, name_en")
    .eq("slug", "body-mist")
    .maybeSingle();

  if (categoryError || !category) {
    return NextResponse.json({ status: "error", step: "category", message: categoryError?.message ?? "not found" });
  }

  const PRODUCTS = [
    { slug: "106", name_en: "Any Klaen Sunset Aura Perfume Mist – 100ml", name_ar: "آني كلاين صانسيت أورا بيرفيوم ميست 100 مل" },
    { slug: "107", name_en: "Any Klaen Spicy Touch Perfume Mist – 100ml", name_ar: "آني كلاين سبايسي تاتش بيرفيوم ميست 100 مل" },
    { slug: "108", name_en: "Any Klaen Cherry Blossoms Perfume Mist – 100ml", name_ar: "آني كلاين تشيري بلوسمز بيرفيوم ميست 100 مل" },
    { slug: "109", name_en: "Any Klaen Livy Touch Perfume Mist – 100ml", name_ar: "آني كلاين ليفي تاتش بيرفيوم ميست 100 مل" },
    { slug: "110", name_en: "Any Klaen Sweet Honey Perfume Mist – 100ml", name_ar: "آني كلاين سويت هني بيرفيوم ميست 100 مل" },
    { slug: "111", name_en: "Any Klaen Arctic Perfume Mist – 100ml", name_ar: "آني كلاين آركتيك بيرفيوم ميست 100 مل" },
    { slug: "112", name_en: "Any Klaen Wild Orchid Perfume Mist – 100ml", name_ar: "آني كلاين وايلد أوركيد بيرفيوم ميست 100 مل" },
    { slug: "113", name_en: "Any Klaen Red Carpet Perfume Mist – 100ml", name_ar: "آني كلاين ريد كاربت بيرفيوم ميست 100 مل" },
    { slug: "114", name_en: "Any Klaen Silver Arrow Perfume Mist – 100ml", name_ar: "آني كلاين سيلفر أرو بيرفيوم ميست 100 مل" },
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
    form.set("description_en", "Any Klaen");
    form.set("description_ar", "آني كلاين");
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
