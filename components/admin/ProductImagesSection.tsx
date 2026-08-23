"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { uploadProductImageAction } from "@/app/admin/(dashboard)/products/[id]/edit/actions";
import { compressImage } from "@/lib/image-compression";
import {
  PRODUCT_IMAGE_ACTION_INITIAL_STATE,
  type AdminProductImageRow,
} from "@/types/admin-product";
import ProductImageThumb from "./ProductImageThumb";

// Same 5MB limit as the "product-images" Storage bucket's real
// file_size_limit (0012 migration) and lib/admin/product-images.ts's own
// server-side re-check -- checked here too, client-side, purely so a
// buyer-obviously-too-large file gets an immediate inline message instead
// of waiting on a full upload attempt just to be rejected. This is UX
// only, not the real enforcement (the server-side check is, since this
// one is trivially bypassable) -- same "advisory, not authoritative"
// relationship as every other client-side check in this project (e.g.
// Prompt 29's stepper cap vs. Prompt 30's RPC).
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];

/**
 * Image management, nested inside the product edit page (Prompt 34) --
 * same pattern as ProductSizesSection.tsx (Prompt 32): not a top-level
 * admin section, not on the "new product" creation form (a product needs
 * to exist first; createProductAction already redirects straight to the
 * new product's edit page, see ProductSizesSection.tsx's own comment for
 * the full sequencing history).
 */
export default function ProductImagesSection({
  productId,
  images,
}: {
  productId: string;
  images: AdminProductImageRow[];
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [clientError, setClientError] = useState<string | null>(null);
  const [isCompressing, setIsCompressing] = useState(false);

  const uploadAction = uploadProductImageAction.bind(null, productId);
  const [state, formAction, isPending] = useActionState(
    uploadAction,
    PRODUCT_IMAGE_ACTION_INITIAL_STATE
  );

  useEffect(() => {
    if (state.status === "success") {
      formRef.current?.reset();
      router.refresh();
    }
  }, [state, router]);

  const serverError = state.status === "error" ? state.message : null;
  const fieldErrors = state.status === "error" ? state.fieldErrors : undefined;

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const input = e.target;
    const file = input.files?.[0];
    if (!file) {
      setClientError(null);
      return;
    }
    if (!ACCEPTED_TYPES.includes(file.type)) {
      setClientError("Only JPEG, PNG, or WEBP images are allowed.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    setClientError(null);

    // Compress client-side before the file ever reaches the Storage
    // upload call (Prompt 82) -- best-effort: compressImage() falls back
    // to returning `file` unchanged on any failure, so this never blocks
    // an otherwise-valid upload. The size check below runs AFTER this,
    // against the (possibly compressed) result -- not before it -- so a
    // genuinely oversized phone photo gets a real chance to be shrunk
    // under the limit instead of being rejected on its pre-compression
    // size. This is "validation as a backstop after compression," per
    // the task, not the other way around.
    setIsCompressing(true);
    let effectiveFile = file;
    try {
      effectiveFile = await compressImage(file);
    } finally {
      setIsCompressing(false);
    }

    if (effectiveFile.size > MAX_FILE_SIZE_BYTES) {
      setClientError(
        `"${file.name}" is still ${(effectiveFile.size / (1024 * 1024)).toFixed(1)}MB after compression -- the limit is 5MB.`
      );
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    if (effectiveFile !== file && fileInputRef.current) {
      const dt = new DataTransfer();
      dt.items.add(effectiveFile);
      fileInputRef.current.files = dt.files;
    }
  }

  return (
    <section className="max-w-3xl space-y-5 border-t border-brand-border pt-8">
      <div>
        <h2 className="text-sm font-semibold tracking-wide text-brand-black uppercase">
          Images
        </h2>
        <p className="mt-1 text-xs text-brand-gray">
          JPEG, PNG, or WEBP, up to 5MB. The primary image is what shows on
          product cards and listing pages; the gallery on the product page
          shows all of them in sort order.
        </p>
      </div>

      {images.length > 0 ? (
        <div className="flex flex-wrap gap-3">
          {images.map((image) => (
            <ProductImageThumb key={image.id} productId={productId} image={image} />
          ))}
        </div>
      ) : (
        <p className="text-sm text-brand-gray">No images yet.</p>
      )}

      <form
        ref={formRef}
        action={formAction}
        className="space-y-3 rounded-card border border-brand-border p-4"
      >
        {(clientError || serverError) ? (
          <p role="alert" className="text-sm text-red-700">
            {clientError ?? serverError}
          </p>
        ) : null}

        <div>
          <label
            htmlFor="file"
            className="mb-1.5 block text-sm font-medium text-brand-black"
          >
            Upload Image
          </label>
          <input
            ref={fileInputRef}
            id="file"
            name="file"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleFileChange}
            aria-invalid={Boolean(fieldErrors?.file)}
            className="block w-full text-sm text-brand-black file:me-3 file:rounded-btn file:border file:border-brand-border file:bg-brand-white file:px-3 file:py-1.5 file:text-sm file:text-brand-black hover:file:border-brand-black"
          />
          {fieldErrors?.file ? (
            <p className="mt-1 text-xs text-red-600">{fieldErrors.file}</p>
          ) : null}
          {isCompressing ? (
            <p className="mt-1 text-xs text-brand-gray">Compressing image…</p>
          ) : null}
        </div>

        <button
          type="submit"
          disabled={isPending || isCompressing || Boolean(clientError)}
          className="rounded-btn border border-brand-black bg-brand-black px-4 py-2 text-sm font-medium text-brand-white transition-colors hover:bg-brand-white hover:text-brand-black disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending ? "Uploading…" : isCompressing ? "Processing…" : "Upload"}
        </button>
      </form>
    </section>
  );
}
