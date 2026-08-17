"use client";

import { useActionState } from "react";
import { deleteProductAction } from "@/app/admin/(dashboard)/products/actions";
import { PRODUCT_ACTION_INITIAL_STATE } from "@/types/admin-product";

// Mirrors DeleteCategoryButton.tsx (Prompt 23). Unlike collections
// (never blocked) and more like categories (can be blocked), this one
// realistically CAN return a blocking error -- see lib/admin/products.ts's
// deleteProduct: a product referenced by any historical quote_request_items
// row can never be hard-deleted (ON DELETE RESTRICT, confirmed from the
// 0009 migration), so the error branch below is expected to actually
// trigger in real use, not just a defensive fallback.
export default function DeleteProductButton({
  id,
  name,
}: {
  id: string;
  name: string;
}) {
  const action = deleteProductAction.bind(null, id);
  const [state, formAction, isPending] = useActionState(
    action,
    PRODUCT_ACTION_INITIAL_STATE
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
        <p className="mt-1 max-w-[240px] text-xs text-red-600">
          {state.message}
        </p>
      ) : null}
    </div>
  );
}
