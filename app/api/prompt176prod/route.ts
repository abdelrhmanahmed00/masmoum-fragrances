import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createProduct, deleteProduct } from "@/lib/admin/products";
import { revalidateTag } from "next/cache";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const PERFUMES_CATEGORY = "097c0b40-8ecf-4630-8c95-cd977edb7235";
const VICTORIA_FLOWER_BRAND = "32ec3742-ac6c-4733-9894-3f426ab613c2";

// The 8 real generic "Victoria Flower Perfume 20ml" rows (slugs 031-038),
// confirmed from the live DB before this route was written.
const OLD_IDS = [
  "ecf077fa-77c7-4486-aa76-c9b1baa73bc1",
  "35a21104-fefc-4ff0-a317-53a766349d90",
  "f1f6aff7-6693-409d-b99c-719611a335e3",
  "6b7e0534-e6e4-4602-8179-54c33920e1d5",
  "fb6ccffc-aa7b-4a4a-b2f5-53235e5560be",
  "2e73fa18-9e39-477e-9d82-24dbe7a9dc35",
  "293479e0-1a0d-441f-97fc-2bca911a9285",
  "29177a64-6c57-4028-92d8-f1576dd3199e",
];

const PRODUCTS: Array<{ slug: string; name_en: string; name_ar: string; gender: string }> = [
  { slug: "237", name_en: "Victoria Flower \u2013 Royal Steps", name_ar: "\u0641\u064a\u0643\u062a\u0648\u0631\u064a\u0627 \u0641\u0644\u0627\u0648\u0631 \u2013 \u0631\u0648\u064a\u0627\u0644 \u0633\u062a\u0628\u0633", gender: "men" },
  { slug: "238", name_en: "Victoria Flower \u2013 Midnight Crest", name_ar: "\u0641\u064a\u0643\u062a\u0648\u0631\u064a\u0627 \u0641\u0644\u0627\u0648\u0631 \u2013 \u0645\u064a\u062f\u0646\u0627\u064a\u062a \u0643\u0631\u064a\u0633\u062a", gender: "unisex" },
  { slug: "239", name_en: "Victoria Flower \u2013 Auric Design", name_ar: "\u0641\u064a\u0643\u062a\u0648\u0631\u064a\u0627 \u0641\u0644\u0627\u0648\u0631 \u2013 \u0623\u0648\u0631\u064a\u0643 \u062f\u064a\u0632\u0627\u064a\u0646", gender: "unisex" },
  { slug: "240", name_en: "Victoria Flower \u2013 Ivory Flame White", name_ar: "\u0641\u064a\u0643\u062a\u0648\u0631\u064a\u0627 \u0641\u0644\u0627\u0648\u0631 \u2013 \u0622\u064a\u0641\u0648\u0631\u064a \u0641\u0644\u064a\u0645 \u0648\u0627\u064a\u062a", gender: "women" },
  { slug: "241", name_en: "Victoria Flower \u2013 Ivory Flame Brown", name_ar: "\u0641\u064a\u0643\u062a\u0648\u0631\u064a\u0627 \u0641\u0644\u0627\u0648\u0631 \u2013 \u0622\u064a\u0641\u0648\u0631\u064a \u0641\u0644\u064a\u0645 \u0628\u0631\u0627\u0648\u0646", gender: "men" },
  { slug: "242", name_en: "Victoria Flower \u2013 Azure Veil", name_ar: "\u0641\u064a\u0643\u062a\u0648\u0631\u064a\u0627 \u0641\u0644\u0627\u0648\u0631 \u2013 \u0623\u0632\u0648\u0631 \u0641\u064a\u0644", gender: "women" },
  { slug: "243", name_en: "Victoria Flower \u2013 Black Night", name_ar: "\u0641\u064a\u0643\u062a\u0648\u0631\u064a\u0627 \u0641\u0644\u0627\u0648\u0631 \u2013 \u0628\u0644\u0627\u0643 \u0646\u0627\u064a\u062a", gender: "men" },
  { slug: "244", name_en: "Victoria Flower \u2013 Crimson Vew", name_ar: "\u0641\u064a\u0643\u062a\u0648\u0631\u064a\u0627 \u0641\u0644\u0627\u0648\u0631 \u2013 \u0643\u0631\u064a\u0645\u0633\u0648\u0646 \u0641\u064a\u0648", gender: "women" },
];

export async function POST(req: Request) {
  const auth = req.headers.get("authorization");
  const action = new URL(req.url).searchParams.get("action");
  const supabase = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: auth ?? "" } },
  });

  if (action === "delete") {
    const results: Array<{ id: string; status: string; message?: string }> = [];
    for (const id of OLD_IDS) {
      const result = await deleteProduct(supabase, id);
      results.push(
        result.status === "success"
          ? { id, status: "success" }
          : { id, status: "error", message: "message" in result ? result.message : "unknown error" }
      );
    }
    revalidateTag("products", { expire: 0 });
    revalidateTag("categories", { expire: 0 });
    return NextResponse.json({ results });
  }

  if (action === "create") {
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
      form.set("description_ar", "\u0641\u064a\u0643\u062a\u0648\u0631\u064a\u0627 \u0641\u0644\u0627\u0648\u0631");
      form.set("moq", "48");
      form.set("is_active", "on");

      const result = await createProduct(supabase, form);
      results.push(
        result.status === "success"
          ? { slug: p.slug, status: "success", id: result.id }
          : { slug: p.slug, status: "error", message: "message" in result ? result.message : "unknown error" }
      );
    }
    revalidateTag("products", { expire: 0 });
    revalidateTag("categories", { expire: 0 });
    return NextResponse.json({ results });
  }

  return NextResponse.json({ error: "unknown action" }, { status: 400 });
}
