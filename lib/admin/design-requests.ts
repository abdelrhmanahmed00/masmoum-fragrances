import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getPublicStorageUrl } from "@/lib/supabase/storage";
import {
  DESIGN_REQUEST_STATUSES,
  type AdminDesignRequestDetail,
  type AdminDesignRequestItem,
  type AdminDesignRequestItemLogo,
  type AdminDesignRequestListRow,
  type AdminDesignRequestStatus,
  type DesignRequestStatusActionState,
} from "@/types/admin-design-request";

// Same plain-function-taking-a-client split as every other lib/admin/*.ts
// file (see lib/admin/categories.ts's own comment for the full
// reasoning). Genuinely narrow like lib/admin/quote-requests.ts: per the
// 0037 migration's RLS grants, `authenticated` gets SELECT + UPDATE on
// design_requests (no INSERT -- these are customer-submitted records,
// created anonymously during the designer flow, not admin-authored; no
// DELETE either, matching quote_requests' own "prefer closed over
// destroyed" convention) and SELECT-only on the two child tables
// (design_request_items, design_request_item_logos -- admin views them
// alongside the parent, never edits/removes them independently, same as
// quote_request_items). So there's no create/delete function here at
// all -- three reads and one narrow (status-only, parent-only) update.

const BUCKET = "design-requests";

type RawListRow = {
  id: string;
  customer_name: string;
  customer_email: string;
  status: AdminDesignRequestStatus;
  created_at: string;
  // PostgREST's embedded-resource count shape: an array with one object,
  // not a bare number -- same shape already confirmed for
  // quote_request_items(count) (see lib/admin/quote-requests.ts's own
  // comment).
  design_request_items: { count: number }[];
};

/** Newest first, optionally filtered to one status -- one row per
 *  PARENT submission, with item_count from a single embedded-resource
 *  query (not a separate count query per row). */
export async function getDesignRequests(
  supabase: SupabaseClient,
  statusFilter?: AdminDesignRequestStatus
): Promise<AdminDesignRequestListRow[]> {
  let query = supabase
    .from("design_requests")
    .select(
      "id, customer_name, customer_email, status, created_at, design_request_items(count)"
    )
    .order("created_at", { ascending: false });

  if (statusFilter) {
    query = query.eq("status", statusFilter);
  }

  const { data, error } = await query;
  if (error || !data) return [];

  return (data as unknown as RawListRow[]).map((row) => ({
    id: row.id,
    customer_name: row.customer_name,
    customer_email: row.customer_email,
    item_count: row.design_request_items[0]?.count ?? 0,
    status: row.status,
    created_at: row.created_at,
  }));
}

/** Just the 'new' count, for the dashboard home's quick-glance card --
 *  same "needs a first response" at-a-glance signal as
 *  getNewQuoteRequestCount, reused verbatim for this second inquiry
 *  inbox. */
export async function getNewDesignRequestCount(
  supabase: SupabaseClient
): Promise<number> {
  const { count, error } = await supabase
    .from("design_requests")
    .select("id", { count: "exact", head: true })
    .eq("status", "new");

  return error || count === null ? 0 : count;
}

type RawLogoRow = {
  id: string;
  logo_storage_path: string;
  sort_order: number;
};

type RawItemRow = {
  id: string;
  bottle_color: string;
  composite_image_storage_path: string;
  note: string | null;
  sort_order: number;
  design_request_item_logos: RawLogoRow[];
};

type RawDetailRow = {
  id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  customer_company: string;
  status: AdminDesignRequestStatus;
  created_at: string;
  design_request_items: RawItemRow[];
};

/**
 * Full parent + every child design item + every grandchild logo, each
 * image resolved to a public URL, everything sorted by its own
 * sort_order -- sorted here in application code (not relied on from
 * PostgREST's own embedded-resource ordering, which needs an explicit
 * `.order(..., { foreignTable })` per nesting level to guarantee at
 * all) so the admin always sees designs/logos in the exact order the
 * customer actually built them in.
 */
export async function getDesignRequestDetail(
  supabase: SupabaseClient,
  id: string
): Promise<AdminDesignRequestDetail | null> {
  const { data, error } = await supabase
    .from("design_requests")
    .select(
      `id, customer_name, customer_email, customer_phone, customer_company, status, created_at,
       design_request_items (
         id, bottle_color, composite_image_storage_path, note, sort_order,
         design_request_item_logos ( id, logo_storage_path, sort_order )
       )`
    )
    .eq("id", id)
    .maybeSingle();

  if (error || !data) return null;

  const row = data as unknown as RawDetailRow;

  const items: AdminDesignRequestItem[] = [...row.design_request_items]
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((item) => {
      const logos: AdminDesignRequestItemLogo[] = [...item.design_request_item_logos]
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((logo) => ({
          id: logo.id,
          logoImageUrl: getPublicStorageUrl(BUCKET, logo.logo_storage_path),
          sort_order: logo.sort_order,
        }));

      return {
        id: item.id,
        bottle_color: item.bottle_color,
        compositeImageUrl: getPublicStorageUrl(BUCKET, item.composite_image_storage_path),
        note: item.note,
        sort_order: item.sort_order,
        logos,
      };
    });

  return {
    id: row.id,
    customer_name: row.customer_name,
    customer_email: row.customer_email,
    customer_phone: row.customer_phone,
    customer_company: row.customer_company,
    status: row.status,
    created_at: row.created_at,
    items,
  };
}

/**
 * Status only, on the PARENT row -- same "no transition restricted"
 * reasoning as updateQuoteRequestStatus. Child tables (design_request_items,
 * design_request_item_logos) have no status of their own and no admin
 * UPDATE grant at all (0037 migration) -- matching quote_requests' own
 * convention of not letting a status update cascade oddly onto child
 * records that don't conceptually have their own status.
 */
export async function updateDesignRequestStatus(
  supabase: SupabaseClient,
  id: string,
  status: string
): Promise<DesignRequestStatusActionState> {
  if (!DESIGN_REQUEST_STATUSES.includes(status as AdminDesignRequestStatus)) {
    return { status: "error", message: "Invalid status." };
  }

  const { error } = await supabase
    .from("design_requests")
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
