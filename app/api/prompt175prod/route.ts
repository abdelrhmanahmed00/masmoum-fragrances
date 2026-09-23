import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createProduct, deleteProduct } from "@/lib/admin/products";
import { revalidateTag } from "next/cache";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const HOME_FRAGRANCE_CATEGORY = "c68ff5c4-891d-4a5f-b8e1-b02aea4f096a";
const ANY_KLAEN_BRAND = "ed097f09-3832-4945-b08e-fed4f99d5e8e";

// The 15 real generic "Any Klaen Air & Fabric Freshener 330ml" rows
// (slugs 011-025), confirmed from the live DB before this route was written.
const OLD_IDS = [
  "96787c2e-f15f-4754-abad-c971fe9a1a7c",
  "5cf49993-8205-43d3-8772-268bce58f767",
  "68529396-d963-436a-a0e2-fa8eb2023ef2",
  "9a47f923-41df-42a4-a065-ea33e9d07465",
  "1ab95ec5-1c36-431e-a982-2a571a6505f1",
  "1440d8eb-5d1a-481b-b5ae-b63547bf73aa",
  "24338257-3528-42a7-8eea-76c33851f6bf",
  "b21d2db3-2095-4fa4-aed0-1f0cb796e54d",
  "c74742ed-46f0-46a8-97cf-525f75819cd5",
  "1dc9bff5-a937-4bdc-bcf7-3ab9d03db7a7",
  "d91f5c04-01e7-4b27-9938-22f1c8599cde",
  "3f567928-bca2-49c1-8ee1-6e7e18abff4b",
  "f6c48665-5449-4680-8809-f737dc4cbd32",
  "945be96b-efe5-4483-a44f-4b741f6756ac",
  "6ecfd8db-a34a-4e24-9618-a93a57791052",
];

