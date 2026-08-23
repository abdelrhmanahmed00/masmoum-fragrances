"use client";

// Thin, safe wrapper around the global `fbq()` the Meta Pixel base script
// (lib/meta-pixel.ts's buildMetaPixelBaseScript, rendered from the root
// layout) defines on `window`. Every call site in this project
// (AddToQuoteButton, MetaViewContentTracker, QuoteRequestForm) goes
// through this instead of calling `window.fbq` directly, so the
// "graceful disable when unconfigured" requirement (Prompt 47 task point
// 6) only has to be implemented once: when meta_pixel_id is unset, the
// base script never renders at all, `window.fbq` is simply never
// defined, and every call below silently no-ops -- no broken script
// tags, no thrown errors, nothing for a visitor or the console to notice.

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
  }
}

/**
 * `eventId`, when passed, is forwarded as fbq's documented third-argument
 * eventID option (https://developers.facebook.com/docs/meta-pixel/reference#event-deduplication)
 * -- Meta's own event-deduplication mechanism for when the SAME
 * conversion is also reported server-side via the Conversions API. Only
 * the Lead event (QuoteRequestForm, on a successful submission) actually
 * passes one in this project -- see the Prompt 47 report for why
 * AddToCart/ViewContent are browser-only and don't need it.
 */
export function trackMetaEvent(
  eventName: string,
  params: Record<string, unknown> = {},
  eventId?: string
) {
  if (typeof window === "undefined" || typeof window.fbq !== "function") {
    return;
  }
  if (eventId) {
    window.fbq("track", eventName, params, { eventID: eventId });
  } else {
    window.fbq("track", eventName, params);
  }
}
