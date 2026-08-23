import "server-only";
import { createAnonMutationClient } from "@/lib/supabase/server";
import { isRateLimited } from "@/lib/rate-limit";
import { trimmedOrNull, EMAIL_PATTERN } from "@/lib/form-utils";
import {
  BUSINESS_TYPES,
  type BusinessType,
  type InsufficientStockProduct,
  type QuoteRequestActionState,
  type QuoteRequestFieldErrors,
  type QuoteSubmissionItem,
} from "@/types/quote-request";

// Real submission logic for the quote request form (Prompt 19), factored
// out of the "use server" action file (app/[locale]/quote/request/actions.ts)
// specifically so it's a plain, framework-agnostic async function: the
// action file's only remaining job is reading the request IP via
// next/headers (which genuinely requires a live Next.js request) and
// calling straight through to this. That split lets the Prompt 19
// verification script call the exact same function the real form
// submits to (with an injected IP instead of reading real headers),
// rather than reimplementing this logic a second time just to test it --
// see scratch-verify-quote-request.mjs.

// EMAIL_PATTERN now lives in lib/form-utils.ts (Prompt 43) -- same rule
// as quote_requests' own CHECK constraint (0008 migration), kept in sync
// manually since a DB constraint can't be imported into application code.
// Checked here so this validation actually rejects bad input before it
// ever reaches the DB (the DB constraint is the backstop, not the primary
// UX).

// Defense-in-depth caps, not real-world UX limits -- a legitimate
// wholesale quote is never going to hit either of these; they exist to
// bound the cost of a maliciously oversized payload.
const MAX_ITEMS = 100;
const MAX_MESSAGE_LENGTH = 2000;

// 5 submissions / 10 minutes / IP. See lib/rate-limit.ts for the full
// reasoning and its caveats (best-effort, per-instance, not a real
// distributed limiter).
const RATE_LIMIT = { max: 5, windowMs: 10 * 60 * 1000 };

function isValidBusinessType(value: string): value is BusinessType {
  return (BUSINESS_TYPES as readonly { value: string }[]).some(
    (bt) => bt.value === value
  );
}

// Prompt 30: the submit_quote_request RPC (0016 migration; body replaced
// by 0018 for Prompt 33's per-size stock, same name/signature/exception
// format) raises a plain PL/pgSQL exception whose message is
// "INSUFFICIENT_STOCK:" followed by a JSON payload -- see 0018's own
// comment for why JSON rather than a hand-parsed sentence (robust to any
// characters in a product name), and for the new `pool`/`sizeLabel`
// fields Prompt 33 added to that payload. Supabase-js surfaces a raised
// exception as error.message on the .rpc() call's PostgrestError. This
// helper turns that back into a typed payload, or null if the error was
// something else entirely (a genuine DB/network failure, a malformed line
// item, etc.) -- those fall through to the existing generic
// "submissionFailed" code unchanged.
const INSUFFICIENT_STOCK_PREFIX = "INSUFFICIENT_STOCK:";

function parseInsufficientStockError(
  message: string | undefined
): InsufficientStockProduct[] | null {
  if (!message || !message.startsWith(INSUFFICIENT_STOCK_PREFIX)) {
    return null;
  }
  try {
    const payload = JSON.parse(
      message.slice(INSUFFICIENT_STOCK_PREFIX.length)
    ) as {
      productId: string;
      productSizeId: string | null;
      pool: "size" | "product";
      nameEn: string;
      nameAr: string;
      sizeLabel: string | null;
      available: number;
      requested: number;
    };
    return [payload];
  } catch {
    // Message had the right prefix but wasn't valid JSON -- shouldn't
    // happen (the RPC always builds it via jsonb_build_object), but don't
    // crash the request over a malformed error message; fall back to the
    // generic error.
    return null;
  }
}

