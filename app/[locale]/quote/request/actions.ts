"use server";

import { headers } from "next/headers";
import { processQuoteRequestSubmission } from "@/lib/quote-request-submission";
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
  return processQuoteRequestSubmission(items, formData, clientIp);
}
