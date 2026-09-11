import type { AdminDesignRequestStatus } from "@/types/admin-design-request";

// Byte-for-byte the same palette/reasoning as QuoteStatusBadge.tsx --
// 'new' reads as "needs attention" (amber), 'contacted' is visibly
// in-progress (blue), 'closed' reuses the neutral gray "no action
// needed" treatment. Kept as its own component (not a shared, generic
// StatusBadge<T>) matching types/admin-design-request.ts's own decision
// not to share the status type with Quote Requests.
const STATUS_STYLES: Record<AdminDesignRequestStatus, string> = {
  new: "bg-amber-100 text-amber-800",
  contacted: "bg-blue-100 text-blue-700",
  closed: "bg-brand-border text-brand-gray",
};

export const STATUS_LABELS: Record<AdminDesignRequestStatus, string> = {
  new: "New",
  contacted: "Contacted",
  closed: "Closed",
};

export default function DesignRequestStatusBadge({
  status,
}: {
  status: AdminDesignRequestStatus;
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
