import "server-only";

// Prompt 42 cleanup: these two SQLSTATE constants were byte-for-byte
// duplicated across lib/admin/categories.ts, collections.ts, products.ts,
// and product-sizes.ts. Admin-only (unlike trimmedOrNull, which is also
// used by the public quote form and lives in lib/form-utils.ts instead).

/** Standard PostgreSQL SQLSTATE codes, passed through unchanged by
 *  PostgREST/supabase-js on `.error.code` -- used to distinguish "which
 *  constraint failed" without parsing the raw error message. */
export const UNIQUE_VIOLATION = "23505";
export const FK_VIOLATION = "23503";
