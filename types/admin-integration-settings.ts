/** Shape returned to the admin form -- deliberately NEVER the raw
 *  meta_conversions_api_token value, only whether one is currently set.
 *  See lib/admin/integration-settings.ts's own comment for why the read
 *  function still selects the real column (server-side only) rather than
 *  trying to avoid fetching it at all. */
export type AdminIntegrationSettingsRow = {
  meta_pixel_id: string | null;
  has_token: boolean;
};

export type IntegrationSettingsFieldErrors = Partial<
  Record<"meta_pixel_id", string>
>;

export type IntegrationSettingsActionState =
  | { status: "idle" }
  | { status: "success" }
  | {
      status: "error";
      message: string;
      fieldErrors?: IntegrationSettingsFieldErrors;
    };

export const INTEGRATION_SETTINGS_ACTION_INITIAL_STATE: IntegrationSettingsActionState =
  {
    status: "idle",
  };
