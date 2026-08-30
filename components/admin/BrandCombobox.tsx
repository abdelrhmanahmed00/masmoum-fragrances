"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { findOrCreateBrandAction } from "@/app/admin/(dashboard)/brands/actions";
import type { BrandOption } from "@/types/admin-product";

/**
 * Prompt 105 -- replaces the plain <select name="brand_id"> in
 * ProductForm.tsx. Type-to-filter combobox over the product form's own
 * already-fetched `brands` prop (both create/edit page.tsx call sites
 * already call getBrandOptions() to build the old <select>'s options --
 * no new data-fetching plumbing needed, just a new consumer of the same
 * data), plus a "Create '<typed text>'" option that calls
 * findOrCreateBrandAction immediately (see that action's own comment for
 * why immediate, not deferred to product-form submit).
 *
 * RESEARCH -- pre-fetched + client-side filter, NOT a live per-keystroke
 * query (HeaderSearch.tsx's own Prompt 62 pattern, re-read before
 * building this): that component's whole design exists for a PUBLIC,
 * unbounded-growth, potentially-large product catalog at 10k-visitors/
 * day, where debounce/abort/limit all protect a real read-quota cost
 * multiplied across many concurrent visitors. None of that applies here
 * -- brands is a small, admin-curated taxonomy list (a page or two of
 * rows at most, same order of magnitude as categories/collections,
 * confirmed via the real getBrandOptions() query having no pagination/
 * limit at all, unlike HeaderSearch's own RESULT_LIMIT), read by a
 * single authenticated admin (Prompt 21's single-admin model), not the
 * public. Pre-fetching the whole list once and filtering in memory as
 * they type is simpler, has zero network latency per keystroke, and
 * costs nothing extra against Supabase's quota beyond the ONE query this
 * page already made for the old <select>'s options.
 *
 * No new dependency (same discipline as Prompts 82/102): this is a
 * plain controlled input + a positioned listbox, not complex enough to
 * justify a combobox library.
 */
export default function BrandCombobox({
  brands,
  defaultBrandId,
}: {
  brands: BrandOption[];
  defaultBrandId: string | null;
}) {
  const defaultBrand = useMemo(
    () => brands.find((b) => b.id === defaultBrandId) ?? null,
    [brands, defaultBrandId]
  );

  const [inputValue, setInputValue] = useState(defaultBrand?.name_en ?? "");
  const [selectedBrandId, setSelectedBrandId] = useState<string | null>(
    defaultBrandId
  );
  const [isOpen, setIsOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    function handlePointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setIsOpen(false);
    }
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const trimmed = inputValue.trim();
  const trimmedLower = trimmed.toLowerCase();

  const filtered = trimmed
    ? brands.filter((b) => b.name_en.toLowerCase().includes(trimmedLower))
    : brands;

  const exactMatch = trimmed
    ? brands.find((b) => b.name_en.trim().toLowerCase() === trimmedLower)
    : null;

  const showCreateOption = trimmed.length > 0 && !exactMatch;

  function selectBrand(brand: BrandOption) {
    setSelectedBrandId(brand.id);
    setInputValue(brand.name_en);
    setError(null);
    setIsOpen(false);
  }

  function clearSelection() {
    setSelectedBrandId(null);
    setInputValue("");
    setError(null);
  }

  async function handleCreate() {
    if (!trimmed || isCreating) return;
    setIsCreating(true);
    setError(null);

    const formData = new FormData();
    formData.set("name_en", trimmed);
    formData.set("name_ar", trimmed);
    formData.set("slug", trimmed);
    formData.set("is_active", "on");

    const result = await findOrCreateBrandAction(formData);
    setIsCreating(false);

    if (result.status === "success") {
      // Echo the SERVER's own canonical name back (matters for the
      // fallback-to-existing-row case, e.g. typed "chanel" but the row
      // that won a concurrent create race is "Chanel" -- showing the
      // real stored value is more honest than keeping the admin's own
      // typed casing).
      setSelectedBrandId(result.brand.id);
      setInputValue(result.brand.name_en);
      setIsOpen(false);
    } else {
      setError(result.message);
    }
  }

  return (
    <div className="relative" ref={containerRef}>
      <input type="hidden" name="brand_id" value={selectedBrandId ?? ""} />

      <div className="relative">
        <input
          type="text"
          role="combobox"
          aria-expanded={isOpen}
          aria-controls="brand-combobox-listbox"
          aria-autocomplete="list"
          value={inputValue}
          onChange={(event) => {
            setInputValue(event.target.value);
            setSelectedBrandId(null);
            setError(null);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder="Type to search or create a brand…"
          className={
            "w-full rounded-btn border bg-brand-white py-2.5 pe-8 ps-3 text-sm text-brand-black " +
            (error ? "border-red-400" : "border-brand-border")
          }
        />
        {inputValue ? (
          <button
            type="button"
            onClick={clearSelection}
            aria-label="Clear brand"
            className="absolute end-2 top-1/2 -translate-y-1/2 text-brand-gray hover:text-brand-black"
          >
            ×
          </button>
        ) : null}
      </div>

      {isOpen ? (
        <ul
          id="brand-combobox-listbox"
          role="listbox"
          className="absolute z-10 mt-1 max-h-56 w-full overflow-y-auto rounded-btn border border-brand-border bg-brand-white py-1 shadow-lg"
        >
          {filtered.length === 0 && !showCreateOption ? (
            <li className="px-3 py-2 text-sm text-brand-gray">
              No brands found.
            </li>
          ) : null}

          {filtered.map((brand) => (
            <li key={brand.id}>
              <button
                type="button"
                role="option"
                aria-selected={brand.id === selectedBrandId}
                onClick={() => selectBrand(brand)}
                className={
                  "block w-full px-3 py-2 text-start text-sm hover:bg-brand-surface " +
                  (brand.id === selectedBrandId
                    ? "font-medium text-brand-black"
                    : "text-brand-black")
                }
              >
                {brand.name_en}
                {brand.is_active ? "" : " (inactive)"}
              </button>
            </li>
          ))}

          {showCreateOption ? (
            <li>
              <button
                type="button"
                onClick={handleCreate}
                disabled={isCreating}
                className="block w-full border-t border-brand-border px-3 py-2 text-start text-sm font-medium text-brand-black hover:bg-brand-surface disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isCreating ? "Creating…" : `+ Create "${trimmed}"`}
              </button>
            </li>
          ) : null}
        </ul>
      ) : null}

      {error ? <p className="mt-1 text-xs text-red-600">{error}</p> : null}
    </div>
  );
}
