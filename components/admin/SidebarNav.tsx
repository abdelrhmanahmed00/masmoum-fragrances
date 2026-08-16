"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "@/app/admin/actions";
import { ADMIN_SECTIONS } from "@/lib/admin-nav";

// Plain next/navigation Link/usePathname here — NOT the i18n-aware
// wrappers from @/i18n/navigation. /admin is deliberately outside
// next-intl's routing entirely (Prompt 21: no locale prefix, no Arabic
// version), so using the i18n Link/usePathname inside admin code would
// be a real bug (it'd try to reason about a locale segment that doesn't
// exist here), not just an unnecessary import.
const NAV_ITEMS = [
  { href: "/admin", label: "Dashboard", exact: true },
  ...ADMIN_SECTIONS.map(({ href, label }) => ({ href, label, exact: false })),
];

function isActive(pathname: string, href: string, exact: boolean): boolean {
  return exact
    ? pathname === href
    : pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * Shared between the persistent desktop sidebar and the mobile off-canvas
 * drawer (DashboardShell.tsx) — same nav list, same Sign Out button,
 * rendered in two different containers rather than duplicated. `onNavigate`
 * lets the mobile drawer close itself when a link is clicked (it has
 * nothing to do on desktop, where there's no drawer to close).
 */
export default function SidebarNav({
  onNavigate,
}: {
  onNavigate?: () => void;
}) {
  const pathname = usePathname();

  return (
    <div className="flex h-full flex-col">
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <ul className="space-y-1">
          {NAV_ITEMS.map((item) => {
            const active = isActive(pathname, item.href, item.exact);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={onNavigate}
                  aria-current={active ? "page" : undefined}
                  className={
                    "block rounded-btn px-3 py-2 text-sm font-medium transition-colors " +
                    (active
                      ? "bg-brand-black text-brand-white"
                      : "text-brand-black hover:bg-brand-border/50")
                  }
                >
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="border-t border-brand-border p-3">
        <form action={signOut}>
          <button
            type="submit"
            className="w-full rounded-btn border border-brand-border px-3 py-2 text-sm font-medium text-brand-black transition-colors hover:border-brand-black"
          >
            Sign Out
          </button>
        </form>
      </div>
    </div>
  );
}
