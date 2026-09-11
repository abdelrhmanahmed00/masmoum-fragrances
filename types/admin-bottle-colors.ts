// Prompt 131 -- the FIXED 5 image slots for the Custom Bottle Designer's
// cap-color options (transparent glass, only the cap color differs
// across the 5 real images). Same "fixed slots, not a variable-length
// list" shape as types/admin-private-label.ts's PRIVATE_LABEL_IMAGE_SLOTS
// -- see that file's own comment for the full reasoning, restated for
// this feature in the 0036 migration's own comment.
//
// These same 5 string values are also this project's single source of
// truth for design_requests.bottle_color (validated in application code
// against this array, not a DB CHECK constraint -- see the 0036
// migration's own comment for why).

export const BOTTLE_COLOR_SLOTS = [
  "yellow",
  "blue",
  "fuchsia",
  "pink",
  "green",
] as const;

export type BottleColorSlot = (typeof BOTTLE_COLOR_SLOTS)[number];

export type AdminBottleColorImageRow = {
  slot: BottleColorSlot;
  storage_path: string | null;
};

export type BottleColorImageActionState =
  | { status: "idle" }
  | { status: "success" }
  | { status: "error"; message: string };

export const BOTTLE_COLOR_IMAGE_ACTION_INITIAL_STATE: BottleColorImageActionState =
  { status: "idle" };