export async function processQuoteRequestSubmission(
  items: QuoteSubmissionItem[],
  formData: FormData,
  clientIp: string
): Promise<QuoteRequestActionState> {
  // Honeypot: an invisible field (see QuoteRequestForm.tsx) a real
  // visitor never sees or fills. Non-empty here means a bot. This fails
  // SILENTLY as a fake "success" rather than a visible rejection -- a
  // distinguishable error response is exactly what would let a bot
  // author iterate their way past the trap. No DB write happens on this
  // path.
  //
  // Prompt 31: field renamed from "companyWebsite" and hidden via
  // display:none (see QuoteRequestForm.tsx's own comment) after a real
  // client's genuine submissions were being silently swallowed here --
  // the old name/label/hiding technique false-positived against a
  // legitimate browser autofill tool. A false positive on this check is
  // a much worse outcome (a real B2B lead vanishes with no visible
  // error) than an occasional missed bot, so it's logged -- not to
  // change the deflection behavior itself (a bot must still see an
  // indistinguishable fake success), but so this failure mode is
  // observable server-side instead of leaving zero trace, which is
  // exactly what made this bug hard to diagnose the first time.
  const honeypot = trimmedOrNull(formData.get("mf-hp-2x9"));
  if (honeypot) {
    console.warn(
      "[quote-request] honeypot field was non-empty -- submission silently rejected as a suspected bot (or a false-positive autofill).",
      { clientIp }
    );
    return { status: "success" };
  }

  if (isRateLimited(clientIp, RATE_LIMIT)) {
    return { status: "error", code: "rateLimited" };
  }

  // ---- Field extraction + validation. The form's `required` attributes
  // are UX only -- every one of these is re-checked here regardless of
  // what the client sent, per the task's explicit instruction. ----
  const fullName = trimmedOrNull(formData.get("fullName"));
  const companyName = trimmedOrNull(formData.get("companyName"));
  const country = trimmedOrNull(formData.get("country"));
  const city = trimmedOrNull(formData.get("city"));
  const email = trimmedOrNull(formData.get("email"));
  const phoneWhatsapp = trimmedOrNull(formData.get("phoneWhatsapp"));
  const businessTypeRaw = trimmedOrNull(formData.get("businessType"));
  const messageRaw = trimmedOrNull(formData.get("message"));

  const fieldErrors: QuoteRequestFieldErrors = {};
  if (!fullName) fieldErrors.fullName = "required";
  if (!companyName) fieldErrors.companyName = "required";
  if (!country) fieldErrors.country = "required";
  // city* is required per the client's form spec even though the DB
  // column itself is nullable (0008 migration) -- the DB's nullability is
  // a floor, not a ceiling; enforcing it here doesn't conflict with the
  // schema, it just always supplies a value the DB has no objection to.
  if (!city) fieldErrors.city = "required";
  if (!email) {
    fieldErrors.email = "required";
  } else if (!EMAIL_PATTERN.test(email)) {
    fieldErrors.email = "invalid";
  }
  if (!phoneWhatsapp) fieldErrors.phoneWhatsapp = "required";

  if (Object.keys(fieldErrors).length > 0) {
    return { status: "error", code: "validation", fieldErrors };
  }

  // ---- Items: not a visible form field (they come from QuoteContext),
  // so failures here aren't field errors -- just a distinct top-level
  // code. Shouldn't normally trigger (the page redirects away from an
  // empty quote before rendering the form), but this can't trust that
  // client-side redirect actually ran. ----
  if (!Array.isArray(items) || items.length === 0) {
    return { status: "error", code: "itemsInvalid" };
  }
  if (items.length > MAX_ITEMS) {
    return { status: "error", code: "itemsInvalid" };
  }
  const itemsWellFormed = items.every(
    (item) =>
      typeof item.productId === "string" &&
      item.productId.length > 0 &&
      (item.productSizeId === null ||
        typeof item.productSizeId === "string") &&
      Number.isInteger(item.quantity) &&
      item.quantity > 0
  );
  if (!itemsWellFormed) {
    return { status: "error", code: "itemsInvalid" };
  }

  const businessType: BusinessType | null =
    businessTypeRaw && isValidBusinessType(businessTypeRaw)
      ? businessTypeRaw
      : null;
  const message = messageRaw ? messageRaw.slice(0, MAX_MESSAGE_LENGTH) : null;

  // ---- Submit via the submit_quote_request RPC (0016 migration), not
  // two separate .insert() calls. See that migration's header comment for
  // the full reasoning -- short version: this feature (Prompt 30) needs
  // the quote_requests insert, every line item's stock decrement, and
  // every quote_request_items insert to succeed or fail together as one
  // real DB transaction, which two round trips through the REST API can
  // never guarantee. Anon key still -- see createAnonMutationClient's own
  // comment (lib/supabase/server.ts) for the anon-vs-service-role
  // reasoning; the RPC is SECURITY DEFINER, so it elevates privilege
  // internally to write to products, the caller doesn't need to. ----
  const supabase = createAnonMutationClient();

  const { data: quoteRequestId, error } = await supabase.rpc(
    "submit_quote_request",
    {
      p_full_name: fullName,
      p_company_name: companyName,
      p_country: country,
      p_city: city,
      p_email: email,
      p_phone_whatsapp: phoneWhatsapp,
      p_business_type: businessType,
      p_message: message,
      p_items: items.map((item) => ({
        product_id: item.productId,
        product_size_id: item.productSizeId,
        quantity: item.quantity,
      })),
    }
  );

  if (error || !quoteRequestId) {
    const insufficientStockProducts = parseInsufficientStockError(
      error?.message
    );
    if (insufficientStockProducts) {
      // Whole submission was rejected -- the RPC's transaction rolled
      // back everything, including the quote_requests row and any
      // earlier line items' decrements in this same call. Nothing to
      // clean up here (unlike the old two-insert code's orphaned-row
      // risk this replaces): there is genuinely no partial row left
      // behind for this outcome, by construction.
      return {
        status: "error",
        code: "insufficientStock",
        insufficientStockProducts,
      };
    }
    return { status: "error", code: "submissionFailed" };
  }

  return { status: "success" };
}
