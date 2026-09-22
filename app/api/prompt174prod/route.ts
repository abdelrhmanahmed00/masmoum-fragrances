import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createProduct } from "@/lib/admin/products";
import { revalidateTag } from "next/cache";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const PERFUMES_CATEGORY = "097c0b40-8ecf-4630-8c95-cd977edb7235";
const VICTORIA_FLOWER_BRAND = "32ec3742-ac6c-4733-9894-3f426ab613c2";

// No ml/format text is printed on any of these 10 renders (checked full
// label + base crop) -- category is Perfumes based on bottle-shape
// convention established in Prompt 173. Gender assigned from visual
// design language only (no printed gender text exists on any of them),
// same discipline as Prompt 173's Group B -- see report for reasoning
// per product. Two spelling notes, both printed exactly as read: #3's
// bottle shows both "NIRVNA" (block caps) and "Nirvana" (cursive
// signature) -- using "Nirvna" per the task's given list. #9's bottle
// prints "Ardorü" (with a diaeresis on the final letter) -- using
// "Ardoru" per the task's given list, spelling noted in the report.
const PRODUCTS: Array<{
  slug: string;
  name_en: string;
  name_ar: string;
  gender: string;
}> = [
  {
    slug: "213",
    name_en: "Victoria Flower – Obsidian Smoke",
    name_ar: "فيكتوريا فلاور – أوبسيديان سموك",
    gender: "men",
  },
  {
    slug: "214",
    name_en: "Victoria Flower – Elvora",
    name_ar: "فيكتوريا فلاور – إلفورا",
    gender: "women",
  },
  {
    slug: "215",
    name_en: "Victoria Flower – Nirvna",
    name_ar: "فيكتوريا فلاور – نيرفانا",
    gender: "unisex",
  },
  {
    slug: "216",
    name_en: "Victoria Flower – Néoma",
    name_ar: "فيكتوريا فلاور – نيوما",
    gender: "women",
  },
  {
    slug: "217",
    name_en: "Victoria Flower – Rosalite",
    name_ar: "فيكتوريا فلاور – روزاليت",
    gender: "women",
  },
  {
    slug: "218",
    name_en: "Victoria Flower – Verdania",
    name_ar: "فيكتوريا فلاور – فيردانيا",
    gender: "women",
  },
  {
    slug: "219",
    name_en: "Victoria Flower – Lumia",
    name_ar: "فيكتوريا فلاور – لوميا",
    gender: "women",
  },
  {
    slug: "220",
    name_en: "Victoria Flower – Silencium",
    name_ar: "فيكتوريا فلاور – سيلينسيوم",
    gender: "unisex",
  },
  {
    slug: "221",
    name_en: "Victoria Flower – Ardoru",
    name_ar: "فيكتوريا فلاور – أردورو",
    gender: "women",
  },
  {
    slug: "222",
    name_en: "Victoria Flower – Celestina",
    name_ar: "فيكتوريا فلاور – سيليستينا",
    gender: "women",
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
    form.set("category_id", PERFUMES_CATEGORY);
    form.set("brand_id", VICTORIA_FLOWER_BRAND);
    form.set("gender", p.gender);
    form.set("description_en", "Victoria Flower");
    form.set(
      "description_ar",
      "فيكتوريا فلاور"
    );
    form.set("moq", "48");
    form.set("is_active", "on");

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
