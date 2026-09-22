import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createProduct } from "@/lib/admin/products";
import { revalidateTag } from "next/cache";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const PERFUMES_CATEGORY = "097c0b40-8ecf-4630-8c95-cd977edb7235";
const VICTORIA_FLOWER_BRAND = "32ec3742-ac6c-4733-9894-3f426ab613c2";

const PRODUCTS: Array<{
  slug: string;
  name_en: string;
  name_ar: string;
  gender: string;
}> = [
  // Group A -- Musk Collection EDP-shaped bottles, Victoria Flower brand.
  // No ml or "Eau de Parfum" text is printed on any of these 7 renders
  // (checked full label + base crop) -- category is Perfumes based on
  // visual bottle-shape inference only (thick rectangular glass + oval
  // cap, matching fine-fragrance convention), not a printed format word,
  // so the name omits an unconfirmed "Eau de Parfum"/size suffix rather
  // than assert a detail never actually read off the bottle. gender
  // "unisex" mirrors the closest real precedent (Golf Orchid Musk
  // Collection EDP siblings, slugs 119-122, also unisex) and keeps these
  // reachable via the Perfumes category's gender-tile navigation.
  {
    slug: "196",
    name_en: "Victoria Flower Musk Collection Tahara Vanilla",
    name_ar: "فيكتوريا فلاور مسك كوليكشن طهارة فانيليا",
    gender: "unisex",
  },
  {
    slug: "197",
    name_en: "Victoria Flower Musk Collection Tropical Fruits",
    name_ar: "فيكتوريا فلاور مسك كوليكشن تروبيكال فروتس",
    gender: "unisex",
  },
  {
    slug: "198",
    name_en: "Victoria Flower Musk Collection Pistachio",
    name_ar: "فيكتوريا فلاور مسك كوليكشن فستق",
    gender: "unisex",
  },
  {
    slug: "199",
    name_en: "Victoria Flower Musk Collection Pomegranate",
    name_ar: "فيكتوريا فلاور مسك كوليكشن رمان",
    gender: "unisex",
  },
  {
    slug: "200",
    name_en: "Victoria Flower Musk Collection Blueberry",
    name_ar: "فيكتوريا فلاور مسك كوليكشن بلوبيري",
    gender: "unisex",
  },
  {
    slug: "201",
    name_en: "Victoria Flower Musk Collection Angel Musk",
    name_ar: "فيكتوريا فلاور مسك كوليكشن انجل مسك",
    gender: "unisex",
  },
  {
    slug: "202",
    name_en: "Victoria Flower Musk Collection Cotton Candy",
    name_ar: "فيكتوريا فلاور مسك كوليكشن غزل البنات",
    gender: "unisex",
  },
  // Group B -- new named luxury line, Victoria Flower brand. Same "no
  // printed format/size" gap, so no suffix added. Gender assigned from
  // visual design-language cues (color palette, decoration style) since
  // nothing is printed -- see report for the reasoning per product.
  {
    slug: "203",
    name_en: "Victoria Flower – Gold Serpent",
    name_ar: "فيكتوريا فلاور – جولد سيربنت",
    gender: "men",
  },
  {
    slug: "204",
    name_en: "Victoria Flower – Albessia",
    name_ar: "فيكتوريا فلاور – البيسيا",
    gender: "women",
  },
  {
    slug: "205",
    name_en: "Victoria Flower – Rosavelle",
    name_ar: "فيكتوريا فلاور – روزافيل",
    gender: "women",
  },
  {
    slug: "206",
    name_en: "Victoria Flower – Veloura",
    name_ar: "فيكتوريا فلاور – فيلورا",
    gender: "women",
  },
  {
    slug: "207",
    name_en: "Victoria Flower – Noir Embrace",
    name_ar: "فيكتوريا فلاور – نوار إمبريس",
    gender: "unisex",
  },
  {
    slug: "208",
    name_en: "Victoria Flower – Lunaria",
    name_ar: "فيكتوريا فلاور – لوناريا",
    gender: "women",
  },
  {
    slug: "209",
    name_en: "Victoria Flower – Soft Allure",
    name_ar: "فيكتوريا فلاور – سوفت أليور",
    gender: "women",
  },
  {
    slug: "210",
    name_en: "Victoria Flower – Lunaria Black",
    name_ar: "فيكتوريا فلاور – لوناريا بلاك",
    gender: "women",
  },
  {
    slug: "211",
    name_en: "Victoria Flower – Noxen",
    name_ar: "فيكتوريا فلاور – نوكسين",
    gender: "men",
  },
  {
    slug: "212",
    name_en: "Victoria Flower – Lunaya",
    name_ar: "فيكتوريا فلاور – لونايا",
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
