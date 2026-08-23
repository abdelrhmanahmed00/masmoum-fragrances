"use client";

import { useActionState, useState } from "react";
import { updateIntegrationSettingsAction } from "@/app/admin/(dashboard)/settings/actions";
import FormField from "./FormField";
import {
  INTEGRATION_SETTINGS_ACTION_INITIAL_STATE,
  type AdminIntegrationSettingsRow,
} from "@/types/admin-integration-settings";

/**
 * Meta Pixel ID: a plain, always-visible text field -- not secret (see
 * the 0023 migration's own comment for why), so there's no reason to
 * mask or hide it.
 *
 * Meta Conversions API Token: standard "masked secret" UX -- once saved,
 * this NEVER shows the real value again, only "•••• saved" + a "Change"
 * affordance. Clicking "Change" mounts a real, empty <input
 * name="meta_conversions_api_token">; until then, no element with that
 * name exists in the form at all. That absence is exactly what lets
 * lib/admin/integration-settings.ts's updateIntegrationSettings tell
 * "the admin didn't touch this field" (leave the stored token alone)
 * apart from "the admin explicitly cleared it" (submit the now-mounted
 * input while still empty) -- see that file's own comment for the full
 * three-state design.
 */
export default function MetaIntegrationForm({
  settings,
}: {
  settings: AdminIntegrationSettingsRow;
}) {
  const [state, formAction, isPending] = useActionState(
    updateIntegrationSettingsAction,
    INTEGRATION_SETTINGS_ACTION_INITIAL_STATE
  );
  const [isEditingToken, setIsEditingToken] = useState(false);

  const fieldErrors = state.status === "error" ? state.fieldErrors : undefined;

  return (
    <form action={formAction} className="max-w-2xl space-y-6">
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

      <FormField
        label="Meta Pixel ID"
        name="meta_pixel_id"
        defaultValue={settings.meta_pixel_id ?? ""}
        error={fieldErrors?.meta_pixel_id}
        hint="Numeric ID from Meta Events Manager. Not secret — safe to appear in public page HTML. Leave empty to disable tracking site-wide."
      />

      <div>
        <label className="mb-1.5 block text-sm font-medium text-brand-black">
          Meta Conversions API Access Token
        </label>

        {isEditingToken ? (
          <div>
            <input
              type="password"
              name="meta_conversions_api_token"
              autoComplete="off"
              placeholder="Paste the new access token…"
              className="w-full rounded-btn border border-brand-border bg-brand-white px-3 py-2.5 text-sm text-brand-black"
            />
            <button
              type="button"
              onClick={() => setIsEditingToken(false)}
              className="mt-1.5 text-xs text-brand-gray underline-offset-2 hover:text-brand-black hover:underline"
            >
              Cancel (leave saved token unchanged)
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <span className="rounded-btn border border-brand-border bg-brand-white px-3 py-2.5 text-sm text-brand-gray">
              {settings.has_token ? "•••• saved" : "Not set"}
            </span>
            <button
              type="button"
              onClick={() => setIsEditingToken(true)}
              className="text-sm text-brand-black underline-offset-2 hover:underline"
            >
              {settings.has_token ? "Change" : "Set token"}
            </button>
          </div>
        )}
        <p className="mt-1.5 text-xs text-brand-gray">
          Never redisplayed once saved, for security. Open the field and
          save with it empty to clear the token; leave the field closed to
          keep the current one. Server-side only — never sent to
          browsers.
        </p>
      </div>

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
