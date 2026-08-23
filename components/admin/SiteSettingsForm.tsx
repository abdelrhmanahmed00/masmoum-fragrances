"use client";

import { useActionState } from "react";
import { updateSiteSettingsAction } from "@/app/admin/(dashboard)/settings/actions";
import FormField from "./FormField";
import {
  SITE_SETTINGS_ACTION_INITIAL_STATE,
  type AdminSiteSettingsRow,
} from "@/types/admin-settings";

function valueFor(
  settings: AdminSiteSettingsRow[],
  key: string,
  lang: "value_en" | "value_ar"
): string {
  return settings.find((row) => row.key === key)?.[lang] ?? "";
}

/**
 * One persistent form for a fixed, known set of keys -- not a list +
 * create/edit/delete like every other admin section (categories,
 * products, ...). No redirect() on success (nothing to redirect back
 * to -- this form IS the whole section); a success banner confirms the
 * save inline instead.
 *
 * Both value_en and value_ar per key -- confirmed from Footer.tsx's real
 * rendering logic before building this, not assumed: pickLocalizedSetting
 * prefers the current locale's value with a fallback to the other
 * locale's if only one has been entered, so both columns are genuinely
 * read and used, not a locale-independent single value.
 */
export default function SiteSettingsForm({
  settings,
}: {
  settings: AdminSiteSettingsRow[];
}) {
  const [state, formAction, isPending] = useActionState(
    updateSiteSettingsAction,
    SITE_SETTINGS_ACTION_INITIAL_STATE
  );

  const fieldErrors = state.status === "error" ? state.fieldErrors : undefined;

  return (
    <form action={formAction} className="max-w-2xl space-y-8">
      {state.status === "error" ? (
        <div
          role="alert"
          className="rounded-btn border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {state.message}
        </div>
      ) : null}
      {state.status === "success" ? (
        <div
          role="status"
          className="rounded-btn border border-green-300 bg-green-50 px-4 py-3 text-sm text-green-700"
        >
          Settings saved.
        </div>
      ) : null}

      <section className="space-y-5">
        <div>
          <h2 className="text-sm font-semibold tracking-wide text-brand-black uppercase">
            Contact Email
          </h2>
          <p className="mt-1 text-xs text-brand-gray">
            Shown in the Footer&apos;s Contact section as a mailto: link.
            Leave both empty to hide that line entirely.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <FormField
            label="English"
            name="contact_email_en"
            type="email"
            defaultValue={valueFor(settings, "contact_email", "value_en")}
            error={fieldErrors?.contact_email_en}
          />
          <FormField
            label="Arabic"
            name="contact_email_ar"
            type="email"
            defaultValue={valueFor(settings, "contact_email", "value_ar")}
            error={fieldErrors?.contact_email_ar}
            dir="rtl"
          />
        </div>
      </section>

      <section className="space-y-5">
        <div>
          <h2 className="text-sm font-semibold tracking-wide text-brand-black uppercase">
            Contact Phone
          </h2>
          <p className="mt-1 text-xs text-brand-gray">
            Shown as a tel: link. Any format is accepted -- international
            numbers vary too widely for a strict pattern to be useful
            here.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <FormField
            label="English"
            name="contact_phone_en"
            defaultValue={valueFor(settings, "contact_phone", "value_en")}
          />
          <FormField
            label="Arabic"
            name="contact_phone_ar"
            defaultValue={valueFor(settings, "contact_phone", "value_ar")}
            dir="rtl"
          />
        </div>
      </section>

      <section className="space-y-5">
        <div>
          <h2 className="text-sm font-semibold tracking-wide text-brand-black uppercase">
            WhatsApp
          </h2>
          <p className="mt-1 text-xs text-brand-gray">
            Used to build a wa.me link (non-digit characters are stripped
            automatically for the link itself). Prompt 44 fix: the
            Footer now shows only the word &quot;WhatsApp&quot; as the
            visible link text -- this number is never displayed publicly,
            only used as the link target. Same loose format rule as
            phone above.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <FormField
            label="English"
            name="contact_whatsapp_en"
            defaultValue={valueFor(settings, "contact_whatsapp", "value_en")}
          />
          <FormField
            label="Arabic"
            name="contact_whatsapp_ar"
            defaultValue={valueFor(settings, "contact_whatsapp", "value_ar")}
            dir="rtl"
          />
        </div>
      </section>

      <section className="space-y-5">
        <div>
          <h2 className="text-sm font-semibold tracking-wide text-brand-black uppercase">
            Social Media
          </h2>
          <p className="mt-1 text-xs text-brand-gray">
            Shown as icon links in the Footer. Single link each -- these
            are URLs, not locale-dependent text, so there&apos;s no
            separate Arabic field. Leave empty to hide that icon.
          </p>
        </div>
        <FormField
          label="Instagram"
          name="social_instagram_url"
          type="url"
          placeholder="https://instagram.com/..."
          defaultValue={valueFor(settings, "social_instagram_url", "value_en")}
          error={fieldErrors?.social_instagram_url}
        />
        <FormField
          label="Facebook"
          name="social_facebook_url"
          type="url"
          placeholder="https://facebook.com/..."
          defaultValue={valueFor(settings, "social_facebook_url", "value_en")}
          error={fieldErrors?.social_facebook_url}
        />
        <FormField
          label="TikTok"
          name="social_tiktok_url"
          type="url"
          placeholder="https://tiktok.com/@..."
          defaultValue={valueFor(settings, "social_tiktok_url", "value_en")}
          error={fieldErrors?.social_tiktok_url}
        />
      </section>

      <div className="pt-2">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-btn border border-brand-black bg-brand-black px-6 py-2.5 text-sm font-medium text-brand-white transition-colors hover:bg-brand-white hover:text-brand-black disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending ? "Saving…" : "Save Changes"}
        </button>
      </div>
    </form>
  );
}
