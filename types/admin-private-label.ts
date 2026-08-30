// Prompt 92 -- the FIXED image slots on the Private Label page (1 hero
// band + 6 grid tiles, Phase 1). Not a variable-length list like
// hero_slides/products -- an admin can replace a slot's image, never
// add/remove a slot itself, so there's no separate "row shape for the
// list vs. the edit form" split the way categories/products need.
//
// Prompt 93 (Phase 2) adds "experience" -- the 8th slot, for the new
// headline+bullets+image section's large image. Extending this ONE
// array is the only code change needed to teach validation
// (lib/admin/private-label-images.ts's isValidSlot), the admin page,
// and the public read map about the new slot -- no `slot` CHECK
// constraint exists in the DB to also update (see the 0029 migration's
// own comment for why that was a deliberate choice, not an oversight).
//
// Prompt 94 (Phase 3) adds "block_a"/"block_b" -- the 9th and 10th
// slots, one large image per 3-column feature block (same "extend this
// one array" mechanism, see the 0030 migration).
//
// Prompt 96 (Phase 5, FINAL) adds "cta_background" -- the 11th and last
// slot, the closing CTA band's background photo (see the 0031
// migration).
//
// Prompt 101 -- removes "tile_1".."tile_6": the 6-tile grid section was
// deleted entirely from the public page per client request, so these 6
// slots have nothing left to render into. Removed from this array (the
// single source of truth for validation/admin-page/read-map) and their
// now-orphaned DB rows deleted outright (0032 migration) rather than
// left as dead data.

export const PRIVATE_LABEL_IMAGE_SLOTS = [
  "hero",
  "experience",
  "block_a",
  "block_b",
  "cta_background",
] as const;

export type PrivateLabelImageSlot = (typeof PRIVATE_LABEL_IMAGE_SLOTS)[number];

export type AdminPrivateLabelImageRow = {
  slot: PrivateLabelImageSlot;
  storage_path: string | null;
};

export type PrivateLabelImageActionState =
  | { status: "idle" }
  | { status: "success" }
  | { status: "error"; message: string };

export const PRIVATE_LABEL_IMAGE_ACTION_INITIAL_STATE: PrivateLabelImageActionState =
  { status: "idle" };
