"use client";

import { useState } from "react";
import Link from "next/link";
import SidebarNav from "./SidebarNav";

const BRAND_NAME = "MASMOUM ADMIN";

// Off-canvas mobile pattern reused as-is from Header.tsx's mobile nav
// (Prompt 5) / QuoteSidebar (Prompt 18): full-screen backdrop (opacity
// transition) + panel sliding in via translate-x, closes on backdrop
// click or its own close button. No rtl: variant here, unlike those two
// -- /admin never renders in RTL (Prompt 21's own confirmed reasoning),
// so there's nothing to mirror.
export default function DashboardShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <div className="flex min-h-screen">
      {/* Desktop: persistent, pinned sidebar */}
      <aside className="hidden w-64 shrink-0 border-e border-brand-border bg-brand-white lg:sticky lg:top-0 lg:block lg:h-screen">
        <div className="border-b border-brand-border px-4 py-4">
          <Link
            href="/admin"
            className="text-sm font-semibold tracking-wide text-brand-black"
          >
            {BRAND_NAME}
          </Link>
        </div>
        <div className="h-[calc(100%-57px)]">
          <SidebarNav />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile-only top bar: hamburger + brand, same shape as
            Header.tsx's own mobile row. */}
        <div className="flex items-center gap-3 border-b border-brand-border bg-brand-white px-4 py-3 lg:hidden">
          <button
            type="button"
            className="-ms-2 p-2 text-brand-black"
            aria-expanded={isMenuOpen}
            aria-controls="admin-mobile-nav"
            onClick={() => setIsMenuOpen(true)}
          >
            <span className="sr-only">Open menu</span>
            <svg
              viewBox="0 0 24 24"
              className="h-6 w-6"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" d="M3 6h18M3 12h18M3 18h18" />
            </svg>
          </button>
          <span className="text-sm font-semibold tracking-wide text-brand-black">
            {BRAND_NAME}
          </span>
        </div>

        <main className="flex-1">{children}</main>
      </div>

      {/* Mobile off-canvas nav */}
      <div
        className={
          "fixed inset-0 z-60 lg:hidden " +
          (isMenuOpen ? "pointer-events-auto" : "pointer-events-none")
        }
        aria-hidden={!isMenuOpen}
      >
        <div
          className={
            "absolute inset-0 bg-brand-black/50 transition-opacity duration-300 " +
            (isMenuOpen ? "opacity-100" : "opacity-0")
          }
          onClick={() => setIsMenuOpen(false)}
        />
        <div
          id="admin-mobile-nav"
          className={
            "absolute inset-y-0 start-0 w-4/5 max-w-xs overflow-y-auto bg-brand-white shadow-brand transition-transform duration-300 " +
            (isMenuOpen ? "translate-x-0" : "-translate-x-full")
          }
        >
          <div className="flex items-center justify-between border-b border-brand-border px-4 py-4">
            <span className="text-sm font-semibold tracking-wide text-brand-black">
              {BRAND_NAME}
            </span>
            <button
              type="button"
              className="p-2 text-brand-black"
              onClick={() => setIsMenuOpen(false)}
            >
              <span className="sr-only">Close menu</span>
              <svg
                viewBox="0 0 24 24"
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          </div>
          <div className="h-[calc(100%-57px)]">
            <SidebarNav onNavigate={() => setIsMenuOpen(false)} />
          </div>
        </div>
      </div>
    </div>
  );
}
