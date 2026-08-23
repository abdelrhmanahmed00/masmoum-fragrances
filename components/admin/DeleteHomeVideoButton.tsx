"use client";

import { useActionState } from "react";
import { deleteHomeVideoAction } from "@/app/admin/(dashboard)/home-videos/actions";
import { HOME_VIDEO_ACTION_INITIAL_STATE } from "@/types/admin-home-video";

// Mirrors DeleteHeroSlideButton.tsx (Prompt 35) -- nothing else in the
// schema references home_videos.id, so this never blocks; the error
// branch exists only for a genuine, unexpected DB/Storage failure.
export default function DeleteHomeVideoButton({
  id,
  label,
}: {
  id: string;
  label: string;
}) {
  const action = deleteHomeVideoAction.bind(null, id);
  const [state, formAction, isPending] = useActionState(
    action,
    HOME_VIDEO_ACTION_INITIAL_STATE
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
