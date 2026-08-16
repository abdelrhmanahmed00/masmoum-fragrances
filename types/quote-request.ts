/**
 * Business type: a fixed select, not free text. Reasoning (Prompt 19
 * task explicitly asked for this to be a documented decision, not a
 * formality): `quote_requests.business_type` is a plain nullable `text`
 * column (0008 migration) with no DB-level enum, so nothing in the schema
 * forces this choice either way. A select is still the better
 * application-layer choice for a B2B intake form:
 *   - Consistent values are far more useful to whoever triages these
 *     leads later (a future admin dashboard) than free-text variations
 *     like "shop", "retail store", "we sell perfumes" all meaning the
 *     same thing.
 *   - The realistic set of buyer types for a wholesale fragrance
 *     manufacturer is small and known ahead of time.
 *   - "Other" keeps it from being a dead end for a buyer who genuinely
 *     doesn't fit the other three.
 * The stored VALUE is a stable English string regardless of the buyer's
 * UI locale (so a future admin dashboard -- presumably operated in one
 * language -- sees consistent data, not a mix of English/Arabic values
 * depending on which locale the buyer happened to submit from); the
 * VISIBLE label is translated per locale in the form itself via
 * labelKey. Values and translation keys are kept in lockstep manually.
 */
export const BUSINESS_TYPES = [
  { value: "Retailer", labelKey: "businessTypeRetailer" },
  { value: "Distributor", labelKey: "businessTypeDistributor" },
  { value: "Online Store", labelKey: "businessTypeOnlineStore" },
  { value: "Other", labelKey: "businessTypeOther" },
] as const;

export type BusinessType = (typeof BUSINESS_TYPES)[number]["value"];

/** What the client sends the server action per quote line -- only what's
 *  needed to build a quote_request_items row. Deliberately NOT the full
 *  QuoteLineItem snapshot (name/image/category are for display only; the
 *  server doesn't need them, and re-derives everything it persists from
 *  product_id/product_size_id via the DB's own FK constraints). */
export type QuoteSubmissionItem = {
  productId: string;
  productSizeId: string | null;
  quantity: number;
};

/** "required" covers every empty required field; "invalid" is for a
 *  field that has a value but fails a format check (currently just
 *  email). Codes, not raw strings, so the client renders the actual
 *  user-facing text via next-intl (t()) instead of the server dictating
 *  English prose regardless of the buyer's locale. */
export type QuoteRequestFieldErrorCode = "required" | "invalid";

export type QuoteRequestFieldErrors = Partial<
  Record<
    | "fullName"
    | "companyName"
    | "country"
    | "city"
    | "email"
    | "phoneWhatsapp",
    QuoteRequestFieldErrorCode
  >
>;

export type QuoteRequestErrorCode =
  /** One or more visible form fields failed validation -- see fieldErrors. */
  | "validation"
  /** The items array (from QuoteContext, not a visible form field) was
   *  empty, too large, or malformed -- shouldn't normally happen since
   *  the page redirects away when the quote is empty, but the action
   *  can't trust that client-side redirect ran. */
  | "itemsInvalid"
  | "rateLimited"
  /** Honeypot aside, a generic catch-all for DB insert failures. */
  | "submissionFailed";

export type QuoteRequestActionState =
  | { status: "idle" }
  | { status: "success" }
  | {
      status: "error";
      code: QuoteRequestErrorCode;
      fieldErrors?: QuoteRequestFieldErrors;
    };

export const QUOTE_REQUEST_INITIAL_STATE: QuoteRequestActionState = {
  status: "idle",
};
