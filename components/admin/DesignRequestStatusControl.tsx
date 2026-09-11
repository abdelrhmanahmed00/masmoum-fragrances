"use client";

import { useActionState } from "react";
import { updateDesignRequestStatusAction } from "@/app/admin/(dashboard)/design-requests/actions";
import {
  DESIGN_REQUEST_STATUSES,
  DESIGN_REQUEST_STATUS_ACTION_INITIAL_STATE,
  type AdminDesignRequestStatus,
} from "@/types/admin-design-request";
import { STATUS_LABELS } from "./DesignRequestStatusBadge";

/**
 * Byte-for-byte the same plain <select> + submit button shape as
 * QuoteStatusControl.tsx -- see that file's own comment for the full
 * reasoning. Every value always selectable regardless of the current
 * one, same "no transition restricted" convention.
 */
export default function DesignRequestStatusControl({
  id,
  currentStatus,
}: {
  id: string;
  currentStatus: AdminDesignRequestStatus;
}) {
  const action = updateDesignRequestStatusAction.bind(null, id);
  const [state, formAction, isPending] = useActionState(
    action,
    DESIGN_REQUEST_STATUS_ACTION_INITIAL_STATE
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
          {DESIGN_REQUEST_STATUSES.map((value) => (
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
