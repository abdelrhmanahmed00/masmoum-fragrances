import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { findOrCreateBrand } from "@/lib/admin/brands";
import { createCollection } from "@/lib/admin/collections";
import { createProduct } from "@/lib/admin/products";

// TEMPORARY -- Prompt 150 batch-create route, deleted immediately after
// use in a follow-up commit. Deployed to and invoked against PRODUCTION,
// same discipline as Prompt 149.
//
// Note on product_collections: there is no dedicated admin UI/Server
// Action for assigning a product to a collection anywhere in this
// codebase (ProductForm.tsx has no collection field; confirmed by
// reading lib/admin/products.ts, lib/admin/collections.ts, and grepping
// app/admin + components/admin for any "collection" assignment code --
// none exists). The 0014 migration's "product_collections_admin_all" RLS
// policy grants `authenticated` full insert/update/delete on
// product_collections with no additional check -- so a direct insert
// through this same Bearer-authenticated client (the one createProduct
// et al. already use) IS the real, correctly-RLS-gated path; there is
// simply no separate wrapper function to call on top of it.
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

  // 1) Brand: look up "Farfasha" -- must already exist, per the task.
  const { data: brand, error: brandError } = await supabase
    .from("brands")
    .select("id, slug, name_en")
    .eq("slug", "farfasha")
    .maybeSingle();

  if (brandError || !brand) {
    return NextResponse.json({
      status: "error",
      step: "brand",
      message: brandError?.message ?? "Brand 'farfasha' not found",
    });
  }

  // 2) Collection: find-or-create "Pretty Little Girls".
  let collectionCreated = false;
  let collection: { id: string; slug: string; name_en: string } | null = null;

  const { data: existingCollection } = await supabase
    .from("collections")
    .select("id, slug, name_en")
    .eq("slug", "pretty-little-girls")
    .maybeSingle();

  if (existingCollection) {
    collection = existingCollection;
  } else {
    const collectionForm = new FormData();
    collectionForm.set("name_en", "Pretty Little Girls");
    collectionForm.set("name_ar", "بريتي ليتل جيرلز");
    collectionForm.set("slug", "pretty-little-girls");
    collectionForm.set("is_active", "on");

    const collectionResult = await createCollection(supabase, collectionForm);
    if (collectionResult.status !== "success") {
      return NextResponse.json({
        status: "error",
        step: "collection",
        message:
          collectionResult.status === "error"
            ? collectionResult.message
            : "unknown error",
      });
    }
    collectionCreated = true;

    const { data: newCollection, error: lookupError } = await supabase
      .from("collections")
      .select("id, slug, name_en")
      .eq("slug", "pretty-little-girls")
      .maybeSingle();

    if (lookupError || !newCollection) {
      return NextResponse.json({
        status: "error",
        step: "collection-lookup",
        message: lookupError?.message ?? "Collection not found after create",
      });
    }
    collection = newCollection;
  }

  // 3) Category: look up "body-mist" -- must already exist.
  const { data: category, error: categoryError } = await supabase
    .from("categories")
    .select("id, slug, name_en")
    .eq("slug", "body-mist")
    .maybeSingle();

  if (categoryError || !category) {
    return NextResponse.json({
      status: "error",
      step: "category",
      message: categoryError?.message ?? "Category 'body-mist' not found",
    });
  }

  // 4) Create 9 distinct products, slugs 071-079, each linked to the
  // collection via a direct product_collections insert.
  const PRODUCTS = [
    { slug: "071", name_en: "Farfasha Pretty Little Girls – Midnight Body Mist", name_ar: "فرفشة بريتي ليتل جيرلز – ميدنايت بودي ميست" },
    { slug: "072", name_en: "Farfasha Pretty Little Girls – Flower Body Mist", name_ar: "فرفشة بريتي ليتل جيرلز – فلاور بودي ميست" },
    { slug: "073", name_en: "Farfasha Pretty Little Girls – Live Life Body Mist", name_ar: "فرفشة بريتي ليتل جيرلز – لايف لايف بودي ميست" },
    { slug: "074", name_en: "Farfasha Pretty Little Girls – Elysia Bloom Body Mist", name_ar: "فرفشة بريتي ليتل جيرلز – إليزيا بلوم بودي ميست" },
    { slug: "075", name_en: "Farfasha Pretty Little Girls – Pearl Horizon Body Mist", name_ar: "فرفشة بريتي ليتل جيرلز – بيرل هورايزن بودي ميست" },
    { slug: "076", name_en: "Farfasha Pretty Little Girls – Pink Rose Body Mist", name_ar: "فرفشة بريتي ليتل جيرلز – بينك روز بودي ميست" },
    { slug: "077", name_en: "Farfasha Pretty Little Girls – Revival Body Mist", name_ar: "فرفشة بريتي ليتل جيرلز – ريفايفل بودي ميست" },
    { slug: "078", name_en: "Farfasha Pretty Little Girls – Rosé Mirage Body Mist", name_ar: "فرفشة بريتي ليتل جيرلز – روز ميراج بودي ميست" },
    { slug: "079", name_en: "Farfasha Pretty Little Girls – Sexy Girl Body Mist", name_ar: "فرفشة بريتي ليتل جيرلز – سيكسي جيرل بودي ميست" },
  ];

  const created: {
    slug: string;
    id?: string;
    error?: string;
    collectionLinked?: boolean;
    collectionLinkError?: string;
  }[] = [];

  for (const p of PRODUCTS) {
    const form = new FormData();
    form.set("name_en", p.name_en);
    form.set("name_ar", p.name_ar);
    form.set("slug", p.slug);
    form.set("category_id", category.id);
    form.set("brand_id", brand.id);
    form.set("gender", "not_applicable");
    form.set("description_en", "Farfasha");
    form.set("description_ar", "فرفشة");
    form.set("moq", "48");
    form.set("is_active", "on");

    const result = await createProduct(supabase, form);
    if (result.status !== "success") {
      created.push({
        slug: p.slug,
        error: result.status === "error" ? result.message : "unknown error",
      });
      continue;
    }

    const productId = result.id;
    const { error: linkError } = await supabase
      .from("product_collections")
      .insert({ product_id: productId, collection_id: collection!.id });

    created.push({
      slug: p.slug,
      id: productId,
      collectionLinked: !linkError,
      collectionLinkError: linkError?.message,
    });
  }

  return NextResponse.json({
    status: "done",
    brand,
    collection: { ...collection, created: collectionCreated },
    category,
    created,
  });
}
