/** Deliberately generic regardless of which check actually failed (missing
 *  email, missing password, wrong password, unknown email, rate limited)
 *  -- never reveal whether a given email has an account. */
export type AdminLoginActionState =
  | { status: "idle" }
  | { status: "error"; message: string };

export const ADMIN_LOGIN_INITIAL_STATE: AdminLoginActionState = {
  status: "idle",
};
