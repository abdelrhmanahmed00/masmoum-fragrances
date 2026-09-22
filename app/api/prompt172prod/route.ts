import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { updateProduct } from "@/lib/admin/products";
import { revalidateTag } from "next/cache";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const HOME_FRAGRANCE_CATEGORY = "c68ff5c4-891d-4a5f-b8e1-b02aea4f096a";

// Fetch-full-row-then-rebuild-full-FormData technique, same as Prompt
// 170's Smart Boy gender migration -- updateProduct()'s validate() does a
// full-FormData replace, so every field must be resent, not just the two
// that are actually changing (category_id, gender).
const IDS = [
  "af6fb48d-aa21-410f-8850-01cdf3b979d6", // 184
  "545978f5-3f2a-4d89-993c-4c77b486b034", // 185
  "9ae69da1-346d-4c80-9bb5-362574288989", // 186
  "85568fc4-b935-4a7c-8ff1-6556dcf5c7bc", // 187
  "e0cc91ea-59a2-4c89-a603-b2ae57d7f646", // 188
  "b7c7aeed-68ec-4890-a6a3-cbbc044f1fb9", // 189
];

export async function POST(req: Request) {
  const auth = req.headers.get("authorization");
  const supabase = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: auth ?? "" } },
  });

  const results: Array<{ id: string; status: string; message?: string }> = [];

  for (const id of IDS) {
    const { data: product, error: fetchError } = await supabase
      .from("products")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchError || !product) {
      results.push({ id, status: "error", message: "fetch failed" });
      continue;
    }

    const form = new FormData();
    form.set("name_en", product.name_en);
    form.set("name_ar", product.name_ar);
    form.set("slug", product.slug);
    form.set("category_id", HOME_FRAGRANCE_CATEGORY);
    form.set("brand_id", product.brand_id ?? "");
    form.set("gender", "not_applicable");
    form.set("description_en", product.description_en ?? "");
    form.set("description_ar", product.description_ar ?? "");
    if (product.fragrance_top_notes_en) form.set("fragrance_top_notes_en", product.fragrance_top_notes_en);
    if (product.fragrance_top_notes_ar) form.set("fragrance_top_notes_ar", product.fragrance_top_notes_ar);
    if (product.fragrance_middle_notes_en) form.set("fragrance_middle_notes_en", product.fragrance_middle_notes_en);
    if (product.fragrance_middle_notes_ar) form.set("fragrance_middle_notes_ar", product.fragrance_middle_notes_ar);
    if (product.fragrance_base_notes_en) form.set("fragrance_base_notes_en", product.fragrance_base_notes_en);
    if (product.fragrance_base_notes_ar) form.set("fragrance_base_notes_ar", product.fragrance_base_notes_ar);
    form.set("moq", String(product.moq));
    if (product.stock_quantity !== null) form.set("stock_quantity", String(product.stock_quantity));
    form.set("sort_order", String(product.sort_order));
    if (product.is_active) form.set("is_active", "on");
    if (product.is_featured) form.set("is_featured", "on");

    const result = await updateProduct(supabase, id, form);
    if (result.status === "success") {
      results.push({ id, status: "success" });
    } else {
      results.push({
        id,
        status: "error",
        message: "message" in result ? result.message : "unknown error",
      });
    }
  }

  revalidateTag("products", { expire: 0 });
  revalidateTag("categories", { expire: 0 });

  return NextResponse.json({ results });
}
