"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { useRouter } from "@/i18n/navigation";
import { BOTTLE_COLOR_SLOTS, type BottleColorSlot } from "@/types/admin-bottle-colors";
import type { BottleColorImageMap } from "@/lib/bottle-colors";
import { removeBackground } from "@/lib/remove-background";
import { generateCompositeImage } from "@/lib/design-requests";
import {
  useDesignRequest,
  type DesignLogoEntry as LogoEntry,
  type SavedDesign,
} from "@/components/design-your-bottle/DesignRequestProvider";

// Prompt 132 (Phase 2) -- real swatch colors for the 5 buttons, standard
// Tailwind utility colors (not this project's own --color-brand-* tokens
// -- those are the site's black/gold/cream palette, unrelated to what
// these swatches need to actually communicate: "this button picks the
// yellow-capped bottle," a literal color match, not a brand accent).
const SWATCH_CLASSES: Record<BottleColorSlot, string> = {
  yellow: "bg-yellow-400",
  blue: "bg-blue-600",
  fuchsia: "bg-fuchsia-600",
  pink: "bg-pink-500",
  green: "bg-green-600",
};

type Position = { x: number; y: number }; // percentages, 0-100

const DEFAULT_POSITION: Position = { x: 50, y: 50 };

/**
 * RESEARCH (Prompt 132's own task item 2) -- drag-positioning an overlay
 * on an image, no new dependency: see this file's own long-standing
 * comment history (Prompts 132/140) for the full Pointer Events /
 * percentage-position reasoning, unchanged by this prompt.
 *
 * Prompt 143 (Phase D) -- `LogoEntry`/`SavedDesign` (the "cart" shape)
 * now live in DesignRequestProvider.tsx, imported here (LogoEntry
 * aliased locally, matching this file's own established name) rather
 * than declared in this file as before (Prompt 140/141) -- the
 * customer-info page (/design-your-bottle/request) needs the exact same
 * shape to read and submit `savedDesigns`, so the Provider is now the
 * single source of truth for it, not this component.
 */
