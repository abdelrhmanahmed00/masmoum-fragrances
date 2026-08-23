import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  QUOTE_REQUEST_STATUSES,
  type AdminQuoteRequestDetail,
  type AdminQuoteRequestItemRow,
  type AdminQuoteRequestListRow,
  type AdminQuoteRequestStatus,
  type QuoteRequestStatusActionState,
} from "@/types/admin-quote-request";

// Same plain-function-taking-a-client split as every other lib/admin/*.ts
// file (see lib/admin/categories.ts's own comment for the full
// reasoning). Genuinely narrower than the others, though: per the 0014
// migration's RLS grants, `authenticated` gets SELECT + UPDATE on
// quote_requests (no INSERT/DELETE -- these are customer-submitted
// records, not admin-authored content) and SELECT-only on
// quote_request_items (view alongside the parent, never edited
// independently). So there's no create/delete function here at all --
// just three reads and one narrow update (status only).

type RawListRow = {
  id: string;
  full_name: string;
  company_name: string;
  country: string;
  business_type: string | null;
  status: AdminQuoteRequestStatus;
  created_at: string;
  // PostgREST's embedded-resource count shape: an array with one object,
  // not a bare number -- confirmed against the real API before writing
  // this (see the Prompt 46 report).
  quote_request_items: { count: number }[];
};

/**
 * Newest first, optionally filtered to one status. Item count comes from
 * a single PostgREST embedded `quote_request_items(count)` resource on
 * the same query -- not a separate count query per row (which would be
 * N+1 as this list grows) and not a denormalized column on
 * quote_requests (nothing else needs one, and it would just be another
 * value to keep in sync with the child table).
 */
export async function getQuoteRequests(
  supabase: SupabaseClient,
  statusFilter?: AdminQuoteRequestStatus
): Promise<AdminQuoteRequestListRow[]> {
  let query = supabase
    .from("quote_requests")
    .select(
      "id, full_name, company_name, country, business_type, status, created_at, quote_request_items(count)"
    )
    .order("created_at", { ascending: false });

  if (statusFilter) {
    query = query.eq("status", statusFilter);
  }

  const { data, error } = await query;
  if (error || !data) return [];

  return (data as unknown as RawListRow[]).map((row) => ({
    id: row.id,
    full_name: row.full_name,
    company_name: row.company_name,
    country: row.country,
    business_type: row.business_type,
    status: row.status,
    created_at: row.created_at,
    item_count: row.quote_request_items[0]?.count ?? 0,
  }));
}

/** Just the 'new' count, for the dashboard home's quick-glance card --
 *  `head: true, count: "exact"` asks PostgREST for a row count without
 *  returning any actual rows (a real response-size optimization once
 *  this table has hundreds of rows, not just today's 2). */
export async function getNewQuoteRequestCount(
  supabase: SupabaseClient
): Promise<number> {
  const { count, error } = await supabase
    .from("quote_requests")
    .select("id", { count: "exact", head: true })
    .eq("status", "new");

  return error || count === null ? 0 : count;
}

export async function getQuoteRequestDetail(
  supabase: SupabaseClient,
  id: string
): Promise<AdminQuoteRequestDetail | null> {
  const { data, error } = await supabase
    .from("quote_requests")
    .select(
      "id, full_name, company_name, country, city, email, phone_whatsapp, business_type, message, status, created_at"
    )
    .eq("id", id)
    .maybeSingle();

  if (error || !data) return null;
  return data as AdminQuoteRequestDetail;
}

type RawItemRow = {
  id: string;
  quantity: number;
  // to-one relations (product_id/product_size_id are each a single FK,
  // not a list) come back as a single object or null, not an array --
  // confirmed against the real API before writing this.
  products: { name_en: string } | null;
  product_sizes: { size_label: string } | null;
};

/**
 * Line items for one quote request, joined to products/product_sizes so
 * the detail page can show a real name and size label instead of raw
 * UUIDs (quote_request_items only stores product_id/product_size_id/
 * quantity -- Prompt 46 task's own framing).
 *
 * name_en only, not both locales -- the admin dashboard is English-only
 * throughout this project (every other admin list already only shows
 * name_en as the primary column, name_ar as a small secondary line at
 * most); a wholesale inquiry's line items are for an English-speaking
 * admin to action, not to render for a site visitor in their locale, so
 * there's no pickLocalizedSetting-style locale resolution needed here at
 * all.
 *
 * products is typed as possibly null defensively, but in practice can't
 * actually be: quote_request_items.product_id is `on delete restrict`
 * (0009 migration), so a product referenced by any quote history can
 * never be deleted while that history exists -- the row this join reads
 * always exists. product_sizes IS `on delete set null`, so
 * product_size_id (and therefore this join) can genuinely be null on a
 * real row -- see AdminQuoteRequestItemRow.size_label's own comment.
 */
export async function getQuoteRequestItems(
  supabase: SupabaseClient,
  quoteRequestId: string
): Promise<AdminQuoteRequestItemRow[]> {
  const { data, error } = await supabase
    .from("quote_request_items")
    .select("id, quantity, products(name_en), product_sizes(size_label)")
    .eq("quote_request_id", quoteRequestId)
    .order("created_at", { ascending: true });

  if (error || !data) return [];

  return (data as unknown as RawItemRow[]).map((row) => ({
    id: row.id,
    quantity: row.quantity,
    product_name_en: row.products?.name_en ?? "(product unavailable)",
    size_label: row.product_sizes?.size_label ?? null,
  }));
}

/**
 * Status only -- the 0014 migration's admin UPDATE policy technically
 * allows rewriting any column (Postgres has no column-level RLS without
 * separate column privileges), but this function only ever accepts and
 * writes `status`, matching the migration's own documented convention
 * that the UI is expected to enforce that narrower scope. No transition
 * restriction (e.g. rejecting closed → new) -- the task is explicit that
 * an admin might need to reopen a request, so any value → any other
 * value is accepted as long as it's a real enum member.
 */
export async function updateQuoteRequestStatus(
  supabase: SupabaseClient,
  id: string,
  status: string
): Promise<QuoteRequestStatusActionState> {
  if (!QUOTE_REQUEST_STATUSES.includes(status as AdminQuoteRequestStatus)) {
    return { status: "error", message: "Invalid status." };
  }

  const { error } = await supabase
    .from("quote_requests")
    .update({ status })
    .eq("id", id);

  if (error) {
    return {
      status: "error",
      message: "Something went wrong updating the status. Please try again.",
    };
  }

  return { status: "success" };
}
