import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { trimmedOrNull } from "@/lib/form-utils";
import type {
  AdminIntegrationSettingsRow,
  IntegrationSettingsActionState,
  IntegrationSettingsFieldErrors,
} from "@/types/admin-integration-settings";

// Same plain-function-taking-a-client split as every other lib/admin/*.ts
// file. Unlike lib/admin/site-settings.ts (a multi-key table), this
// mirrors the singleton shape of integration_settings itself (0023
// migration) -- one read, one update, no per-key logic.

const PIXEL_ID_PATTERN = /^\d+$/;

/**
 * Reads meta_pixel_id (shown directly in the form) and
 * meta_conversions_api_token (reduced to a boolean, NEVER returned as its
 * real value). This DOES fetch the real token column server-side --
 * there is no way to ask PostgREST for "just tell me if this is null"
 * without a database-side view/RPC, which felt like real overengineering
 * for what this needs; the actual security boundary (RLS has no anon
 * policy at all, 0023 migration) is unaffected either way. What matters
 * is enforced here, in application code: the raw value is discarded
 * immediately after computing has_token and is never included in this
 * function's return type, so it can't leak into a Server Component's
 * render output or ever reach the client bundle.
 */
export async function getIntegrationSettings(
  supabase: SupabaseClient
): Promise<AdminIntegrationSettingsRow> {
  const { data, error } = await supabase
    .from("integration_settings")
    .select("meta_pixel_id, meta_conversions_api_token")
    .eq("id", true)
    .maybeSingle();

  if (error || !data) {
    return { meta_pixel_id: null, has_token: false };
  }

  return {
    meta_pixel_id: data.meta_pixel_id,
    has_token: Boolean(data.meta_conversions_api_token),
  };
}

/**
 * meta_pixel_id: optional, but if provided must be digits-only (real
 * Meta Pixel IDs are always numeric) -- a real, checkable format, unlike
 * e.g. phone/WhatsApp elsewhere in this project where no such format
 * exists. Also re-validated a second time at the point it's interpolated
 * into raw script text (lib/meta-pixel.ts) -- see that file's own
 * comment for why that second check is the one that actually matters for
 * safety.
 *
 * meta_conversions_api_token: three distinct states, driven entirely by
 * whether/how the form field is present in formData (see
 * MetaIntegrationForm.tsx's own comment for the UI side of this) --
 *   - absent from formData -> leave the stored token untouched.
 *   - present as "" -> clear it (set null).
 *   - present with a value -> set that as the new token.
 * This is what makes "mask after saving, never redisplay the real value"
 * possible at all: the form never round-trips the real secret back into
 * a field, so there's no "unchanged" value to accidentally resubmit --
 * "leave unchanged" has to be its own distinct state instead.
 */
function validate(formData: FormData): {
  fieldErrors: IntegrationSettingsFieldErrors;
  update: Record<string, unknown> | null;
} {
  const pixelId = trimmedOrNull(formData.get("meta_pixel_id"));
  const fieldErrors: IntegrationSettingsFieldErrors = {};

  if (pixelId && !PIXEL_ID_PATTERN.test(pixelId)) {
    fieldErrors.meta_pixel_id = "Enter a numeric Pixel ID (digits only).";
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { fieldErrors, update: null };
  }

  const update: Record<string, unknown> = { meta_pixel_id: pixelId };

  const tokenField = formData.get("meta_conversions_api_token");
  if (typeof tokenField === "string") {
    update.meta_conversions_api_token = trimmedOrNull(tokenField);
  }

  return { fieldErrors, update };
}

export async function updateIntegrationSettings(
  supabase: SupabaseClient,
  formData: FormData
): Promise<IntegrationSettingsActionState> {
  const { fieldErrors, update } = validate(formData);
  if (!update) {
    return {
      status: "error",
      message: "Please fix the highlighted fields.",
      fieldErrors,
    };
  }

  const { error } = await supabase
    .from("integration_settings")
    .update(update)
    .eq("id", true);

  if (error) {
    return {
      status: "error",
      message: "Something went wrong saving settings. Please try again.",
    };
  }

  return { status: "success" };
}
