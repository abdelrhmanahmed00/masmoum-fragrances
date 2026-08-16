import type { Metadata } from "next";
import Link from "next/link";
import { ADMIN_SECTIONS } from "@/lib/admin-nav";

// Deliberately a welcome message + quick-link cards, not live counts.
// Counts were considered and rejected for this prompt: no CRUD exists
// yet for 6 of the 7 areas (only `categories` has real seeded data --
// the 6 rows from the 0002 migration; products/collections/hero_slides/
// home_videos are genuinely empty and quote_requests' Prompt 20 test
// data was already cleaned up), so a counts dashboard right now would
// mostly just read "0" across the board -- noise reflecting that CRUD
// isn't built yet, not a meaningful overview. Revisit once the sections
// this links to actually have data flowing through them.
export const metadata: Metadata = {
  title: "Dashboard — Masmoum Admin",
  robots: { index: false, follow: false },
};

export default function AdminDashboardPage() {
  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <h1 className="text-xl font-semibold text-brand-black">Dashboard</h1>
      <p className="mt-2 text-sm text-brand-gray">
        You&apos;re signed in. Pick a section below (or from the sidebar) to
        manage it.
      </p>

      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {ADMIN_SECTIONS.map((section) => (
          <Link
            key={section.href}
            href={section.href}
            className="block rounded-card border border-brand-border bg-brand-white p-5 transition-colors hover:border-brand-black"
          >
            <h2 className="text-sm font-semibold text-brand-black">
              {section.label}
            </h2>
            <p className="mt-1.5 text-xs text-brand-gray">
              {section.description}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