const PRODUCTS: Array<{ slug: string; name_en: string; name_ar: string }> = [
  { slug: "223", name_en: "Any Klaen Silent Bloom Bed & Fabric Fragrance \u2013 320ml", name_ar: "\u0622\u0646\u064a \u0643\u0644\u0627\u064a\u0646 \u0633\u0627\u064a\u0644\u0646\u062a \u0628\u0644\u0648\u0645 \u0645\u0639\u0637\u0631 \u0641\u0631\u0627\u0634 \u0648\u0623\u0642\u0645\u0634\u0629 320 \u0645\u0644" },
  { slug: "224", name_en: "Any Klaen Cherry Blossom Bed & Fabric Fragrance \u2013 300ml", name_ar: "\u0622\u0646\u064a \u0643\u0644\u0627\u064a\u0646 \u0634\u064a\u0631\u064a \u0628\u0644\u0648\u0633\u0648\u0645 \u0645\u0639\u0637\u0631 \u0641\u0631\u0627\u0634 \u0648\u0623\u0642\u0645\u0634\u0629 300 \u0645\u0644" },
  { slug: "225", name_en: "Any Klaen Bubble Gum Bed & Fabric Fragrance \u2013 300ml", name_ar: "\u0622\u0646\u064a \u0643\u0644\u0627\u064a\u0646 \u0628\u0627\u0628\u0644 \u062c\u0645 \u0645\u0639\u0637\u0631 \u0641\u0631\u0627\u0634 \u0648\u0623\u0642\u0645\u0634\u0629 300 \u0645\u0644" },
  { slug: "226", name_en: "Any Klaen Soft Harmony Bed & Fabric Fragrance \u2013 320ml", name_ar: "\u0622\u0646\u064a \u0643\u0644\u0627\u064a\u0646 \u0633\u0648\u0641\u062a \u0647\u0627\u0631\u0645\u0648\u0646\u064a \u0645\u0639\u0637\u0631 \u0641\u0631\u0627\u0634 \u0648\u0623\u0642\u0645\u0634\u0629 320 \u0645\u0644" },
  { slug: "227", name_en: "Any Klaen Secret Garden Bed & Fabric Fragrance \u2013 320ml", name_ar: "\u0622\u0646\u064a \u0643\u0644\u0627\u064a\u0646 \u0633\u064a\u0643\u0631\u062a \u062c\u0627\u0631\u062f\u0646 \u0645\u0639\u0637\u0631 \u0641\u0631\u0627\u0634 \u0648\u0623\u0642\u0645\u0634\u0629 320 \u0645\u0644" },
  { slug: "228", name_en: "Any Klaen Lavender Bed & Fabric Fragrance \u2013 300ml", name_ar: "\u0622\u0646\u064a \u0643\u0644\u0627\u064a\u0646 \u0644\u0627\u0641\u0646\u062f\u0631 \u0645\u0639\u0637\u0631 \u0641\u0631\u0627\u0634 \u0648\u0623\u0642\u0645\u0634\u0629 300 \u0645\u0644" },
  { slug: "229", name_en: "Any Klaen Vanilla Velvet Bed & Fabric Fragrance \u2013 300ml", name_ar: "\u0622\u0646\u064a \u0643\u0644\u0627\u064a\u0646 \u0641\u0627\u0646\u064a\u0644\u0627 \u0641\u064a\u0644\u0641\u062a \u0645\u0639\u0637\u0631 \u0641\u0631\u0627\u0634 \u0648\u0623\u0642\u0645\u0634\u0629 300 \u0645\u0644" },
  { slug: "230", name_en: "Any Klaen Luxe Harmony Bed & Fabric Fragrance \u2013 300ml", name_ar: "\u0622\u0646\u064a \u0643\u0644\u0627\u064a\u0646 \u0644\u0648\u0643\u0633 \u0647\u0627\u0631\u0645\u0648\u0646\u064a \u0645\u0639\u0637\u0631 \u0641\u0631\u0627\u0634 \u0648\u0623\u0642\u0645\u0634\u0629 300 \u0645\u0644" },
  { slug: "231", name_en: "Any Klaen Kiwi Bed & Fabric Fragrance \u2013 300ml", name_ar: "\u0622\u0646\u064a \u0643\u0644\u0627\u064a\u0646 \u0643\u064a\u0648\u064a \u0645\u0639\u0637\u0631 \u0641\u0631\u0627\u0634 \u0648\u0623\u0642\u0645\u0634\u0629 300 \u0645\u0644" },
  { slug: "232", name_en: "Any Klaen Oud Bed & Fabric Fragrance \u2013 300ml", name_ar: "\u0622\u0646\u064a \u0643\u0644\u0627\u064a\u0646 \u0639\u0648\u062f \u0645\u0639\u0637\u0631 \u0641\u0631\u0627\u0634 \u0648\u0623\u0642\u0645\u0634\u0629 300 \u0645\u0644" },
  { slug: "233", name_en: "Any Klaen Coconut Paradise Bed & Fabric Fragrance \u2013 300ml", name_ar: "\u0622\u0646\u064a \u0643\u0644\u0627\u064a\u0646 \u0643\u0648\u0643\u0648\u0646\u062a \u0628\u0627\u0631\u0627\u062f\u064a\u0633 \u0645\u0639\u0637\u0631 \u0641\u0631\u0627\u0634 \u0648\u0623\u0642\u0645\u0634\u0629 300 \u0645\u0644" },
  { slug: "234", name_en: "Any Klaen Bloom Essence Bed & Fabric Fragrance \u2013 320ml", name_ar: "\u0622\u0646\u064a \u0643\u0644\u0627\u064a\u0646 \u0628\u0644\u0648\u0645 \u0625\u064a\u0633\u0646\u0633 \u0645\u0639\u0637\u0631 \u0641\u0631\u0627\u0634 \u0648\u0623\u0642\u0645\u0634\u0629 320 \u0645\u0644" },
  { slug: "235", name_en: "Any Klaen Pure Grace Bed & Fabric Fragrance \u2013 320ml", name_ar: "\u0622\u0646\u064a \u0643\u0644\u0627\u064a\u0646 \u0628\u064a\u0648\u0631 \u062c\u0631\u064a\u0633 \u0645\u0639\u0637\u0631 \u0641\u0631\u0627\u0634 \u0648\u0623\u0642\u0645\u0634\u0629 320 \u0645\u0644" },
  { slug: "236", name_en: "Any Klaen Velvet Dream Bed & Fabric Fragrance \u2013 320ml", name_ar: "\u0622\u0646\u064a \u0643\u0644\u0627\u064a\u0646 \u0641\u064a\u0644\u0641\u062a \u062f\u0631\u064a\u0645 \u0645\u0639\u0637\u0631 \u0641\u0631\u0627\u0634 \u0648\u0623\u0642\u0645\u0634\u0629 320 \u0645\u0644" },
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
      form.set("category_id", HOME_FRAGRANCE_CATEGORY);
      form.set("brand_id", ANY_KLAEN_BRAND);
      form.set("gender", "not_applicable");
      form.set("description_en", "Any Klaen");
      form.set("description_ar", "\u0622\u0646\u064a \u0643\u0644\u0627\u064a\u0646");
      form.set("moq", "36");
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
