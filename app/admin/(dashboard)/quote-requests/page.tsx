import type { Metadata } from "next";
import Link from "next/link";
import { createSessionClient } from "@/lib/supabase/server";
import { getQuoteRequests } from "@/lib/admin/quote-requests";
import QuoteStatusBadge from "@/components/admin/QuoteStatusBadge";
import {
  QUOTE_REQUEST_STATUSES,
  type AdminQuoteRequestStatus,
} from "@/types/admin-quote-request";

export const metadata: Metadata = {
  title: "Quote Requests — Masmoum Admin",
  robots: { index: false, follow: false },
};

// Mirrors categories'/products' list pages -- createSessionClient,
// dynamically rendered via cookies(). No updateTag/cache concern here at
// all (see actions.ts's own comment for the full reasoning): this query
// is plain, uncached supabase-js, same as every other admin list.
const STATUS_TABS: { label: string; value: AdminQuoteRequestStatus | "all" }[] =
  [
    { label: "All", value: "all" },
    { label: "New", value: "new" },
    { label: "Contacted", value: "contacted" },
    { label: "Closed", value: "closed" },
  ];

function isValidStatus(value: string): value is AdminQuoteRequestStatus {
  return (QUOTE_REQUEST_STATUSES as readonly string[]).includes(value);
}

const DATE_FORMATTER = new Intl.DateTimeFormat("en-GB", {
  year: "numeric",
  month: "short",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

export default async function AdminQuoteRequestsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status: statusParam } = await searchParams;
  const activeFilter =
    statusParam && isValidStatus(statusParam) ? statusParam : undefined;

  const supabase = await createSessionClient();
  const requests = await getQuoteRequests(supabase, activeFilter);

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-brand-black">
          Quote Requests
        </h1>
      </div>

      {/* Filter tabs: plain links to ?status=..., not client-side state --
          this list can only ever grow, so a shareable/bookmarkable/
          refresh-safe URL for "just show me New" is more useful here
          than transient client state, and it costs nothing extra since
          the page is already a Server Component doing a fresh query per
          navigation. */}
      <div className="mt-6 flex flex-wrap gap-2 border-b border-brand-border pb-3">
        {STATUS_TABS.map((tab) => {
          const isActive =
            tab.value === "all"
              ? activeFilter === undefined
              : activeFilter === tab.value;
          return (
            <Link
              key={tab.value}
              href={
                tab.value === "all"
                  ? "/admin/quote-requests"
                  : `/admin/quote-requests?status=${tab.value}`
              }
              className={
                "rounded-full px-3 py-1.5 text-sm font-medium transition-colors " +
                (isActive
                  ? "bg-brand-black text-brand-white"
                  : "text-brand-gray hover:bg-brand-border/60 hover:text-brand-black")
              }
            >
              {tab.label}
            </Link>
          );
        })}
      </div>

      {requests.length === 0 ? (
        <p className="mt-8 text-sm text-brand-gray">
          {activeFilter
            ? `No ${activeFilter} requests.`
            : "No quote requests yet."}
        </p>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-card border border-brand-border bg-brand-white">
          <table className="w-full min-w-[860px] text-sm">
            <thead>
              <tr className="border-b border-brand-border text-xs tracking-wide text-brand-gray uppercase">
                <th className="px-4 py-3 text-start font-medium">
                  Submitted
                </th>
                <th className="px-4 py-3 text-start font-medium">Name</th>
                <th className="px-4 py-3 text-start font-medium">Company</th>
                <th className="px-4 py-3 text-start font-medium">Country</th>
                <th className="px-4 py-3 text-start font-medium">
                  Business Type
                </th>
                <th className="px-4 py-3 text-start font-medium">Items</th>
                <th className="px-4 py-3 text-start font-medium">Status</th>
                <th className="px-4 py-3 text-start font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((request) => (
                <tr
                  key={request.id}
                  className="border-b border-brand-border last:border-0"
                >
                  <td className="px-4 py-3 whitespace-nowrap text-brand-gray">
                    {DATE_FORMATTER.format(new Date(request.created_at))}
                  </td>
                  <td className="px-4 py-3 font-medium text-brand-black">
                    {request.full_name}
                  </td>
                  <td className="px-4 py-3 text-brand-gray">
                    {request.company_name}
                  </td>
                  <td className="px-4 py-3 text-brand-gray">
                    {request.country}
                  </td>
                  <td className="px-4 py-3 text-brand-gray">
                    {request.business_type ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-brand-gray">
                    {request.item_count}
                  </td>
                  <td className="px-4 py-3">
                    <QuoteStatusBadge status={request.status} />
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/quote-requests/${request.id}`}
                      className="text-brand-black underline-offset-2 hover:underline"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
