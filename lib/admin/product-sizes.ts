import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { trimmedOrNull } from "@/lib/form-utils";
import { UNIQUE_VIOLATION, FK_VIOLATION } from "@/lib/admin/shared";
import type {
  AdminProductSizeRow,
  ProductSizeActionState,
  ProductSizeFieldErrors,
} from "@/types/admin-product";

// Same plain-function-taking-a-client split as lib/admin/products.ts /
// categories.ts / collections.ts -- see products.ts's own comment for the
// full reasoning, not repeated here. Every function here additionally
// takes productId explicitly and scopes every query to it (`.eq("product_id",
// productId)` on update/delete) -- defense in depth so this product's
// edit page can never read/touch a size belonging to a different product
// by a mismatched/guessed id, even though the real call sites (this
// product's own edit page) would never construct one.

type ProductSizeInput = {
  size_label: string;
  sort_order: number;
  is_active: boolean;
  /** Prompt 33 -- null = no override (falls back to the product-level
   *  pool, or unlimited -- see lib/stock.ts). Same "empty field IS the
   *  meaningful unlimited/no-override value" reasoning as
   *  lib/admin/products.ts's own stock_quantity field, not a
   *  not-yet-filled-in placeholder. */
  stock_quantity: number | null;
};

function validate(formData: FormData): {
  fieldErrors: ProductSizeFieldErrors;
  values: ProductSizeInput | null;
} {
  const size_label = trimmedOrNull(formData.get("size_label"));
  const sortOrderRaw = formData.get("sort_order");
  const is_active = formData.get("is_active") === "on";

  const fieldErrors: ProductSizeFieldErrors = {};
  if (!size_label) fieldErrors.size_label = "Size label is required.";

  let sort_order = 0;
  if (typeof sortOrderRaw === "string" && sortOrderRaw.trim() !== "") {
    const parsed = Number(sortOrderRaw);
    if (!Number.isInteger(parsed)) {
      fieldErrors.sort_order = "Sort order must be a whole number.";
    } else {
      sort_order = parsed;
    }
  }

  // Same validation shape as lib/admin/products.ts's own stock_quantity
  // field -- only checked when the admin actually typed something, empty
  // stays null.
  let stock_quantity: number | null = null;
  const stockQuantityRaw = formData.get("stock_quantity");
  if (typeof stockQuantityRaw === "string" && stockQuantityRaw.trim() !== "") {
    const parsed = Number(stockQuantityRaw);
    if (!Number.isInteger(parsed) || parsed < 0) {
      fieldErrors.stock_quantity =
        "Stock quantity must be a non-negative whole number, or left empty.";
    } else {
      stock_quantity = parsed;
    }
  }

  if (!size_label || Object.keys(fieldErrors).length > 0) {
    return { fieldErrors, values: null };
  }

  return {
    fieldErrors,
    values: { size_label, sort_order, is_active, stock_quantity },
  };
}

/**
 * All sizes for one product, admin view -- active AND inactive (same
 * "admin sees everything" reasoning as getCategoryOptions in
 * lib/admin/products.ts), plus each size's historical quote-item count.
 *
 * The count is computed with one extra query per size (N+1, not a single
 * grouped query) -- supabase-js has no plain group-by-count helper without
 * reaching for an RPC, and this is an admin-only page for one product's
 * handful of sizes (realistically 2-5), not a public, performance-budgeted
 * read (contrast lib/catalog.ts's ISR-cached queries) -- not worth the
 * extra machinery.
 */
export async function getProductSizes(
  supabase: SupabaseClient,
  productId: string
): Promise<AdminProductSizeRow[]> {
  const { data, error } = await supabase
    .from("product_sizes")
    .select("id, product_id, size_label, sort_order, is_active, stock_quantity")
    .eq("product_id", productId)
    .order("sort_order", { ascending: true });

  if (error || !data) return [];

  return Promise.all(
    data.map(async (size) => {
      const { count } = await supabase
        .from("quote_request_items")
        .select("id", { count: "exact", head: true })
        .eq("product_size_id", size.id);
      return { ...size, historicalQuoteCount: count ?? 0 };
    })
  );
}

export async function createProductSize(
  supabase: SupabaseClient,
  productId: string,
  formData: FormData
): Promise<ProductSizeActionState> {
  const { fieldErrors, values } = validate(formData);
  if (!values) {
    return {
      status: "error",
      message: "Please fix the highlighted fields.",
      fieldErrors,
    };
  }

  const { error } = await supabase
    .from("product_sizes")
    .insert({ ...values, product_id: productId });

  if (error) {
    // unique (product_id, size_label) -- 0005 migration.
    if (error.code === UNIQUE_VIOLATION) {
      return {
        status: "error",
        message: "This product already has a size with that label.",
        fieldErrors: { size_label: "Already exists for this product." },
      };
    }
    if (error.code === FK_VIOLATION) {
      return {
        status: "error",
        message: "This product no longer exists.",
      };
    }
    return {
      status: "error",
      message: "Something went wrong adding the size. Please try again.",
    };
  }

  return { status: "success" };
}

export async function updateProductSize(
  supabase: SupabaseClient,
  productId: string,
  sizeId: string,
  formData: FormData
): Promise<ProductSizeActionState> {
  const { fieldErrors, values } = validate(formData);
  if (!values) {
    return {
      status: "error",
      message: "Please fix the highlighted fields.",
      fieldErrors,
    };
  }

  const { error } = await supabase
    .from("product_sizes")
    .update(values)
    .eq("id", sizeId)
    .eq("product_id", productId);

  if (error) {
    if (error.code === UNIQUE_VIOLATION) {
      return {
        status: "error",
        message: "This product already has a size with that label.",
        fieldErrors: { size_label: "Already exists for this product." },
      };
    }
    return {
      status: "error",
      message: "Something went wrong saving the size. Please try again.",
    };
  }

  return { status: "success" };
}

/**
 * Delete behavior -- confirmed from the real migration file (0009), NOT
 * assumed to match products.ts's own deleteProduct pattern:
 *
 *   quote_request_items.product_size_id -> ON DELETE SET NULL (0009)
 *
 * This is deliberately different from quote_request_items.product_id's
 * ON DELETE RESTRICT (see products.ts's deleteProduct for that one). A
 * size is a sub-detail of a product, not the thing itself -- the schema
 * lets a size be deleted even after it appears in real historical quote
 * data; the affected quote_request_items row(s) simply have
 * product_size_id set to null (product_id, quantity, and everything else
 * about the historical record is untouched), rather than blocking the
 * delete outright the way deleting the PRODUCT itself does.
 *
 * So unlike deleteProduct, there is deliberately NO pre-check/blocking
 * here -- adding one would be actively wrong (preventing something the
 * schema explicitly allows), not just unnecessary. getProductSizes'
 * historicalQuoteCount still surfaces this in the UI (ProductSizeRow.tsx)
 * so the admin knows what they're doing before confirming, but it's
 * informational, not a gate. Verified for real in the Prompt 32 report:
 * deleting a size WITH quote history succeeds, and the historical row's
 * product_size_id becomes null while product_id/quantity survive.
 */
export async function deleteProductSize(
  supabase: SupabaseClient,
  productId: string,
  sizeId: string
): Promise<ProductSizeActionState> {
  const { error } = await supabase
    .from("product_sizes")
    .delete()
    .eq("id", sizeId)
    .eq("product_id", productId);

  if (error) {
    return {
      status: "error",
      message: "Something went wrong deleting the size. Please try again.",
    };
  }

  return { status: "success" };
}
