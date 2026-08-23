"use client";

import { useActionState } from "react";
import { deletePageAction } from "@/app/admin/(dashboard)/pages/actions";
import { PAGE_ACTION_INITIAL_STATE } from "@/types/admin-page";

// Mirrors DeleteCategoryButton.tsx exactly -- see that file for the
// pattern's own comment. No dependent-row confirm text needed here
// (contrast DeleteCategoryButton's "N products still use it" message):
// nothing references pages.id, so a delete either succeeds or fails on a
// generic error, never a "still in use" case.
export default function DeletePageButton({
  id,
  title,
}: {
  id: string;
  title: string;
}) {
  const action = deletePageAction.bind(null, id);
  const [state, formAction, isPending] = useActionState(
    action,
    PAGE_ACTION_INITIAL_STATE
  );

  return (
    <div>
      <form
        action={formAction}
        onSubmit={(e) => {
          if (!window.confirm(`Delete "${title}"? This cannot be undone.`)) {
            e.preventDefault();
          }
        }}
      >
        <button
          type="submit"
          disabled={isPending}
          className="text-red-600 underline-offset-2 hover:underline disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending ? "Deleting…" : "Delete"}
        </button>
      </form>
      {state.status === "error" ? (
        <p className="mt-1 max-w-[220px] text-xs text-red-600">
          {state.message}
        </p>
      ) : null}
    </div>
  );
}
