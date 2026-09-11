"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { BottleColorSlot } from "@/types/admin-bottle-colors";

/**
 * Prompt 143 (Phase D) -- the shared "cart" of saved bottle designs,
 * lifted out of BottleDesigner.tsx (where Phase B/Prompt 141 originally
 * kept it as local component state) into a real Context Provider, for
 * exactly one reason: the customer-info page (/design-your-bottle/request,
 * a genuinely separate route) needs to read this SAME state to build its
 * submission summary and actually submit it.
 *
 * WHY A CONTEXT PROVIDER, NOT sessionStorage/localStorage/URL params
 * (this prompt's own explicit question) -- a real, structural
 * constraint, not a style preference: each SavedDesign's `logos` array
 * holds real `File` objects and `blob:` object URLs (Phase A/Prompt 140's
 * own multi-logo state, carried through unchanged here). Neither is
 * JSON-serializable:
 *   - `File` objects cannot be stored in localStorage/sessionStorage at
 *     all (structured-cloneable in IndexedDB, not JSON-serializable to a
 *     string-only store) without re-encoding every file as base64 first
 *     -- real, wasteful overhead for what's already an in-memory Blob,
 *     for a value that only needs to survive a few seconds of
 *     same-session navigation.
 *   - `blob:` object URLs are scoped to the DOCUMENT that created them.
 *     A real, full-page reload (or a `sessionStorage`-based approach
 *     that assumed one would survive it) would leave every stored URL
 *     pointing at nothing. URL query params have the identical problem
 *     PLUS a real practical size ceiling for a handful of images'
 *     worth of state.
 * A React Context, by contrast, persists correctly across a CLIENT-SIDE
 * (soft) navigation between two routes -- Next.js's App Router doesn't
 * tear down the JS heap or unmount a shared ancestor layout on a
 * same-origin Link/router.push transition, so the exact same File
 * objects and blob: URLs remain valid on the other side, no
 * serialization needed at all. This is the SAME reasoning QuoteProvider
 * already establishes for the shopping-cart-style `items` array (see
 * that file's own top comment) -- reused here, with one deliberate
 * difference: QuoteProvider ALSO persists to localStorage (its `items`
 * are plain JSON-serializable primitives, and surviving a real page
 * reload is a real, asked-for feature there). This provider does NOT --
 * File/blob: state genuinely can't survive a reload regardless, so
 * attempting partial persistence would be misleading (a customer
 * refreshing mid-flow would see an inconsistent, partially-recovered
 * cart) rather than helpful. A full reload here genuinely does lose the
 * in-progress cart -- an accepted, documented tradeoff, not an oversight.
 *
 * SCOPE: mounted at app/[locale]/(marketing)/design-your-bottle/layout.tsx
 * (a NEW layout scoped to just this feature's 2 routes), not the root
 * [locale] layout QuoteProvider uses -- this state has no reason to
 * exist anywhere else on the site, unlike the cart (reachable from the
 * Header on every page).
 */

export type DesignPosition = { x: number; y: number };

export type DesignLogoEntry = {
  id: string;
  file: File;
  originalUrl: string;
  processedUrl: string | null;
  useProcessed: boolean;
  isRemovingBackground: boolean;
  bgRemovalError: string | null;
  position: DesignPosition;
};

export type SavedDesign = {
  id: string;
  bottleColor: BottleColorSlot;
  logos: DesignLogoEntry[];
  note: string;
  /** A real, pre-rendered composite (bottle + every logo, exact
   *  positions) generated once at save time via generateCompositeImage
   *  -- both the "My Designs" thumbnail AND (Phase D) the actual
   *  composite image uploaded on final submission reuse this SAME blob:
   *  URL, never regenerated a second time. */
  thumbnailUrl: string;
};

type DesignRequestContextValue = {
  savedDesigns: SavedDesign[];
  addSavedDesign: (design: SavedDesign) => void;
  removeSavedDesign: (id: string) => void;
  /** Clears the whole list -- called once after a real successful
   *  submission (Phase D), the only place this is needed. */
  clearSavedDesigns: () => void;
};

const DesignRequestContext = createContext<DesignRequestContextValue | null>(null);

export function DesignRequestProvider({ children }: { children: React.ReactNode }) {
  const [savedDesigns, setSavedDesigns] = useState<SavedDesign[]>([]);

  const addSavedDesign = useCallback((design: SavedDesign) => {
    setSavedDesigns((prev) => [...prev, design]);
  }, []);

  const removeSavedDesign = useCallback((id: string) => {
    setSavedDesigns((prev) => prev.filter((d) => d.id !== id));
  }, []);

  const clearSavedDesigns = useCallback(() => {
    setSavedDesigns([]);
  }, []);

  const value = useMemo<DesignRequestContextValue>(
    () => ({ savedDesigns, addSavedDesign, removeSavedDesign, clearSavedDesigns }),
    [savedDesigns, addSavedDesign, removeSavedDesign, clearSavedDesigns]
  );

  return (
    <DesignRequestContext.Provider value={value}>
      {children}
    </DesignRequestContext.Provider>
  );
}

export function useDesignRequest(): DesignRequestContextValue {
  const ctx = useContext(DesignRequestContext);
  if (!ctx) {
    throw new Error("useDesignRequest must be used within a DesignRequestProvider");
  }
  return ctx;
}
