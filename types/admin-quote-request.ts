/** Mirrors the `quote_request_status` enum (0008 migration) exactly --
 *  used both as the type and, via the array, as the set of valid values
 *  for validation and for rendering every option in the status control.
 *  Deliberately not ordered to imply a required progression (new →
 *  contacted → closed is the common case, but the admin update policy
 *  (0014 migration) allows any → any, e.g. reopening a closed request --
 *  see lib/admin/quote-requests.ts's own comment). */
export const QUOTE_REQUEST_STATUSES = ["new", "contacted", "closed"] as const;
export type AdminQuoteRequestStatus = (typeof QUOTE_REQUEST_STATUSES)[number];

/** List view row -- one per quote_requests row, plus a derived item
 *  count (via a PostgREST embedded `quote_request_items(count)` resource,
 *  not a separate query per row -- see getQuoteRequests). Deliberately
 *  NOT every contact column (email/phone/city/message) -- those only
 *  matter once an admin opens a specific request; the list is a triage
 *  view, not a data dump. */
export type AdminQuoteRequestListRow = {
  id: string;
  full_name: string;
  company_name: string;
  country: string;
  business_type: string | null;
  status: AdminQuoteRequestStatus;
  created_at: string;
  item_count: number;
};

/** Every quote_requests column the detail page needs -- the full contact
 *  record, unlike the list row above. */
export type AdminQuoteRequestDetail = {
  id: string;
  full_name: string;
  company_name: string;
  country: string;
  city: string | null;
  email: string;
  phone_whatsapp: string;
  business_type: string | null;
  message: string | null;
  status: AdminQuoteRequestStatus;
  created_at: string;
};

/** One quote_request_items row, already resolved to a displayable
 *  product name + size label via the join in getQuoteRequestItems --
 *  the detail page renders this directly, no further lookup. */
export type AdminQuoteRequestItemRow = {
  id: string;
  quantity: number;
  product_name_en: string;
  /** Null when product_size_id itself is null (quote_request_items,
   *  0009 migration: `references product_sizes (id) on delete set null`)
   *  -- either the buyer's item genuinely had no size at submission time,
   *  or the size was later deleted and the FK nulled it out. The detail
   *  page renders this as "N/A", not a broken/missing row -- see the
   *  Prompt 46 report for why this case is real and already exists in
   *  production data, not just a hypothetical. */
  size_label: string | null;
};

export type QuoteRequestStatusActionState =
  | { status: "idle" }
  | { status: "success" }
  | { status: "error"; message: string };

export const QUOTE_REQUEST_STATUS_ACTION_INITIAL_STATE: QuoteRequestStatusActionState =
  {
    status: "idle",
  };
