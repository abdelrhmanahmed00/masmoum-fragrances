import type { Metadata } from "next";
import { signOut } from "./actions";

// Placeholder dashboard home -- real content (nav shell, catalog CRUD,
// quote request list, etc.) is a later prompt. This page is only reached
// by an authenticated session at all: proxy.ts's admin branch verifies
// the session (via getClaims(), real JWT verification, not a trusted
// cookie read) and redirects unauthenticated requests to /admin/login
// before this ever renders -- so no redundant auth check is repeated
// here, the same way marketing pages don't re-verify the locale param
// beyond what the root layout already does.
export const metadata: Metadata = {
  title: "Dashboard — Masmoum Admin",
  robots: { index: false, follow: false },
};

export default function AdminDashboardPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-brand-black">Dashboard</h1>
        <form action={signOut}>
          <button
            type="submit"
            className="rounded-btn border border-brand-border px-4 py-2 text-sm font-medium text-brand-black transition-colors hover:border-brand-black"
          >
            Sign Out
          </button>
        </form>
      </div>
      <p className="mt-4 text-sm text-brand-gray">
        You&apos;re signed in. The real dashboard (catalog management, quote
        requests, site settings) is built in a later prompt.
      </p>
    </div>
  );
}
