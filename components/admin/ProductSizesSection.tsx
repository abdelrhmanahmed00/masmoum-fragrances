"use client";

import { useActionState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createProductSizeAction } from "@/app/admin/(dashboard)/products/[id]/edit/actions";
import {
  PRODUCT_SIZE_ACTION_INITIAL_STATE,
  type AdminProductSizeRow,
} from "@/types/admin-product";
import ProductSizeRow from "./ProductSizeRow";

/**
 * Sizes management, nested inside the product edit page (Prompt 32) --
 * deliberately NOT a separate top-level admin section or a standalone
 * "all sizes" list: sizes only ever make sense in the context of the one
 * product they belong to, the same way this prompt's own task framed it.
 * Also deliberately NOT on the "new product" creation form -- a size
 * needs a real product_id to attach to. createProductAction now redirects
 * straight to the new product's own edit page on success (fixed in Prompt
 * 32 -- it used to go to the list), so sizes can be added immediately
 * after creating a product without an extra detour. Images (Prompt 34)
 * will need this same sequencing, since product_images.product_id has the
 * same "must already exist" shape.
 *
 * Rows/add-form use plain div/grid layout, not a <table> -- this is a
 * small nested list (realistically 2-5 sizes per product), and a table
 * would need the HTML `form="id"` cross-cell-reference trick to keep each
 * row's inputs inside one <form> while still living in separate <td>s;
 * a grid row lets the whole row be one plain <form> with no such
 * indirection, simpler for what's genuinely a small nested resource, not
 * a full list page (contrast products/page.tsx's real <table>, which
 * suits a much longer, standalone list).
 */
export default function ProductSizesSection({
  productId,
  sizes,
  productStockQuantity,
}: {
  productId: string;
  sizes: AdminProductSizeRow[];
  /** Prompt 33 -- threaded straight through to each ProductSizeRow purely
   *  for its "shares the product's stock" hint text; see that
   *  component's own comment. */
  productStockQuantity: number | null;
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const addAction = createProductSizeAction.bind(null, productId);
  const [state, formAction, isPending] = useActionState(
    addAction,
    PRODUCT_SIZE_ACTION_INITIAL_STATE
  );

  useEffect(() => {
    if (state.status === "success") {
      formRef.current?.reset();
      router.refresh();
    }
  }, [state, router]);

  const fieldErrors = state.status === "error" ? state.fieldErrors : undefined;

  return (
    <section className="max-w-3xl space-y-5 border-t border-brand-border pt-8">
      <div>
        <h2 className="text-sm font-semibold tracking-wide text-brand-black uppercase">
          Sizes
        </h2>
        <p className="mt-1 text-xs text-brand-gray">
          Selectable size options for this product (e.g. 30ml, 50ml,
          100ml) — shown on the public product page&apos;s size selector.
        </p>
      </div>

      {sizes.length > 0 ? (
        <div className="rounded-card border border-brand-border bg-brand-white">
          <div className="grid grid-cols-[1fr_110px_160px_90px_auto] gap-3 border-b border-brand-border p-3 text-xs font-medium tracking-wide text-brand-gray uppercase">
            <span>Size Label</span>
            <span>Sort Order</span>
            <span>Stock Quantity</span>
            <span>Active</span>
            <span />
          </div>
          <div className="divide-y divide-brand-border">
            {sizes.map((size) => (
              <ProductSizeRow
                key={size.id}
                productId={productId}
                size={size}
                productStockQuantity={productStockQuantity}
              />
            ))}
          </div>
        </div>
      ) : (
        <p className="text-sm text-brand-gray">No sizes yet.</p>
      )}

      <form
        ref={formRef}
        action={formAction}
        className="grid grid-cols-[1fr_110px_160px_90px_auto] items-start gap-3 rounded-card border border-brand-border p-3"
      >
        {state.status === "error" ? (
          <p role="alert" className="col-span-5 text-sm text-red-700">
            {state.message}
          </p>
        ) : null}

        <div>
          <input
            name="size_label"
            placeholder="e.g. 30ml"
            aria-invalid={Boolean(fieldErrors?.size_label)}
            className={
              "w-full rounded-btn border bg-brand-white px-2.5 py-2 text-sm text-brand-black " +
              (fieldErrors?.size_label
                ? "border-red-400"
                : "border-brand-border")
            }
          />
          {fieldErrors?.size_label ? (
            <p className="mt-1 text-xs text-red-600">
              {fieldErrors.size_label}
            </p>
          ) : null}
        </div>

        <div>
          <input
            name="sort_order"
            type="number"
            defaultValue={0}
            aria-invalid={Boolean(fieldErrors?.sort_order)}
            className={
              "w-full rounded-btn border bg-brand-white px-2.5 py-2 text-sm text-brand-black " +
              (fieldErrors?.sort_order
                ? "border-red-400"
                : "border-brand-border")
            }
          />
          {fieldErrors?.sort_order ? (
            <p className="mt-1 text-xs text-red-600">
              {fieldErrors.sort_order}
            </p>
          ) : null}
        </div>

        <div>
          <input
            name="stock_quantity"
            type="number"
            min={0}
            step={1}
            placeholder="Unlimited"
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
          ) : (
            <p className="mt-1 text-xs text-brand-gray">
              {productStockQuantity !== null
                ? `Leave empty to share the product's stock (${productStockQuantity}).`
                : "Leave empty for unlimited."}
            </p>
          )}
        </div>

        <label className="flex items-center gap-2 pt-2 text-sm text-brand-black">
          <input
            type="checkbox"
            name="is_active"
            defaultChecked
            className="h-4 w-4 rounded border-brand-border"
          />
          Active
        </label>

        <div className="pt-1">
          <button
            type="submit"
            disabled={isPending}
            className="rounded-btn border border-brand-black bg-brand-black px-4 py-2 text-sm font-medium text-brand-white transition-colors hover:bg-brand-white hover:text-brand-black disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPending ? "Adding…" : "Add Size"}
          </button>
        </div>
      </form>
    </section>
  );
}
