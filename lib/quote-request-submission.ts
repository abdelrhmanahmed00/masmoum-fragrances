import "server-only";
import { createAnonMutationClient } from "@/lib/supabase/server";
import { isRateLimited } from "@/lib/rate-limit";
import {
  BUSINESS_TYPES,
  type BusinessType,
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

// Same rule as quote_requests' own CHECK constraint (0008 migration) --
// kept in sync manually since a DB constraint can't be imported into
// application code. Duplicated on purpose so this validation actually
// rejects bad input before it ever reaches the DB (the DB constraint is
// the backstop, not the primary UX).
const EMAIL_PATTERN = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

// Defense-in-depth caps, not real-world UX limits -- a legitimate
// wholesale quote is never going to hit either of these; they exist to
// bound the cost of a maliciously oversized payload.
const MAX_ITEMS = 100;
const MAX_MESSAGE_LENGTH = 2000;

// 5 submissions / 10 minutes / IP. See lib/rate-limit.ts for the full
// reasoning and its caveats (best-effort, per-instance, not a real
// distributed limiter).
const RATE_LIMIT = { max: 5, windowMs: 10 * 60 * 1000 };

function trimmedOrNull(value: FormDataEntryValue | null): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function isValidBusinessType(value: string): value is BusinessType {
  return (BUSINESS_TYPES as readonly { value: string }[]).some(
    (bt) => bt.value === value
  );
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
  // path. (Accepted trade-off: an aggressive browser autofill tool could
  // in principle false-positive a real human here; this is the standard,
  // proportionate honeypot pattern, not a claim it's foolproof.)
  const honeypot = trimmedOrNull(formData.get("companyWebsite"));
  if (honeypot) {
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

  // ---- Insert. Anon key -- see createAnonMutationClient's own comment
  // (lib/supabase/server.ts) for the full anon-vs-service-role reasoning.
  // Short version: the RLS policies on both tables (0008/0009 migrations)
  // already grant exactly this -- INSERT only, `with check (status =
  // 'new')` on quote_requests -- so the service role would only add
  // unnecessary privilege, not capability. Row `id` is generated here
  // (not read back from the insert -- anon has no SELECT grant, per the
  // 0008 migration's own note) so it can be reused as the FK for the item
  // rows below. ----
  const supabase = createAnonMutationClient();
  const quoteRequestId = crypto.randomUUID();

  const { error: quoteRequestError } = await supabase
    .from("quote_requests")
    .insert({
      id: quoteRequestId,
      full_name: fullName,
      company_name: companyName,
      country,
      city,
      email,
      phone_whatsapp: phoneWhatsapp,
      business_type: businessType,
      message,
      // status omitted -- defaults to 'new' at the DB level, and the RLS
      // policy's `with check (status = 'new')` would reject anything else
      // sent explicitly anyway.
    });

  if (quoteRequestError) {
    return { status: "error", code: "submissionFailed" };
  }

  const { error: itemsError } = await supabase
    .from("quote_request_items")
    .insert(
      items.map((item) => ({
        quote_request_id: quoteRequestId,
        product_id: item.productId,
        product_size_id: item.productSizeId,
        quantity: item.quantity,
      }))
    );

  if (itemsError) {
    // The quote_requests row above already committed and can't be
    // cleaned up here -- anon has no DELETE grant on that table (by
    // design, see the 0008 migration). Accepted rare edge case (e.g. a
    // product/size deleted between page load and submit, tripping the
    // items table's FK constraint): the buyer sees a clear error and can
    // retry, producing a second quote_requests row rather than silently
    // losing the failure. Reaching for the service role just to add a
    // compensating delete for this narrow, rare path would undercut the
    // anon-is-sufficient argument above for the common path.
    return { status: "error", code: "submissionFailed" };
  }

  return { status: "success" };
}
