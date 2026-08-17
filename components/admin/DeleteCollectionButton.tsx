"use client";

import { useActionState } from "react";
import { deleteCollectionAction } from "@/app/admin/(dashboard)/collections/actions";
import { COLLECTION_ACTION_INITIAL_STATE } from "@/types/admin-collection";

// Mirrors DeleteCategoryButton.tsx (Prompt 23) exactly. Unlike category
// deletion, there's no "blocked" error state to realistically expect here
// (deleteCollection never blocks -- see lib/admin/collections.ts), but the
// error branch is kept for the same defensive reason categories' has it:
// a genuine DB/network failure should still surface a message, not fail
// silently.
export default function DeleteCollectionButton({
  id,
  name,
}: {
  id: string;
  name: string;
}) {
  const action = deleteCollectionAction.bind(null, id);
  const [state, formAction, isPending] = useActionState(
    action,
    COLLECTION_ACTION_INITIAL_STATE
  );

  return (
    <div>
      <form
        action={formAction}
        onSubmit={(e) => {
          if (!window.confirm(`Delete "${name}"? This cannot be undone.`)) {
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
