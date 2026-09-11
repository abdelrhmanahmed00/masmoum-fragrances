/** Mirrors the design_requests table's own `status` CHECK constraint
 *  (0037 migration) exactly -- same 3 values as
 *  types/admin-quote-request.ts's QUOTE_REQUEST_STATUSES, but kept as a
 *  genuinely separate type/array, not reused -- same reasoning the 0037
 *  migration's own comment gives for NOT sharing the DB-level enum
 *  across these two conceptually distinct request tables. */
export const DESIGN_REQUEST_STATUSES = ["new", "contacted", "closed"] as const;
export type AdminDesignRequestStatus = (typeof DESIGN_REQUEST_STATUSES)[number];

/**
 * Prompt 142 (Phase C) -- design_requests is now the PARENT of a real
 * submission (customer info + status), design_request_items is the
 * CHILD (one row per saved design within that submission -- Phase B's
 * "My Designs"), design_request_item_logos is the GRANDCHILD (one row
 * per logo within a design -- Phase A's multi-logo canvas). These three
 * types mirror that shape directly, rather than the old flat
 * AdminDesignRequestDetail (single bottle_color/note/logo per row).
 */
export type AdminDesignRequestItemLogo = {
  id: string;
  logoImageUrl: string;
  sort_order: number;
};

export type AdminDesignRequestItem = {
  id: string;
  bottle_color: string;
  compositeImageUrl: string;
  note: string | null;
  sort_order: number;
  logos: AdminDesignRequestItemLogo[];
};

/** List view row -- one per PARENT design_requests row (one per
 *  submission, not one per design item) -- item_count comes from a
 *  PostgREST embedded `design_request_items(count)` resource, same
 *  "one query, not N+1" technique AdminQuoteRequestListRow's own
 *  item_count already uses. Deliberately NOT every customer field
 *  (phone/company) -- those only matter once an admin opens a specific
 *  request; the list is a triage view, not a data dump, same reasoning
 *  as AdminQuoteRequestListRow. */
export type AdminDesignRequestListRow = {
  id: string;
  customer_name: string;
  customer_email: string;
  item_count: number;
  status: AdminDesignRequestStatus;
  created_at: string;
};

/** Every field the detail page needs -- full customer contact record
 *  (matching AdminQuoteRequestDetail's own shape) PLUS every design
 *  item, each with every one of its own logos already resolved to
 *  public URLs and sorted by sort_order. */
export type AdminDesignRequestDetail = {
  id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  customer_company: string;
  status: AdminDesignRequestStatus;
  created_at: string;
  items: AdminDesignRequestItem[];
};

export type DesignRequestStatusActionState =
  | { status: "idle" }
  | { status: "success" }
  | { status: "error"; message: string };

export const DESIGN_REQUEST_STATUS_ACTION_INITIAL_STATE: DesignRequestStatusActionState =
  { status: "idle" };
