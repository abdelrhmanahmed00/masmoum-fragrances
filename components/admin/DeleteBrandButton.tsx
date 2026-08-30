"use client";

import { useActionState } from "react";
import { deleteBrandAction } from "@/app/admin/(dashboard)/brands/actions";
import { BRAND_ACTION_INITIAL_STATE } from "@/types/admin-brand";

// Byte-for-byte the same shape as DeleteCategoryButton.tsx.
export default function DeleteBrandButton({
  id,
  name,
}: {
  id: string;
  name: string;
}) {
  const action = deleteBrandAction.bind(null, id);
  const [state, formAction, isPending] = useActionState(
    action,
    BRAND_ACTION_INITIAL_STATE
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
