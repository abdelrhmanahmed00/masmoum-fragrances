import "server-only";
import { createHash } from "node:crypto";
import { createServiceRoleClient } from "@/lib/supabase/server";

// Graph API version confirmed to exist via this prompt's research (see
// the Prompt 47 report's cited sources) -- Meta versions are supported
// for a minimum of 2 years from release, so this has comfortable
// remaining headroom. A single named constant, not scattered inline, so
// bumping it later is a one-line change.
const META_GRAPH_API_VERSION = "v23.0";

/** Meta's own documented normalization + hashing rules for Advanced
 *  Matching fields (confirmed via this prompt's research, Customer
 *  Information Parameters doc -- see the Prompt 47 report):
 *   - email (em): trim, lowercase, then SHA-256.
 *   - phone (ph): strip everything but digits, drop leading zeros,
 *     SHA-256. Meta's own guidance says to "always include the country
 *     code" -- this project's phone_whatsapp field is free text with no
 *     enforced format (0008 migration's own comment; same caveat
 *     Footer.tsx's wa.me link and the admin quote-request detail page
 *     already carry, Prompts 44/46), so this can only strip what's
 *     there, not invent a country code the buyer never typed. Best
 *     effort, not a guarantee -- consistent with every other place in
 *     this project that builds a contact link from this same column. */
function sha256Hex(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function hashEmail(email: string): string {
  return sha256Hex(email.trim().toLowerCase());
}

function hashPhone(phone: string): string {
  const digitsOnly = phone.replace(/[^\d]/g, "").replace(/^0+/, "");
  return sha256Hex(digitsOnly);
}

// client_ip_address must be a valid IPv4/IPv6 address per Meta's schema
// -- the calling action's IP resolution (getClientIp,
// app/[locale]/quote/request/actions.ts) falls back to the literal
// string "unknown" in local dev when neither proxy header is present.
// Sending that string would make Meta reject the whole event, so it's
// only included when it actually looks like an IP -- omitting an
// optional field is always safe, sending a malformed one isn't.
const IPV4_PATTERN = /^\d{1,3}(\.\d{1,3}){3}$/;
const IPV6_PATTERN = /^[0-9a-fA-F:]+:[0-9a-fA-F:]+$/;

function looksLikeIp(value: string): boolean {
  return IPV4_PATTERN.test(value) || IPV6_PATTERN.test(value);
}

type SendLeadEventParams = {
  /** Same ID the client-side pixel's fbq('track', 'Lead', ...) call uses
   *  for this exact submission -- see QuoteRequestForm.tsx and the
   *  Prompt 47 report for how it's generated client-side and threaded
   *  through as a hidden form field. Meta deduplicates a browser + server
   *  event pair sharing the same event_name + event_id (within its own
   *  time window) into a single counted event -- without this matching,
   *  a real Lead would be double-counted. */
  eventId: string;
  email: string;
  phone: string;
  clientIp: string;
  userAgent: string;
  eventSourceUrl: string;
};

/**
 * Fires a server-side Lead event to Meta's Conversions API. Only Lead --
 * not AddToCart or ViewContent -- gets a server-side mirror in this
 * design (see the Prompt 47 report for the full reasoning): Lead is the
 * one event tied to actual business value for this B2B lead-gen site (no
 * direct purchase/checkout exists at all), and it's exactly the kind of
 * event most likely to be lost client-side (ad blockers, Safari ITP,
 * a visitor closing the confirmation page before the browser pixel call
 * finishes) -- which is precisely the gap CAPI exists to cover. Mirroring
 * AddToCart/ViewContent server-side too would need to persist "add to
 * quote" and "view product" as durable server-side events (they aren't
 * today -- QuoteProvider is client-only/localStorage, and a page view has
 * no DB row at all), for two events with no direct revenue signal behind
 * them -- real added complexity for comparatively little value.
 *
 * Not awaited by its caller (app/[locale]/quote/request/actions.ts calls
 * this from inside next/server's `after()`) -- a Meta API failure must
 * never fail or slow down the actual quote submission, which has already
 * fully succeeded (the quote_requests row exists) by the time this runs.
 * Every failure path below is caught and logged, never thrown.
 */
export async function sendMetaLeadEvent(
  params: SendLeadEventParams
): Promise<void> {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("integration_settings")
    .select("meta_pixel_id, meta_conversions_api_token")
    .eq("id", true)
    .maybeSingle();

  if (error || !data?.meta_pixel_id || !data?.meta_conversions_api_token) {
    // Graceful no-op, not an error -- the vast majority of this
    // project's lifetime so far has this genuinely unconfigured (task
    // point 6: "confirm the entire feature is inert ... when
    // meta_pixel_id/token are both null"). Nothing to log here; an admin
    // who hasn't set this up yet doesn't need a warning on every quote
    // submission.
    return;
  }

  const userData: Record<string, unknown> = {
    em: [hashEmail(params.email)],
    ph: [hashPhone(params.phone)],
    client_user_agent: params.userAgent,
  };
  if (looksLikeIp(params.clientIp)) {
    userData.client_ip_address = params.clientIp;
  }

  const payload = {
    data: [
      {
        event_name: "Lead",
        event_time: Math.floor(Date.now() / 1000),
        event_id: params.eventId,
        event_source_url: params.eventSourceUrl,
        action_source: "website",
        user_data: userData,
      },
    ],
  };

  const url =
    `https://graph.facebook.com/${META_GRAPH_API_VERSION}/${data.meta_pixel_id}/events` +
    `?access_token=${encodeURIComponent(data.meta_conversions_api_token)}`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const body = await response.text();
      console.error("[meta-capi] Lead event rejected by Meta", {
        status: response.status,
        body,
      });
    }
  } catch (err) {
    console.error("[meta-capi] Lead event request failed", err);
  }
}
