"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import {
  createProductAction,
  updateProductAction,
} from "@/app/admin/(dashboard)/products/actions";
import { slugify } from "@/lib/slugify";
import FormField from "./FormField";
import TextareaField from "./TextareaField";
import {
  PRODUCT_ACTION_INITIAL_STATE,
  type AdminProductRow,
  type CategoryOption,
} from "@/types/admin-product";

const GENDER_OPTIONS: { value: string; label: string }[] = [
  { value: "not_applicable", label: "Not Applicable" },
  { value: "men", label: "Men" },
  { value: "women", label: "Women" },
  { value: "unisex", label: "Unisex" },
];

/**
 * Same slug auto-generation UX as CategoryForm/CollectionForm (Prompts
 * 23/26) -- see CategoryForm.tsx's own comment for the full
 * create-vs-edit reasoning, not repeated here.
 *
 * Gender is always a plain <select>, never conditionally shown/hidden
 * based on the chosen category -- deliberate choice. The DB has no
 * constraint tying gender to category_id (any of the 4 enum values is
 * valid regardless of category), and category-gender relevance is a
 * PUBLIC-site *display* concern already handled where it belongs: Prompt
 * 11's category page only shows the gender *filter* UI for Perfumes
 * (`showGenderFilter = category.slug === "perfumes"`). Conditionally
 * hiding this field here would need live JS reacting to the category
 * select's value for zero enforced correctness benefit -- nothing wrong
 * happens if a Home Fragrance product has gender set, it just isn't
 * surfaced as a public filter, exactly as already designed.
 */
