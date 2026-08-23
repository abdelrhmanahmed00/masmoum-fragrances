// Prompt 42 cleanup: trimmedOrNull was byte-for-byte duplicated across
// every lib/admin/*.ts file AND lib/quote-request-submission.ts (public
// quote form) -- genuinely identical logic used by both admin and public
// code, so this lives at the top level of lib/, not under lib/admin/
// (which is admin-only code, see lib/admin/shared.ts for the two
// Postgres error-code constants that ARE admin-only and stay there).
//
// No "server-only" guard: this is a pure function with no DB/env access
// of its own -- safe to import from anywhere, though every current call
// site happens to already be server-only code.

/** FormData string extraction: trims whitespace, collapses an
 *  empty/whitespace-only value to null rather than "" -- the shared rule
 *  every admin form (and the public quote form) uses for "was this field
 *  actually filled in." */
export function trimmedOrNull(value: FormDataEntryValue | null): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/** Same loose email shape check used everywhere this project validates an
 *  email address (originally lib/quote-request-submission.ts, matching
 *  quote_requests' own CHECK constraint from the 0008 migration) --
 *  extracted here (Prompt 43) rather than let a third copy accumulate in
 *  lib/admin/site-settings.ts. */
export const EMAIL_PATTERN = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
