import type { AdminQuoteRequestStatus } from "@/types/admin-quote-request";

// 'new' uses amber, not the green/gray "Active/Inactive" palette every
// other admin list already uses (categories/products) -- deliberately
// distinct so a 'new' request reads as "needs attention" at a glance in
// the list view (this section's actual operational purpose, per the
// Prompt 46 task), not just "the default status." 'contacted' (blue) is
// visibly in-progress; 'closed' reuses the same neutral gray as
// "Inactive" elsewhere -- both mean "no action needed right now."
const STATUS_STYLES: Record<AdminQuoteRequestStatus, string> = {
  new: "bg-amber-100 text-amber-800",
  contacted: "bg-blue-100 text-blue-700",
  closed: "bg-brand-border text-brand-gray",
};

export const STATUS_LABELS: Record<AdminQuoteRequestStatus, string> = {
  new: "New",
  contacted: "Contacted",
  closed: "Closed",
};

export default function QuoteStatusBadge({
  status,
}: {
  status: AdminQuoteRequestStatus;
}) {
  return (
    <span
      className={
        "rounded-full px-2 py-0.5 text-xs font-medium " + STATUS_STYLES[status]
      }
    >
      {STATUS_LABELS[status]}
    </span>
  );
}