export default function ProductForm({
  mode,
  product,
  categories,
}: {
  mode: "create" | "edit";
  product?: AdminProductRow;
  categories: CategoryOption[];
}) {
  const action =
    mode === "create"
      ? createProductAction
      : updateProductAction.bind(null, product!.id);

  const [state, formAction, isPending] = useActionState(
    action,
    PRODUCT_ACTION_INITIAL_STATE
  );

  const [slug, setSlug] = useState(product?.slug ?? "");
  const [slugFollowsName, setSlugFollowsName] = useState(mode === "create");

  const fieldErrors = state.status === "error" ? state.fieldErrors : undefined;

  return (
    <form action={formAction} className="max-w-3xl space-y-8">
      {state.status === "error" ? (
        <div
          role="alert"
          className="rounded-btn border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {state.message}
        </div>
      ) : null}

      <section className="space-y-5">
        <h2 className="text-sm font-semibold tracking-wide text-brand-black uppercase">
          Basic Info
        </h2>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <FormField
            label="Name (English) *"
            name="name_en"
            defaultValue={product?.name_en}
            error={fieldErrors?.name_en}
            onChange={(e) => {
              if (slugFollowsName) setSlug(slugify(e.target.value));
            }}
          />
          <FormField
            label="Name (Arabic) *"
            name="name_ar"
            defaultValue={product?.name_ar}
            error={fieldErrors?.name_ar}
            dir="rtl"
          />
        </div>

        <FormField
          label="Slug *"
          name="slug"
          value={slug}
          onChange={(e) => {
            setSlug(e.target.value);
            setSlugFollowsName(false);
          }}
          error={fieldErrors?.slug}
          hint="Used in the public URL, e.g. /products/rose-oud. Lowercase letters, numbers, and hyphens only."
        />

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div>
            <label
              htmlFor="category_id"
              className="mb-1.5 block text-sm font-medium text-brand-black"
            >
              Category *
            </label>
            <select
              id="category_id"
              name="category_id"
              defaultValue={product?.category_id ?? ""}
              aria-invalid={Boolean(fieldErrors?.category_id)}
              className={
                "w-full rounded-btn border bg-brand-white px-3 py-2.5 text-sm text-brand-black " +
                (fieldErrors?.category_id
                  ? "border-red-400"
                  : "border-brand-border")
              }
            >
              <option value="" disabled>
                Select a category…
              </option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name_en}
                  {category.is_active ? "" : " (inactive)"}
                </option>
              ))}
            </select>
            {fieldErrors?.category_id ? (
              <p className="mt-1 text-xs text-red-600">
                {fieldErrors.category_id}
              </p>
            ) : null}
          </div>

          <div>
            <label
              htmlFor="gender"
              className="mb-1.5 block text-sm font-medium text-brand-black"
            >
              Gender
            </label>
            <select
              id="gender"
              name="gender"
              defaultValue={product?.gender ?? "not_applicable"}
              aria-invalid={Boolean(fieldErrors?.gender)}
              className={
                "w-full rounded-btn border bg-brand-white px-3 py-2.5 text-sm text-brand-black " +
                (fieldErrors?.gender ? "border-red-400" : "border-brand-border")
              }
            >
              {GENDER_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            {fieldErrors?.gender ? (
              <p className="mt-1 text-xs text-red-600">{fieldErrors.gender}</p>
            ) : null}
          </div>
        </div>
      </section>

      <section className="space-y-5">
        <h2 className="text-sm font-semibold tracking-wide text-brand-black uppercase">
          Description
        </h2>

        <TextareaField
          label="Description (English) *"
          name="description_en"
          rows={4}
          defaultValue={product?.description_en ?? ""}
          error={fieldErrors?.description_en}
        />
        <TextareaField
          label="Description (Arabic) *"
          name="description_ar"
          rows={4}
          dir="rtl"
          defaultValue={product?.description_ar ?? ""}
          error={fieldErrors?.description_ar}
        />
      </section>

      <section className="space-y-5">
        <h2 className="text-sm font-semibold tracking-wide text-brand-black uppercase">
          Fragrance Notes
        </h2>
        <p className="text-xs text-brand-gray">
          All optional — not every category has fragrance notes (e.g. Home
          Fragrance).
        </p>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <TextareaField
            label="Top Notes (English)"
            name="fragrance_top_notes_en"
            rows={2}
            defaultValue={product?.fragrance_top_notes_en ?? ""}
          />
          <TextareaField
            label="Top Notes (Arabic)"
            name="fragrance_top_notes_ar"
            rows={2}
            dir="rtl"
            defaultValue={product?.fragrance_top_notes_ar ?? ""}
          />
          <TextareaField
            label="Middle Notes (English)"
            name="fragrance_middle_notes_en"
            rows={2}
            defaultValue={product?.fragrance_middle_notes_en ?? ""}
          />
          <TextareaField
            label="Middle Notes (Arabic)"
            name="fragrance_middle_notes_ar"
            rows={2}
            dir="rtl"
            defaultValue={product?.fragrance_middle_notes_ar ?? ""}
          />
          <TextareaField
            label="Base Notes (English)"
            name="fragrance_base_notes_en"
            rows={2}
            defaultValue={product?.fragrance_base_notes_en ?? ""}
          />
          <TextareaField
            label="Base Notes (Arabic)"
            name="fragrance_base_notes_ar"
            rows={2}
            dir="rtl"
            defaultValue={product?.fragrance_base_notes_ar ?? ""}
          />
        </div>
      </section>

      <section className="space-y-5">
        <h2 className="text-sm font-semibold tracking-wide text-brand-black uppercase">
          Settings
        </h2>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <FormField
            label="MOQ (Minimum Order Quantity) *"
            name="moq"
            type="number"
            min={1}
            defaultValue={product?.moq ?? 1}
            error={fieldErrors?.moq}
          />
          <FormField
            label="Sort Order"
            name="sort_order"
            type="number"
            defaultValue={product?.sort_order ?? 0}
            error={fieldErrors?.sort_order}
            hint="Lower numbers appear first."
          />
        </div>

        {/* Empty by default (uncontrolled, defaultValue only) -- an empty
            field IS the meaningful "unlimited" value (Prompt 28), not a
            placeholder waiting to be filled in like moq/sort_order above. */}
        <FormField
          label="Stock Quantity"
          name="stock_quantity"
          type="number"
          min={0}
          step={1}
          defaultValue={product?.stock_quantity ?? ""}
          error={fieldErrors?.stock_quantity}
          hint="Leave empty for unlimited. If a size below (Sizes section) has its own number, it governs that size alone; sizes with no number of their own share this pool. The public site only ever shows Available / Sold Out, never the exact number."
        />

        <div className="flex flex-wrap gap-6">
          <label className="flex items-center gap-2 text-sm text-brand-black">
            <input
              type="checkbox"
              name="is_active"
              defaultChecked={product?.is_active ?? true}
              className="h-4 w-4 rounded border-brand-border"
            />
            Active (visible on the public site)
          </label>
          <label className="flex items-center gap-2 text-sm text-brand-black">
            <input
              type="checkbox"
              name="is_featured"
              defaultChecked={product?.is_featured ?? false}
              className="h-4 w-4 rounded border-brand-border"
            />
            Featured
          </label>
        </div>
      </section>

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-btn border border-brand-black bg-brand-black px-6 py-2.5 text-sm font-medium text-brand-white transition-colors hover:bg-brand-white hover:text-brand-black disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending ? "Saving…" : mode === "create" ? "Create Product" : "Save Changes"}
        </button>
        <Link
          href="/admin/products"
          className="rounded-btn border border-brand-border px-6 py-2.5 text-sm font-medium text-brand-black transition-colors hover:border-brand-black"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
