import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { findOrCreateBrand } from "@/lib/admin/brands";
import { createProduct } from "@/lib/admin/products";

// TEMPORARY -- Prompt 149 batch-create route, deleted immediately after
// use in a follow-up commit. Deployed to and invoked against PRODUCTION
// (not localhost) -- same discipline established in Prompt 148 -- so
// that createProduct's real RLS-gated insert and the real product data
// land directly where they need to be, no local/production split at all
// for this step (this route does the CREATE step only; image uploads
// still go through the real browser-driven admin UI, per Prompt 146's
// reasoning that image compression genuinely requires a real browser).
//
// Auth: same "real temp Supabase Auth user, anon-key signInWithPassword,
// Bearer-authenticated client" technique as every prior temp route in
// this project (e.g. Prompt 145) -- this project's single-admin model
// (proxy.ts: authorization = authentication, any authenticated session
// IS the admin) means a genuinely signed-in session, not the service
// role, is what exercises the exact same RLS path createProduct/
// findOrCreateBrand hit from the real admin UI.
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

  // 1) Brand: find-or-create "Golf Orchid".
  const brandForm = new FormData();
  brandForm.set("name_en", "Golf Orchid");
  brandForm.set("name_ar", "جولف أوركيد");
  brandForm.set("slug", "golf-orchid");
  brandForm.set("is_active", "on");

  const brandResult = await findOrCreateBrand(supabase, brandForm);
  if (brandResult.status !== "success") {
    return NextResponse.json({ status: "error", step: "brand", message: brandResult.message });
  }
  const brandId = brandResult.brand.id;

  // 2) Category: look up "home-fragrance" (Home Fragrance / Air Freshener) --
  // never created here, per the task's explicit instruction.
  const { data: category, error: categoryError } = await supabase
    .from("categories")
    .select("id, slug, name_en")
    .eq("slug", "home-fragrance")
    .maybeSingle();

  if (categoryError || !category) {
    return NextResponse.json({
      status: "error",
      step: "category",
      message: categoryError?.message ?? "Category not found",
    });
  }
  const categoryId = category.id;

  // 3) Create 14 product rows, slugs 057-070.
  const created: { slug: string; id?: string; error?: string }[] = [];
  for (let i = 57; i <= 70; i++) {
    const slug = String(i).padStart(3, "0");
    const form = new FormData();
    form.set("name_en", "Golf Orchid Air & Fabric Freshener 200ml");
    form.set("name_ar", "ديو جولف أوركيد 200 مل");
    form.set("slug", slug);
    form.set("category_id", categoryId);
    form.set("brand_id", brandId);
    form.set("gender", "not_applicable");
    form.set("description_en", "Golf Orchid");
    form.set("description_ar", "جولف أوركيد");
    form.set("moq", "72");
    // stock_quantity intentionally omitted -- empty/absent means null
    // (unlimited), matching validate()'s own handling.
    form.set("is_active", "on");
    // is_featured intentionally omitted (unchecked/false).

    const result = await createProduct(supabase, form);
    if (result.status === "success") {
      created.push({ slug, id: result.id });
    } else {
      created.push({
        slug,
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
