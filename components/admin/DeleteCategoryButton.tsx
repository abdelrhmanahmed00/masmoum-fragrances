"use client";

import { useActionState } from "react";
import { deleteCategoryAction } from "@/app/admin/(dashboard)/categories/actions";
import { CATEGORY_ACTION_INITIAL_STATE } from "@/types/admin-category";

export default function DeleteCategoryButton({
  id,
  name,
}: {
  id: string;
  name: string;
}) {
  const action = deleteCategoryAction.bind(null, id);
  const [state, formAction, isPending] = useActionState(
    action,
    CATEGORY_ACTION_INITIAL_STATE
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
