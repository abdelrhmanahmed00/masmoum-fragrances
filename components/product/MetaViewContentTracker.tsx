"use client";

import { useEffect } from "react";
import { trackMetaEvent } from "@/lib/meta-pixel-client";

/**
 * Renders nothing -- fires the Meta Pixel ViewContent event once per
 * mount (i.e. once per product detail page view). A tiny client
 * component rather than inlining this into the page itself: the product
 * detail page (app/[locale]/(marketing)/products/[slug]/page.tsx) is a
 * Server Component (SSG/ISR, `revalidate = 3600`) -- `fbq()` only exists
 * in the browser, so firing it needs a client boundary somewhere, and
 * this is the smallest one that does only that, keeping the page itself
 * server-rendered.
 */
export default function MetaViewContentTracker({
  productId,
  productName,
}: {
  productId: string;
  productName: string;
}) {
  useEffect(() => {
    trackMetaEvent("ViewContent", {
      content_ids: [productId],
      content_name: productName,
      content_type: "product",
    });
    // Deliberately re-fires only if the product itself changes (not on
    // every re-render) -- a real, distinct product view is the intended
    // trigger, matching how the effect is scoped for every other
    // one-shot analytics event in this project's pattern.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId]);

  return null;
}