export default function BottleDesigner({
  images,
}: {
  images: BottleColorImageMap;
}) {
  const t = useTranslations("BottleDesigner");
  const router = useRouter();
  const { savedDesigns, addSavedDesign, removeSavedDesign } = useDesignRequest();

  const firstWithImage = BOTTLE_COLOR_SLOTS.find((slot) => images[slot]);

  // selectedColor is nullable: the active canvas starts pre-selected on
  // first load (unchanged UX for a customer's very first design), but
  // "Add to Cart" resets it to null so a NEW design genuinely starts
  // blank (Phase B's own explicit spec), not silently pre-loaded with
  // whatever color the PREVIOUS design used.
  const [selectedColor, setSelectedColor] = useState<BottleColorSlot | null>(
    firstWithImage ?? BOTTLE_COLOR_SLOTS[0]
  );

  const [logos, setLogos] = useState<LogoEntry[]>([]);
  const [draggingLogoId, setDraggingLogoId] = useState<string | null>(null);

  // note is scoped to whichever design is CURRENTLY active (loaded fresh
  // from a saved design on Edit, captured into the snapshot on Save/Add
  // to Cart) rather than one permanent global field.
  const [note, setNote] = useState("");

  const [isSavingDesign, setIsSavingDesign] = useState(false);
  const [saveDesignError, setSaveDesignError] = useState<string | null>(null);
  // Prompt 143 -- brief pending state for "Send Request" specifically,
  // covering the moment it auto-saves the active canvas (if any) before
  // navigating -- distinct from isSavingDesign so both buttons can show
  // an honest, specific label if a customer clicks "Send Request" while
  // Add to Cart's own save is somehow also in flight (an edge case, not
  // the common path, but both states stay individually accurate either
  // way).
  const [isPreparingRequest, setIsPreparingRequest] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Object URLs are a real browser resource -- revoked via explicit,
  // synchronous calls at the exact point something is actually discarded
  // (handleRemoveLogo, handleEditDesign's own "replace the active
  // canvas" step, ...), same "don't leak" discipline this project
  // already applies to Storage objects. `savedDesigns` itself is no
  // longer local state (Prompt 143 -- lifted to DesignRequestProvider),
  // so ITS OWN unmount cleanup now lives there; this file's own
  // unmount sweep only needs to cover the ACTIVE canvas's logos.
  const logosRef = useRef<LogoEntry[]>(logos);
  useEffect(() => {
    logosRef.current = logos;
  }, [logos]);
  useEffect(() => {
    return () => {
      for (const logo of logosRef.current) {
        URL.revokeObjectURL(logo.originalUrl);
        if (logo.processedUrl) URL.revokeObjectURL(logo.processedUrl);
      }
    };
  }, []);

  /** Every file selection ADDS a new logo -- never replaces an existing
   *  one. `e.target.value = ""` afterward lets the customer pick the
   *  exact same filename again for a second logo without the browser
   *  silently skipping the change event. */
  function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const newLogo: LogoEntry = {
      id: crypto.randomUUID(),
      file,
      originalUrl: URL.createObjectURL(file),
      processedUrl: null,
      useProcessed: false,
      isRemovingBackground: false,
      bgRemovalError: null,
      position: DEFAULT_POSITION,
    };
    setLogos((prev) => [...prev, newLogo]);
    e.target.value = "";
  }

  async function handleRemoveBackground(logoId: string) {
    const logo = logos.find((l) => l.id === logoId);
    if (!logo) return;

    setLogos((prev) =>
      prev.map((l) =>
        l.id === logoId ? { ...l, isRemovingBackground: true, bgRemovalError: null } : l
      )
    );
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
    );

    const result = await removeBackground(logo.file);

    setLogos((prev) =>
      prev.map((l) => {
        if (l.id !== logoId) return l;
        if (result.status === "success") {
          if (l.processedUrl) URL.revokeObjectURL(l.processedUrl);
          return {
            ...l,
            isRemovingBackground: false,
            processedUrl: result.url,
            useProcessed: true,
          };
        }
        return { ...l, isRemovingBackground: false, bgRemovalError: result.message };
      })
    );
  }

  function handleUndoBackgroundRemoval(logoId: string) {
    setLogos((prev) =>
      prev.map((l) => (l.id === logoId ? { ...l, useProcessed: false } : l))
    );
  }

  function handleRemoveLogo(logoId: string) {
    setLogos((prev) => {
      const target = prev.find((l) => l.id === logoId);
      if (target) {
        URL.revokeObjectURL(target.originalUrl);
        if (target.processedUrl) URL.revokeObjectURL(target.processedUrl);
      }
      return prev.filter((l) => l.id !== logoId);
    });
    setDraggingLogoId((current) => (current === logoId ? null : current));
  }

  /**
   * "Add to Cart" (Phase B's original "Save This Design", relabeled per
   * this prompt's own explicit client naming decision -- identical
   * underlying behavior): snapshots the CURRENT canvas (color + every
   * logo's exact position/processed state + note) into the shared
   * `savedDesigns` cart, then resets the active canvas to blank. Async
   * because the thumbnail is a REAL rendered preview (Phase 4's own
   * generateCompositeImage) -- reused as-is for the real submission
   * later (Phase D), never regenerated.
   *
   * Returns a boolean (Prompt 143 change from Phase B's own void
   * return) so handleGoToRequest below can tell whether the auto-save
   * actually succeeded before deciding to navigate -- silently
   * navigating past a failed save would drop the customer's design
   * without telling them, exactly what this prompt's own "auto-include
   * it, don't silently drop it" instruction rules out.
   */
  async function handleSaveDesign(): Promise<boolean> {
    if (!selectedColor || logos.length === 0 || !bottleImageUrl) return false;

    setIsSavingDesign(true);
    setSaveDesignError(null);

    try {
      const containerRect = containerRef.current?.getBoundingClientRect();
      const containerWidthPx = containerRect?.width ?? 0;
      const containerHeightPx = containerRect?.height ?? 0;

      const logoInputs = logos.map((logo) => ({
        url: logo.useProcessed && logo.processedUrl ? logo.processedUrl : logo.originalUrl,
        position: logo.position,
      }));

      const thumbnailBlob = await generateCompositeImage({
        bottleImageUrl,
        logos: logoInputs,
        containerWidthPx,
        containerHeightPx,
      });
      const thumbnailUrl = URL.createObjectURL(thumbnailBlob);

      const snapshot: SavedDesign = {
        id: crypto.randomUUID(),
        bottleColor: selectedColor,
        logos: logos.map((l) => ({ ...l })),
        note,
        thumbnailUrl,
      };

      addSavedDesign(snapshot);

      // Reset the active canvas to blank -- NOT revoking the logos'
      // URLs, ownership just moved to `snapshot` above.
      setSelectedColor(null);
      setLogos([]);
      setNote("");
      setDraggingLogoId(null);
      return true;
    } catch (err) {
      setSaveDesignError(
        err instanceof Error
          ? err.message
          : "Something went wrong saving this design. Please try again."
      );
      return false;
    } finally {
      setIsSavingDesign(false);
    }
  }

  /**
   * Prompt 143 -- "Edit": loads a saved design back into the active
   * canvas and removes it from `savedDesigns` (genuinely being EDITED,
   * not viewed-while-still-saved -- re-saving via "Add to Cart" is what
   * puts it back). Whatever's currently on the active canvas is about
   * to be silently replaced -- its own logos' object URLs are revoked
   * here, same "don't leak" discipline as handleRemoveLogo.
   */
  function handleEditDesign(designId: string) {
    const design = savedDesigns.find((d) => d.id === designId);
    if (!design) return;

    for (const logo of logos) {
      URL.revokeObjectURL(logo.originalUrl);
      if (logo.processedUrl) URL.revokeObjectURL(logo.processedUrl);
    }
    URL.revokeObjectURL(design.thumbnailUrl);

    setSelectedColor(design.bottleColor);
    setLogos(design.logos);
    setNote(design.note);
    setDraggingLogoId(null);
    removeSavedDesign(designId);
  }

  /** "Remove": deletes a saved design entirely -- distinct from Edit,
   *  which moves it back to the active canvas instead of discarding it.
   *  Revokes every object URL it owns immediately. */
  function handleRemoveSavedDesign(designId: string) {
    const target = savedDesigns.find((d) => d.id === designId);
    if (target) {
      URL.revokeObjectURL(target.thumbnailUrl);
      for (const logo of target.logos) {
        URL.revokeObjectURL(logo.originalUrl);
        if (logo.processedUrl) URL.revokeObjectURL(logo.processedUrl);
      }
    }
    removeSavedDesign(designId);
  }

  /**
   * Prompt 143 -- "Send Request": navigates to the new customer-info
   * page, carrying `savedDesigns` (already shared via DesignRequestProvider
   * -- see that file's own top comment for why a Context Provider, not
   * sessionStorage/URL params, is what actually survives this
   * navigation). If the active canvas currently holds a valid,
   * unsaved design, it's auto-saved first (reusing the exact "Add to
   * Cart" logic) so it's genuinely included, not silently dropped --
   * this prompt's own explicit requirement. If that auto-save fails,
   * this does NOT navigate -- the customer sees the real error
   * (saveDesignError, rendered below) and can retry, rather than
   * silently losing the design they were just working on.
   */
  async function handleGoToRequest() {
    if (canSaveDesign) {
      setIsPreparingRequest(true);
      const saved = await handleSaveDesign();
      setIsPreparingRequest(false);
      if (!saved) return;
    }
    router.push("/design-your-bottle/request");
  }

  function clampPercent(value: number): number {
    return Math.min(100, Math.max(0, value));
  }

  function percentFromPointer(clientX: number, clientY: number): Position {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return DEFAULT_POSITION;
    const x = ((clientX - rect.left) / rect.width) * 100;
    const y = ((clientY - rect.top) / rect.height) * 100;
    return { x: clampPercent(x), y: clampPercent(y) };
  }

  function handlePointerDown(e: React.PointerEvent<HTMLImageElement>, logoId: string) {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    setDraggingLogoId(logoId);
    const pos = percentFromPointer(e.clientX, e.clientY);
    setLogos((prev) => prev.map((l) => (l.id === logoId ? { ...l, position: pos } : l)));
  }

  function handlePointerMove(e: React.PointerEvent<HTMLImageElement>, logoId: string) {
    if (draggingLogoId !== logoId) return;
    const pos = percentFromPointer(e.clientX, e.clientY);
    setLogos((prev) => prev.map((l) => (l.id === logoId ? { ...l, position: pos } : l)));
  }

  function handlePointerUp(e: React.PointerEvent<HTMLImageElement>) {
    setDraggingLogoId(null);
    e.currentTarget.releasePointerCapture(e.pointerId);
  }

  const bottleImageUrl = selectedColor ? images[selectedColor] : null;
  const canSaveDesign = Boolean(selectedColor && logos.length > 0 && bottleImageUrl);
  // "Send Request" is available once there's EITHER something already
  // saved OR a valid design on the active canvas (auto-saved on click) --
  // never both required.
  const canGoToRequest = savedDesigns.length > 0 || canSaveDesign;

  return (
    <div className="mx-auto max-w-3xl">
      {/* "My Designs" -- placed ABOVE the active canvas deliberately --
          finished/saved work stays visible at the top as the list
          grows, with the "currently being designed" canvas below it. */}
      {savedDesigns.length > 0 ? (
        <div className="mb-10">
          <h2 className="text-center text-lg font-medium text-brand-black">
            {t("myDesignsHeading")}
          </h2>
          <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
            {savedDesigns.map((design) => (
              <div
                key={design.id}
                className="flex flex-col items-center gap-2 rounded-card border border-brand-border p-3"
              >
                <div className="relative aspect-3/4 w-full overflow-hidden rounded-btn bg-brand-surface">
                  <img
                    src={design.thumbnailUrl}
                    alt=""
                    className="h-full w-full object-contain"
                  />
                </div>
                <p className="text-sm font-medium text-brand-black">
                  {t(`color.${design.bottleColor}`)}
                </p>
                <p className="text-xs text-brand-gray">
                  {t("designLogoCount", { count: design.logos.length })}
                </p>
                <div className="mt-1 flex gap-3">
                  <button
                    type="button"
                    onClick={() => handleEditDesign(design.id)}
                    className="text-xs font-medium text-brand-black underline-offset-2 hover:underline"
                  >
                    {t("editDesign")}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRemoveSavedDesign(design.id)}
                    className="text-xs text-red-600 underline-offset-2 hover:underline"
                  >
                    {t("removeDesign")}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {/* Bottle display -- object-contain: a product-configuration
          preview must show the WHOLE bottle, never crop it. The SAME
          placeholder also covers "no color selected yet"
          (selectedColor === null, right after Add to Cart resets it). */}
      <div
        ref={containerRef}
        className="relative mx-auto aspect-[3/4] w-full max-w-sm overflow-hidden rounded-card bg-brand-surface select-none"
      >
        {bottleImageUrl ? (
          <Image
            key={selectedColor ?? "none"}
            src={bottleImageUrl}
            alt=""
            fill
            sizes="(min-width: 640px) 384px, 100vw"
            className="object-contain"
            priority
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-brand-gray">
            <svg
              viewBox="0 0 24 24"
              className="h-12 w-12"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 16.5V6a1 1 0 011-1h16a1 1 0 011 1v12a1 1 0 01-1 1H4a1 1 0 01-1-1zm0 0l6-6 4 4 3-3 5 5"
              />
              <circle cx="8" cy="8" r="1.5" />
            </svg>
          </div>
        )}

        {logos.map((logo) => {
          const activeUrl =
            logo.useProcessed && logo.processedUrl ? logo.processedUrl : logo.originalUrl;
          const isDragging = draggingLogoId === logo.id;
          return (
            <img
              key={`${logo.id}-${activeUrl}`}
              src={activeUrl}
              alt=""
              onPointerDown={(e) => handlePointerDown(e, logo.id)}
              onPointerMove={(e) => handlePointerMove(e, logo.id)}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
              className={
                "absolute w-1/4 max-w-30 -translate-x-1/2 -translate-y-1/2 touch-none " +
                (isDragging
                  ? "cursor-grabbing"
                  : "cursor-grab drop-shadow-[0_2px_6px_rgba(0,0,0,0.35)]")
              }
              style={{
                left: `${logo.position.x}%`,
                top: `${logo.position.y}%`,
                zIndex: isDragging ? 20 : 10,
              }}
            />
          );
        })}
      </div>

      {/* Color swatches */}
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        {BOTTLE_COLOR_SLOTS.map((slot) => (
          <button
            key={slot}
            type="button"
            onClick={() => setSelectedColor(slot)}
            aria-label={t(`color.${slot}`)}
            aria-pressed={selectedColor === slot}
            className={
              "h-10 w-10 rounded-full border-2 transition-all " +
              SWATCH_CLASSES[slot] +
              " " +
              (selectedColor === slot
                ? "border-brand-black scale-110"
                : "border-transparent hover:scale-105")
            }
          />
        ))}
      </div>

      {/* Logo upload */}
      <div className="mt-8 flex flex-col items-center gap-2">
        <label htmlFor="logo-upload" className="text-sm font-medium text-brand-black">
          {logos.length > 0 ? t("addAnotherLogoLabel") : t("uploadLabel")}
        </label>
        <input
          ref={fileInputRef}
          id="logo-upload"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleLogoChange}
          className="block text-sm text-brand-black file:me-3 file:rounded-btn file:border file:border-brand-border file:bg-brand-white file:px-3 file:py-1.5 file:text-sm file:text-brand-black hover:file:border-brand-black"
        />
        {logos.length > 0 ? (
          <p className="text-xs text-brand-gray">{t("dragHint")}</p>
        ) : null}
      </div>

      {/* One card per logo: its own "Remove Background"/"Undo" button,
          its own hint/error, and its own "Remove" (delete the whole
          logo) control. */}
      {logos.length > 0 ? (
        <div className="mt-6 space-y-4">
          {logos.map((logo, index) => (
            <div
              key={logo.id}
              className="flex flex-col items-center gap-2 rounded-card border border-brand-border p-4"
            >
              <div className="flex w-full max-w-xs items-center justify-between gap-3">
                <p className="text-sm font-medium text-brand-black">
                  {t("logoLabel", { number: index + 1 })}
                </p>
                <button
                  type="button"
                  onClick={() => handleRemoveLogo(logo.id)}
                  className="text-xs text-red-600 underline-offset-2 hover:underline"
                >
                  {t("removeLogo")}
                </button>
              </div>

              {logo.useProcessed && logo.processedUrl ? (
                <button
                  type="button"
                  onClick={() => handleUndoBackgroundRemoval(logo.id)}
                  className="rounded-btn border border-brand-border px-4 py-2 text-sm font-medium text-brand-black transition-colors hover:border-brand-black"
                >
                  {t("undoBackgroundRemoval")}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => handleRemoveBackground(logo.id)}
                  disabled={logo.isRemovingBackground}
                  className="rounded-btn border border-brand-black bg-brand-black px-4 py-2 text-sm font-medium text-brand-white transition-colors hover:bg-brand-white hover:text-brand-black disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {logo.isRemovingBackground ? t("removingBackground") : t("removeBackground")}
                </button>
              )}
              <p className="max-w-xs text-center text-xs text-brand-gray">
                {t("removeBackgroundHint")}
              </p>
              {logo.bgRemovalError ? (
                <p role="alert" className="max-w-xs text-center text-xs text-red-600">
                  {logo.bgRemovalError}
                </p>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}

      {/* Note -- per-design, typed here for whichever design is
          currently active and captured into the snapshot on Add to
          Cart. */}
      <div className="mt-8 flex flex-col items-center gap-2">
        <label htmlFor="design-note" className="text-sm font-medium text-brand-black">
          {t("noteLabel")}
        </label>
        <textarea
          id="design-note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={4}
          maxLength={2000}
          className="w-full max-w-md rounded-btn border border-brand-border bg-brand-white px-3 py-2.5 text-sm text-brand-black"
        />
      </div>

      {/* Prompt 143 -- the two entry points, per the client's own
          decision: "Add to Cart" keeps building the list (Phase B's
          logic, relabeled); "Send Request" moves on to collect customer
          info and actually submit everything (the NEW /design-your-
          bottle/request page). */}
      <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={handleSaveDesign}
          disabled={!canSaveDesign || isSavingDesign || isPreparingRequest}
          className="rounded-btn border border-brand-black px-6 py-2.5 text-sm font-medium text-brand-black transition-colors hover:bg-brand-black hover:text-brand-white disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSavingDesign ? t("savingDesign") : t("addToCart")}
        </button>
        <button
          type="button"
          onClick={handleGoToRequest}
          disabled={!canGoToRequest || isSavingDesign || isPreparingRequest}
          className="rounded-btn border border-brand-black bg-brand-black px-6 py-2.5 text-sm font-medium text-brand-white transition-colors hover:bg-brand-white hover:text-brand-black disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPreparingRequest ? t("preparingRequest") : t("sendRequest")}
        </button>
      </div>
      <div className="mt-2 flex flex-col items-center gap-1">
        {!canSaveDesign ? (
          <p className="max-w-xs text-center text-xs text-brand-gray">
            {t("chooseColorAndLogoHint")}
          </p>
        ) : null}
        {!canGoToRequest ? (
          <p className="max-w-xs text-center text-xs text-brand-gray">
            {t("noDesignsHint")}
          </p>
        ) : null}
        {saveDesignError ? (
          <p role="alert" className="max-w-xs text-center text-xs text-red-600">
            {saveDesignError}
          </p>
        ) : null}
      </div>
    </div>
  );
}
