import type { Metadata } from "next";
import Link from "next/link";
import { ADMIN_SECTIONS } from "@/lib/admin-nav";
import { createSessionClient } from "@/lib/supabase/server";
import { getNewQuoteRequestCount } from "@/lib/admin/quote-requests";

// Prompt 22's original reasoning (kept for context, now partly
// superseded): no counts anywhere, because 6 of the 7 areas were
// genuinely empty and a dashboard reading "0" everywhere would be noise,
// not signal.
//
// Prompt 46 update, narrow and deliberate: Quote Requests is now the one
// section where a live number is a genuinely useful, actionable
// at-a-glance signal -- "how many submitted inquiries need a first
// response" is exactly the operational question an admin opens this
// dashboard to answer, unlike e.g. "how many categories exist" (static,
// rarely changes, not something you'd check daily). Still deliberately
// NOT extended to every section: products/categories/collections/etc.
// counts would mostly just restate what's already visible one click away
// on their own list pages, with no "needs action" framing behind the
// number -- adding them everywhere would be the same noise Prompt 22
// rejected, just with real data instead of zeros.
export const metadata: Metadata = {
  title: "Dashboard — Masmoum Admin",
  robots: { index: false, follow: false },
};

export default async function AdminDashboardPage() {
  const supabase = await createSessionClient();
  const newQuoteRequestCount = await getNewQuoteRequestCount(supabase);

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
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-brand-black">
                {section.label}
              </h2>
              {section.href === "/admin/quote-requests" &&
              newQuoteRequestCount > 0 ? (
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                  {newQuoteRequestCount} new
                </span>
              ) : null}
            </div>
            <p className="mt-1.5 text-xs text-brand-gray">
              {section.description}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
