"use server";

import { headers } from "next/headers";
import { updateTag } from "next/cache";
import { after } from "next/server";
import { processQuoteRequestSubmission } from "@/lib/quote-request-submission";
import { sendMetaLeadEvent } from "@/lib/meta-conversions-api";
import { trimmedOrNull } from "@/lib/form-utils";
import type {
  QuoteRequestActionState,
  QuoteSubmissionItem,
} from "@/types/quote-request";

async function getClientIp(): Promise<string> {
  const h = await headers();
  // Vercel (and most proxies) set x-forwarded-for as
  // "client, proxy1, proxy2" -- the first entry is the original client.
  const forwardedFor = h.get("x-forwarded-for");
  if (forwardedFor) {
    const first = forwardedFor.split(",")[0]?.trim();
    if (first) return first;
  }
  // Falls back to a shared "unknown" bucket in local dev, where neither
  // header is normally set -- fine for correctness (this only ever
  // under-counts distinct dev-machine callers, it never affects
  // production behavior where Vercel always sets x-forwarded-for).
  return h.get("x-real-ip") ?? "unknown";
}

/**
 * Server Action backing the quote request form (Prompt 19).
 *
 * Server Action, not a Route Handler under app/api (the placeholder
 * README there anticipated one) -- reasoning:
 *   - It's colocated with the one form that calls it and needs no public
 *     JSON contract; nothing else in this project (or planned) consumes
 *     this as an API.
 *   - Next.js gives Server Actions a built-in CSRF check (Origin vs
 *     Host/X-Forwarded-Host) for free -- a hand-rolled Route Handler
 *     would need that added manually for a public POST endpoint like
 *     this one.
 *   - `useActionState` + `<form action={...}>` gives pending/error state
 *     without a hand-written fetch+JSON+loading-state layer.
 * app/api/README.md is updated to reflect this decision.
 *
 * This wrapper's only job is reading the caller's IP via next/headers
 * (a real Next.js request context is required for that) and handing off
 * to processQuoteRequestSubmission (lib/quote-request-submission.ts),
 * which holds all the actual validation/honeypot/rate-limit/DB logic and
 * is a plain, framework-agnostic function on purpose -- see that file's
 * own comment for why (short version: it lets the Prompt 19 verification
 * script call the exact same code path the real form does).
 *
 * Signature order: bound args first (`items`, from `.bind(null, items)`
 * in the client component -- the quote's contents live in
 * client-side/localStorage state the server has no other way to see),
 * then `prevState`/`formData` from useActionState -- see the Next.js
 * docs' "Passing additional arguments" + "Form validation" sections for
 * why the order is fixed this way when combining bind() with
 * useActionState.
 */
export async function submitQuoteRequest(
  items: QuoteSubmissionItem[],
  _prevState: QuoteRequestActionState,
  formData: FormData
): Promise<QuoteRequestActionState> {
  const clientIp = await getClientIp();
  const result = await processQuoteRequestSubmission(items, formData, clientIp);

  // Prompt 30: a successful submission may have decremented stock_quantity
  // (submit_quote_request RPC, 0016 migration) -- updateTag, not
  // revalidateTag, matching the established convention (see e.g.
  // app/admin/(dashboard)/products/actions.ts's own comment for why) so
  // the public catalog's Sold Out state is guaranteed current on the very
  // next request rather than eventually-consistent. This is the ONLY
  // place that needs to change for revalidation -- updateTag must run
  // inside a real Server Action (confirmed in Prompt 23), and this thin
  // "use server" wrapper is exactly that; the plain lib function it calls
  // is not. Called unconditionally on success rather than only when an
  // item's stock happened to hit 0 -- unlimited-stock-only submissions
  // make this a harmless no-op revalidation, and not every caller needs
  // to reason about which case it was.
  if (result.status === "success") {
    updateTag("products");

    // Prompt 47: server-side Meta Lead event, fired via next/server's
    // after() -- scheduled to run once the response has already been
    // sent to the browser, so a slow (or entirely down) Meta API can
    // never add latency to the user-facing submission, and a thrown
    // error inside it can never turn an already-successful submission
    // into a failed response (sendMetaLeadEvent itself also never
    // throws -- both layers are deliberate, not redundant: after() keeps
    // this off the response's critical path, sendMetaLeadEvent's own
    // try/catch keeps a Meta-side failure from becoming an unhandled
    // rejection in that background task).
    //
    // Request data (headers()) is read HERE, before after(), not inside
    // the after() callback -- Server Functions technically allow
    // headers()/cookies() directly inside after() too, but reading it
    // during the action's own execution and passing plain values in via
    // closure is the pattern Next's own docs demonstrate first, and
    // keeps this correct regardless of exactly which context rules apply
    // where.
    //
    // email/phoneWhatsapp are re-read directly from the SAME formData
    // already validated inside processQuoteRequestSubmission, rather
    // than plumbing them through that function's return type -- keeps
    // this entirely additive, zero changes to the well-tested existing
    // submission logic or its return shape.
    const metaEventId = trimmedOrNull(formData.get("metaEventId"));
    const email = trimmedOrNull(formData.get("email"));
    const phoneWhatsapp = trimmedOrNull(formData.get("phoneWhatsapp"));

    if (metaEventId && email && phoneWhatsapp) {
      const h = await headers();
      const userAgent = h.get("user-agent") ?? "";
      // Same-page Server Action POST -- the browser's own Referer header
      // reliably carries the exact page URL the form was submitted from,
      // which is what event_source_url documents wanting ("the browser
      // URL where the conversion event happened").
      const eventSourceUrl = h.get("referer") ?? h.get("origin") ?? "";

      after(() => {
        void sendMetaLeadEvent({
          eventId: metaEventId,
          email,
          phone: phoneWhatsapp,
          clientIp,
          userAgent,
          eventSourceUrl,
        });
      });
    }
  }

  return result;
}
