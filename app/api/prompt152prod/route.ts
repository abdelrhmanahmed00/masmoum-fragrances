import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { createClient } from "@supabase/supabase-js";
import { updateSiteSettings, ALL_SETTING_KEYS } from "@/lib/admin/site-settings";

// TEMPORARY -- Prompt 152 phone-number-fix route, deleted immediately
// after use. Deployed to and invoked against PRODUCTION. Reuses the real
// updateSiteSettings() -- its validate() upserts ALL 7 keys at once, so
// the current full settings state is fetched first and rebuilt into a
// complete FormData with every value preserved except contact_phone_en.
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

  const { data: rows, error: fetchError } = await supabase
    .from("site_settings")
    .select("key, value_en, value_ar")
    .in("key", ALL_SETTING_KEYS);

  if (fetchError || !rows) {
    return NextResponse.json({
      status: "error",
      step: "fetch",
      message: fetchError?.message ?? "no rows",
    });
  }

  const byKey = Object.fromEntries(rows.map((r) => [r.key, r]));

  const form = new FormData();
  const set = (formKey: string, value: string | null) => {
    if (value !== null) form.set(formKey, value);
  };

  set("contact_email_en", byKey.contact_email?.value_en ?? null);
  set("contact_email_ar", byKey.contact_email?.value_ar ?? null);
  // The only real change: contact_phone_en, normalized the same way the
  // existing contact_phone/contact_whatsapp values already are ("+" plus
  // digits only, no spaces).
  set("contact_phone_en", "+963949726534");
  set("contact_phone_ar", byKey.contact_phone?.value_ar ?? null);
  set("contact_whatsapp_en", byKey.contact_whatsapp?.value_en ?? null);
  set("contact_whatsapp_ar", byKey.contact_whatsapp?.value_ar ?? null);
  set("contact_whatsapp_floating_en", byKey.contact_whatsapp_floating?.value_en ?? null);
  set("contact_whatsapp_floating_ar", byKey.contact_whatsapp_floating?.value_ar ?? null);
  set("social_instagram_url", byKey.social_instagram_url?.value_en ?? null);
  set("social_facebook_url", byKey.social_facebook_url?.value_en ?? null);
  set("social_tiktok_url", byKey.social_tiktok_url?.value_en ?? null);

  const result = await updateSiteSettings(supabase, form);

  if (result.status === "success") {
    revalidateTag("site_settings", { expire: 0 });
  }

  return NextResponse.json({ status: "done", result });
}
