"use client";

import { useActionState } from "react";
import { updateQuoteRequestStatusAction } from "@/app/admin/(dashboard)/quote-requests/actions";
import {
  QUOTE_REQUEST_STATUSES,
  QUOTE_REQUEST_STATUS_ACTION_INITIAL_STATE,
  type AdminQuoteRequestStatus,
} from "@/types/admin-quote-request";
import { STATUS_LABELS } from "./QuoteStatusBadge";

/**
 * Plain <select> + submit button, not individual "Mark as X" buttons --
 * three status values is few enough that either shape works, but a
 * select scales better if a future status is ever added, and it makes
 * "which statuses exist" self-documenting from the markup alone. Every
 * value is always selectable regardless of the current one (including
 * the current value itself, effectively a no-op save) -- see
 * updateQuoteRequestStatus's own comment for why no transition is
 * restricted.
 */
export default function QuoteStatusControl({
  id,
  currentStatus,
}: {
  id: string;
  currentStatus: AdminQuoteRequestStatus;
}) {
  const action = updateQuoteRequestStatusAction.bind(null, id);
  const [state, formAction, isPending] = useActionState(
    action,
    QUOTE_REQUEST_STATUS_ACTION_INITIAL_STATE
  );

  return (
    <div>
      <form action={formAction} className="flex flex-wrap items-center gap-3">
        <select
          name="status"
          defaultValue={currentStatus}
          disabled={isPending}
          className="rounded-btn border border-brand-border bg-brand-white px-3 py-2 text-sm text-brand-black disabled:opacity-60"
        >
          {QUOTE_REQUEST_STATUSES.map((value) => (
            <option key={value} value={value}>
              {STATUS_LABELS[value]}
            </option>
          ))}
        </select>
        <button
          type="submit"
          disabled={isPending}
          className="rounded-btn border border-brand-black bg-brand-black px-4 py-2 text-sm font-medium text-brand-white transition-colors hover:bg-brand-white hover:text-brand-black disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending ? "Saving…" : "Update Status"}
        </button>
      </form>
      {state.status === "error" ? (
        <p className="mt-2 text-sm text-red-600">{state.message}</p>
      ) : null}
    </div>
  );
}
