"use client";

import { useActionState } from "react";
import { deleteHeroSlideAction } from "@/app/admin/(dashboard)/hero-slides/actions";
import { HERO_SLIDE_ACTION_INITIAL_STATE } from "@/types/admin-hero";

// Mirrors DeleteCategoryButton.tsx (Prompt 23) exactly -- unlike
// products, hero slides have no historical-reference concern (nothing
// else in the schema ever references hero_slides.id), so this never
// blocks; the error branch exists only for a genuine, unexpected DB/
// Storage failure.
export default function DeleteHeroSlideButton({
  id,
  label,
}: {
  id: string;
  /** Whatever identifies this slide in the confirm dialog -- a headline
   *  if it has one, else a generic fallback (see the list page). */
  label: string;
}) {
  const action = deleteHeroSlideAction.bind(null, id);
  const [state, formAction, isPending] = useActionState(
    action,
    HERO_SLIDE_ACTION_INITIAL_STATE
  );

  return (
    <div>
      <form
        action={formAction}
        onSubmit={(e) => {
          if (!window.confirm(`Delete "${label}"? This cannot be undone.`)) {
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
