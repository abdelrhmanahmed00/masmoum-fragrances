"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  updateProductSizeAction,
  deleteProductSizeAction,
} from "@/app/admin/(dashboard)/products/[id]/edit/actions";
import {
  PRODUCT_SIZE_ACTION_INITIAL_STATE,
  type AdminProductSizeRow,
} from "@/types/admin-product";

/**
 * One inline-editable size row -- its own <form>/useActionState (separate
 * from the "Add Size" form in ProductSizesSection.tsx and from every
 * other row), so editing/saving one size never touches the others' state
 * or resets an in-progress edit elsewhere in the list.
 *
 * Delete is a plain onClick calling the Server Action directly (not a
 * <form action={...}> like DeleteProductButton.tsx's top-level-page
 * pattern) -- there's no useActionState-driven pending/error UI needed
 * per row beyond a simple confirm+alert, and this keeps the row's only
 * <form> dedicated to the save action, avoiding two overlapping forms in
 * one row.
 */
export default function ProductSizeRow({
  productId,
  size,
  productStockQuantity,
}: {
  productId: string;
  size: AdminProductSizeRow;
  /** Prompt 33 -- the PRODUCT's own current stock_quantity, passed down
   *  purely so this row can show an accurate hint when this size has no
   *  override of its own (see the stock_quantity field's hint text
   *  below). Not used for anything else here. */
  productStockQuantity: number | null;
}) {
  const router = useRouter();
  const updateAction = updateProductSizeAction.bind(null, productId, size.id);
  const [state, formAction, isPending] = useActionState(
    updateAction,
    PRODUCT_SIZE_ACTION_INITIAL_STATE
  );

  useEffect(() => {
    if (state.status === "success") {
      router.refresh();
    }
  }, [state, router]);

  const fieldErrors = state.status === "error" ? state.fieldErrors : undefined;

  async function handleDelete() {
    // Informational only -- doesn't gate anything, see
    // lib/admin/product-sizes.ts's deleteProductSize for why this size
    // CAN be deleted even with quote history (ON DELETE SET NULL).
    const historicalNote =
      size.historicalQuoteCount > 0
        ? ` It has been requested in ${size.historicalQuoteCount} past quote${
            size.historicalQuoteCount === 1 ? "" : "s"
          } -- those records will keep their quantity but lose the specific size reference.`
        : "";
    if (
      !window.confirm(
        `Delete "${size.size_label}"? This cannot be undone.${historicalNote}`
      )
    ) {
      return;
    }
    const result = await deleteProductSizeAction(productId, size.id);
    if (result.status === "success") {
      router.refresh();
    } else if (result.status === "error") {
      window.alert(result.message);
    }
  }

  // Prompt 33: informational only, shown next to the stock_quantity field
  // below -- explains what an EMPTY value on this specific row actually
  // means right now, since it's no longer simply "unlimited" the way the
  // product-level field alone used to be. Worth the small amount of UI
  // polish here specifically because "empty" is now ambiguous between two
  // real, different outcomes (shares a real, finite product-level number
  // vs. genuinely unlimited) and the admin has no other way to tell them
  // apart without this -- everywhere else in this admin (e.g. a plain
  // empty field with only "leave empty for unlimited") there's only ever
  // one meaning for empty, so no equivalent hint was needed there.
  const sizeHasOwnStock = size.stock_quantity !== null;
  const sharedStockHint = sizeHasOwnStock
    ? null
    : productStockQuantity !== null
      ? `Shares the product's stock (${productStockQuantity}).`
      : "Unlimited (no product-level limit set either).";

  return (
    <form
      action={formAction}
      className="grid grid-cols-[1fr_110px_160px_90px_auto] items-start gap-3 p-3"
    >
      <div>
        <input
          name="size_label"
          defaultValue={size.size_label}
          aria-invalid={Boolean(fieldErrors?.size_label)}
          className={
            "w-full rounded-btn border bg-brand-white px-2.5 py-2 text-sm text-brand-black " +
            (fieldErrors?.size_label
              ? "border-red-400"
              : "border-brand-border")
          }
        />
        {fieldErrors?.size_label ? (
          <p className="mt-1 text-xs text-red-600">{fieldErrors.size_label}</p>
        ) : null}
        {size.historicalQuoteCount > 0 ? (
          <p className="mt-1 text-xs text-brand-gray">
            Used in {size.historicalQuoteCount} past quote
            {size.historicalQuoteCount === 1 ? "" : "s"}
          </p>
        ) : null}
      </div>

      <div>
        <input
          name="sort_order"
          type="number"
          defaultValue={size.sort_order}
          aria-invalid={Boolean(fieldErrors?.sort_order)}
          className={
            "w-full rounded-btn border bg-brand-white px-2.5 py-2 text-sm text-brand-black " +
            (fieldErrors?.sort_order
              ? "border-red-400"
              : "border-brand-border")
          }
        />
        {fieldErrors?.sort_order ? (
          <p className="mt-1 text-xs text-red-600">{fieldErrors.sort_order}</p>
        ) : null}
      </div>

      <div>
        <input
          name="stock_quantity"
          type="number"
          min={0}
          step={1}
          placeholder="Unlimited"
          defaultValue={size.stock_quantity ?? ""}
          aria-invalid={Boolean(fieldErrors?.stock_quantity)}
          className={
            "w-full rounded-btn border bg-brand-white px-2.5 py-2 text-sm text-brand-black " +
            (fieldErrors?.stock_quantity
              ? "border-red-400"
              : "border-brand-border")
          }
        />
        {fieldErrors?.stock_quantity ? (
          <p className="mt-1 text-xs text-red-600">
            {fieldErrors.stock_quantity}
          </p>
        ) : sharedStockHint ? (
          <p className="mt-1 text-xs text-brand-gray">{sharedStockHint}</p>
        ) : null}
      </div>

      <label className="flex items-center gap-2 pt-2 text-sm text-brand-black">
        <input
          type="checkbox"
          name="is_active"
          defaultChecked={size.is_active}
          className="h-4 w-4 rounded border-brand-border"
        />
        Active
      </label>

      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={isPending}
          className="text-sm text-brand-black underline-offset-2 hover:underline disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending ? "Saving…" : "Save"}
        </button>
        <button
          type="button"
          onClick={handleDelete}
          className="text-sm text-red-600 underline-offset-2 hover:underline"
        >
          Delete
        </button>
      </div>
    </form>
  );
}
