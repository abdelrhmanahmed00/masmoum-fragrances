import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createProduct } from "@/lib/admin/products";
import { revalidateTag } from "next/cache";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const PERFUMES_CATEGORY = "097c0b40-8ecf-4630-8c95-cd977edb7235";
const BODY_MIST_CATEGORY = "1ccb27eb-1e32-49c5-81eb-e4cbd398bf86";
const VICTORIA_FLOWER_BRAND = "32ec3742-ac6c-4733-9894-3f426ab613c2";

const PRODUCTS: Array<{
  slug: string;
  name_en: string;
  name_ar: string;
  category_id: string;
  gender: string;
}> = [
  // Group A -- Victoria Flower Room Spray, Perfumes category (per explicit
  // client instruction overriding the real-evidence Home Fragrance read),
  // gender "unisex" so it's reachable via the Perfumes category's
  // gender-tile navigation (that category always shows the 4-tile picker
  // when no ?gender= is present -- a not_applicable product would never
  // surface there).
  {
    slug: "184",
    name_en: "Victoria Flower – Ghazal Alsharq Room Spray – 300ml",
    name_ar: "فيكتوريا فلاور – غزال الشرق معطر للمنزل والمفروشات – 300 مل",
    category_id: PERFUMES_CATEGORY,
    gender: "unisex",
  },
  {
    slug: "185",
    name_en: "Victoria Flower – Eishq Room Spray – 300ml",
    name_ar: "فيكتوريا فلاور – عشق معطر للمنزل والمفروشات – 300 مل",
    category_id: PERFUMES_CATEGORY,
    gender: "unisex",
  },
  {
    slug: "186",
    name_en: "Victoria Flower – Shaghaf Room Spray – 300ml",
    name_ar: "فيكتوريا فلاور – شغف معطر للمنزل والمفروشات – 300 مل",
    category_id: PERFUMES_CATEGORY,
    gender: "unisex",
  },
  {
    slug: "187",
    name_en: "Victoria Flower – Diwan Room Spray – 300ml",
    name_ar: "فيكتوريا فلاور – ديوان معطر للمنزل والمفروشات – 300 مل",
    category_id: PERFUMES_CATEGORY,
    gender: "unisex",
  },
  {
    slug: "188",
    name_en: "Victoria Flower – Hams Allayali Room Spray – 300ml",
    name_ar: "فيكتوريا فلاور – همس الليالي معطر للمنزل والمفروشات – 300 مل",
    category_id: PERFUMES_CATEGORY,
    gender: "unisex",
  },
  {
    slug: "189",
    name_en: "Victoria Flower – Dhahab Alrimal Room Spray – 300ml",
    name_ar: "فيكتوريا فلاور – ذهب الرمال معطر للمنزل والمفروشات – 300 مل",
    category_id: PERFUMES_CATEGORY,
    gender: "unisex",
  },
  // Group B -- Victoria Flower Musk Collection Body Mist (per explicit
  // client instruction), Body Mist category, gender not_applicable
  // (matching the established convention for other flavor-line Body Mist
  // products -- Any Klaen Story Body Mist, Farfasha Pretty Little Girls --
  // Body Mist category has no gender-tile requirement unlike Perfumes).
  {
    slug: "190",
    name_en: "Victoria Flower Musk Collection Blueberry Body Mist",
    name_ar: "فيكتوريا فلاور مسك الطهارة توت بري بودي ميست",
    category_id: BODY_MIST_CATEGORY,
    gender: "not_applicable",
  },
  {
    slug: "191",
    name_en: "Victoria Flower Musk Collection Tropical Fruits Body Mist",
    name_ar: "فيكتوريا فلاور مسك الطهارة فواكه استوائية بودي ميست",
    category_id: BODY_MIST_CATEGORY,
    gender: "not_applicable",
  },
  {
    slug: "192",
    name_en: "Victoria Flower Musk Collection Pomegranate Body Mist",
    name_ar: "فيكتوريا فلاور مسك الطهارة رمان بودي ميست",
    category_id: BODY_MIST_CATEGORY,
    gender: "not_applicable",
  },
  {
    slug: "193",
    name_en: "Victoria Flower Musk Collection Pistachio Body Mist",
    name_ar: "فيكتوريا فلاور مسك الطهارة فستق بودي ميست",
    category_id: BODY_MIST_CATEGORY,
    gender: "not_applicable",
  },
  {
    slug: "194",
    name_en: "Victoria Flower Musk Collection Mysterious Tahara Body Mist",
    name_ar: "فيكتوريا فلاور مسك الطهارة مسك غامض بودي ميست",
    category_id: BODY_MIST_CATEGORY,
    gender: "not_applicable",
  },
  {
    slug: "195",
    name_en: "Victoria Flower Musk Collection Cotton Candy Body Mist",
    name_ar: "فيكتوريا فلاور مسك الطهارة غزل البنات بودي ميست",
    category_id: BODY_MIST_CATEGORY,
    gender: "not_applicable",
  },
];

export async function POST(req: Request) {
  const auth = req.headers.get("authorization");
  const supabase = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: auth ?? "" } },
  });

  const results: Array<{ slug: string; status: string; id?: string; message?: string }> = [];

  for (const p of PRODUCTS) {
    const form = new FormData();
    form.set("name_en", p.name_en);
    form.set("name_ar", p.name_ar);
    form.set("slug", p.slug);
    form.set("category_id", p.category_id);
    form.set("brand_id", VICTORIA_FLOWER_BRAND);
    form.set("gender", p.gender);
    form.set("description_en", "Victoria Flower");
    form.set(
      "description_ar",
      "فيكتوريا فلاور"
    );
    form.set("moq", "48");
    form.set("is_active", "on");
    // is_featured omitted -> false
    // sort_order omitted -> 0
    // stock_quantity omitted -> null

    const result = await createProduct(supabase, form);
    if (result.status === "success") {
      results.push({ slug: p.slug, status: "success", id: result.id });
    } else {
      results.push({
        slug: p.slug,
        status: "error",
        message: "message" in result ? result.message : "unknown error",
      });
    }
  }

  revalidateTag("products", { expire: 0 });
  revalidateTag("categories", { expire: 0 });

  return NextResponse.json({ results });
}
