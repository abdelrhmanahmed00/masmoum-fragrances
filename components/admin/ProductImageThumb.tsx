"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { getPublicStorageUrl } from "@/lib/supabase/storage";
import {
  updateProductImageSortOrderAction,
  setPrimaryProductImageAction,
  deleteProductImageAction,
} from "@/app/admin/(dashboard)/products/[id]/edit/actions";
import {
  PRODUCT_IMAGE_ACTION_INITIAL_STATE,
  type AdminProductImageRow,
} from "@/types/admin-product";

/**
 * One thumbnail -- own <form>/useActionState for the sort_order field
 * only (same split as ProductSizeRow.tsx: a dedicated form for the
 * editable field, plain onClick handlers for actions that don't need
 * field-level validation feedback of their own).
 */
export default function ProductImageThumb({
  productId,
  image,
}: {
  productId: string;
  image: AdminProductImageRow;
}) {
  const router = useRouter();
  const sortAction = updateProductImageSortOrderAction.bind(
    null,
    productId,
    image.id
  );
  const [state, formAction, isPending] = useActionState(
    sortAction,
    PRODUCT_IMAGE_ACTION_INITIAL_STATE
  );

  useEffect(() => {
    if (state.status === "success") {
      router.refresh();
    }
  }, [state, router]);

  const fieldErrors = state.status === "error" ? state.fieldErrors : undefined;

  async function handleSetPrimary() {
    const result = await setPrimaryProductImageAction(productId, image.id);
    if (result.status === "success") {
      router.refresh();
    } else if (result.status === "error") {
      window.alert(result.message);
    }
  }

  async function handleDelete() {
    const primaryNote = image.is_primary
      ? " This is currently the primary image -- another image will automatically become primary if one remains."
      : "";
    if (!window.confirm(`Delete this image? This cannot be undone.${primaryNote}`)) {
      return;
    }
    const result = await deleteProductImageAction(productId, image.id);
    if (result.status === "success") {
      router.refresh();
    } else if (result.status === "error") {
      window.alert(result.message);
    }
  }

  return (
    <div className="w-40 space-y-2 rounded-card border border-brand-border bg-brand-white p-2">
      <div className="relative aspect-square overflow-hidden rounded-btn bg-brand-surface">
        <Image
          src={getPublicStorageUrl("product-images", image.storage_path)}
          alt=""
          fill
          sizes="160px"
          className="object-cover"
        />
        {image.is_primary ? (
          <span className="absolute start-1.5 top-1.5 rounded-full bg-brand-black px-2 py-0.5 text-[10px] font-medium text-brand-white">
            Primary
          </span>
        ) : null}
      </div>

      <form action={formAction} className="flex items-center gap-1.5">
        <label htmlFor={`sort-${image.id}`} className="sr-only">
          Sort order
        </label>
        <input
          id={`sort-${image.id}`}
          name="sort_order"
          type="number"
          defaultValue={image.sort_order}
          aria-invalid={Boolean(fieldErrors?.sort_order)}
          className={
            "w-14 rounded-btn border bg-brand-white px-1.5 py-1 text-xs text-brand-black " +
            (fieldErrors?.sort_order ? "border-red-400" : "border-brand-border")
          }
        />
        <button
          type="submit"
          disabled={isPending}
          className="text-xs text-brand-black underline-offset-2 hover:underline disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending ? "Saving…" : "Save order"}
        </button>
      </form>
      {fieldErrors?.sort_order ? (
        <p className="text-xs text-red-600">{fieldErrors.sort_order}</p>
      ) : null}

      <div className="flex items-center justify-between gap-2">
        {!image.is_primary ? (
          <button
            type="button"
            onClick={handleSetPrimary}
            className="text-xs text-brand-black underline-offset-2 hover:underline"
          >
            Set primary
          </button>
        ) : (
          <span className="text-xs text-brand-gray">Primary</span>
        )}
        <button
          type="button"
          onClick={handleDelete}
          className="text-xs text-red-600 underline-offset-2 hover:underline"
        >
          Delete
        </button>
      </div>
    </div>
  );
}
