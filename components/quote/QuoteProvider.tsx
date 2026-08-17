"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { AddQuoteItemInput, QuoteLineItem } from "@/types/quote";
import { clampQuantity, mergeQuantity } from "@/lib/quote-quantity";

const STORAGE_KEY = "masmoum-quote-v1";

type QuoteContextValue = {
  items: QuoteLineItem[];
  addItem: (input: AddQuoteItemInput) => void;
  updateQuantity: (id: string, quantity: number) => void;
  removeItem: (id: string) => void;
  clearQuote: () => void;
  /** Distinct line count — this is what the client's spec uses for the
   *  Header pill ("Quote (3)"), see the report for the "TOTAL ITEMS" vs
   *  "TOTAL QTY" distinction. */
  totalItems: number;
  /** Sum of quantities across all lines — for the future summary page's
   *  "TOTAL QTY: 60 PCS", not used by the Header pill. */
  totalQuantity: number;
  /** False until the post-mount localStorage read has completed. Not
   *  needed to avoid a hydration mismatch (see the report — that's solved
   *  by `items` starting at [] identically on server and first client
   *  render), but exposed for consumers that want to avoid a "your quote
   *  is empty" flash before the real state loads (e.g. a future sidebar). */
  isHydrated: boolean;
  /** Sidebar visibility lives here (not a separate context) since it's
   *  part of the same Quote domain and both QuoteSidebar and Header need
   *  to share it — Header's Quote pill opens it, the sidebar itself
   *  closes it. */
  isSidebarOpen: boolean;
  openSidebar: () => void;
  closeSidebar: () => void;
};

const QuoteContext = createContext<QuoteContextValue | null>(null);

function makeLineId(productId: string, productSizeId: string | null): string {
  return `${productId}::${productSizeId ?? "none"}`;
}

function readFromStorage(): QuoteLineItem[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    // Corrupted/unavailable localStorage (private browsing, quota, bad
    // JSON from a previous schema) -- degrade to an empty quote rather
    // than crash the app.
    return [];
  }
}

export function QuoteProvider({ children }: { children: React.ReactNode }) {
  // Starts empty on the server AND on the client's first render — this is
  // what actually prevents a hydration mismatch. See the Prompt 14 report
  // for the full reasoning; short version: server-rendered HTML and the
  // client's first-pass render must be byte-for-byte identical for
  // hydration to succeed, and localStorage doesn't exist on the server, so
  // it can only be read *after* mount (inside useEffect below), applied
  // via a normal post-hydration setState -- never during the render that
  // has to match the server's output.
  const [items, setItems] = useState<QuoteLineItem[]>([]);
  const [isHydrated, setIsHydrated] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Deliberate exception, not a lint violation to fix: the whole point is
  // a ONE-TIME read of an external store (localStorage) that must happen
  // strictly after the hydration render that has to match the server's
  // empty-array output (see the comment above). There's no lazy-initializer
  // alternative here -- a useState(() => readFromStorage()) initializer
  // would run DURING the client's first render too, which is exactly the
  // render that must match SSR, so it would reintroduce the mismatch this
  // effect exists to avoid.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setItems(readFromStorage());
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    // Skip the pre-hydration render so we don't clobber localStorage with
    // the empty initial state before it's actually been read.
    if (!isHydrated) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items, isHydrated]);

  // Prompt 29 (fixing the "added 4 when only 3 in stock" bug): this is the
  // REAL enforcement point for the stock cap, not just a UI nicety on the
  // stepper components -- clamping here means it's impossible to end up
  // with quantity > stockQuantity in stored state regardless of which UI
  // triggered the change (product page stepper, re-clicking "Add to
  // Quote" for a line already in the quote, or the sidebar/summary
  // page's own +/- stepper -- see QuoteQuantityStepper's own comment for
  // why that one ALSO disables its "+" button on top of this, as a UX
  // signal, not because this clamp alone is insufficient).
  const addItem = useCallback((input: AddQuoteItemInput) => {
    setItems((current) => {
      const id = makeLineId(input.productId, input.productSizeId);
      const existingIndex = current.findIndex((item) => item.id === id);

      if (existingIndex !== -1) {
        const next = [...current];
        const existing = next[existingIndex];
        next[existingIndex] = {
          ...existing,
          // Refresh the cap itself (not the other display fields) to the
          // latest known value every time the buyer adds this product+size
          // again -- keeps the enforcement point reasonably current
          // without reintroducing a live re-fetch of the whole snapshot.
          stockQuantity: input.stockQuantity,
          quantity: mergeQuantity(
            existing.quantity,
            input.quantity,
            input.stockQuantity
          ),
        };
        return next;
      }

      return [
        ...current,
        {
          ...input,
          id,
          quantity: clampQuantity(input.quantity, input.stockQuantity),
        },
      ];
    });
  }, []);

  const updateQuantity = useCallback((id: string, quantity: number) => {
    setItems((current) =>
      current.map((item) =>
        item.id === id
          ? { ...item, quantity: clampQuantity(quantity, item.stockQuantity) }
          : item
      )
    );
  }, []);

  const removeItem = useCallback((id: string) => {
    setItems((current) => current.filter((item) => item.id !== id));
  }, []);

  const clearQuote = useCallback(() => {
    setItems([]);
  }, []);

  const openSidebar = useCallback(() => setIsSidebarOpen(true), []);
  const closeSidebar = useCallback(() => setIsSidebarOpen(false), []);

  const totalItems = items.length;
  const totalQuantity = useMemo(
    () => items.reduce((sum, item) => sum + item.quantity, 0),
    [items]
  );

  const value = useMemo<QuoteContextValue>(
    () => ({
      items,
      addItem,
      updateQuantity,
      removeItem,
      clearQuote,
      totalItems,
      totalQuantity,
      isHydrated,
      isSidebarOpen,
      openSidebar,
      closeSidebar,
    }),
    [
      items,
      addItem,
      updateQuantity,
      removeItem,
      clearQuote,
      totalItems,
      totalQuantity,
      isHydrated,
      isSidebarOpen,
      openSidebar,
      closeSidebar,
    ]
  );

  return (
    <QuoteContext.Provider value={value}>{children}</QuoteContext.Provider>
  );
}

export function useQuote(): QuoteContextValue {
  const ctx = useContext(QuoteContext);
  if (!ctx) {
    throw new Error("useQuote must be used within a QuoteProvider");
  }
  return ctx;
}
