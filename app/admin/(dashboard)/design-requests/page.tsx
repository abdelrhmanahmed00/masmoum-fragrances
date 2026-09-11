import type { Metadata } from "next";
import Link from "next/link";
import { createSessionClient } from "@/lib/supabase/server";
import { getDesignRequests } from "@/lib/admin/design-requests";
import DesignRequestStatusBadge from "@/components/admin/DesignRequestStatusBadge";
import {
  DESIGN_REQUEST_STATUSES,
  type AdminDesignRequestStatus,
} from "@/types/admin-design-request";

export const metadata: Metadata = {
  title: "Design Requests — Masmoum Admin",
  robots: { index: false, follow: false },
};

// Byte-for-byte the same structure as app/admin/(dashboard)/quote-requests/
// page.tsx -- createSessionClient, dynamically rendered via cookies(),
// plain uncached supabase-js (nothing public ever reads design_requests,
// so there's no cache to invalidate and none to wrap this read in
// either).
//
// Prompt 142 (Phase C) -- one row per PARENT submission now (customer +
// item count), not one row per single flat design -- see
// lib/admin/design-requests.ts's own comment for the full parent/child/
// grandchild restructuring.

const STATUS_TABS: { label: string; value: AdminDesignRequestStatus | "all" }[] =
  [
    { label: "All", value: "all" },
    { label: "New", value: "new" },
    { label: "Contacted", value: "contacted" },
    { label: "Closed", value: "closed" },
  ];

function isValidStatus(value: string): value is AdminDesignRequestStatus {
  return (DESIGN_REQUEST_STATUSES as readonly string[]).includes(value);
}

const DATE_FORMATTER = new Intl.DateTimeFormat("en-GB", {
  year: "numeric",
  month: "short",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

export default async function AdminDesignRequestsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status: statusParam } = await searchParams;
  const activeFilter =
    statusParam && isValidStatus(statusParam) ? statusParam : undefined;

  const supabase = await createSessionClient();
  const requests = await getDesignRequests(supabase, activeFilter);

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-brand-black">
          Design Requests
        </h1>
      </div>

      {/* Filter tabs: plain links to ?status=..., same shareable/
          bookmarkable-URL reasoning as Quote Requests' own tabs. */}
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
                  ? "/admin/design-requests"
                  : `/admin/design-requests?status=${tab.value}`
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
            : "No design requests yet."}
        </p>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-card border border-brand-border bg-brand-white">
          <table className="w-full min-w-180 text-sm">
            <thead>
              <tr className="border-b border-brand-border text-xs tracking-wide text-brand-gray uppercase">
                <th className="px-4 py-3 text-start font-medium">
                  Submitted
                </th>
                <th className="px-4 py-3 text-start font-medium">
                  Customer
                </th>
                <th className="px-4 py-3 text-start font-medium">Designs</th>
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
                  <td className="px-4 py-3">
                    <div className="font-medium text-brand-black">
                      {request.customer_name}
                    </div>
                    <div className="text-xs text-brand-gray">
                      {request.customer_email}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-brand-gray">
                    {request.item_count} design{request.item_count === 1 ? "" : "s"}
                  </td>
                  <td className="px-4 py-3">
                    <DesignRequestStatusBadge status={request.status} />
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/design-requests/${request.id}`}
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
