// Prompt 127 -- the FIXED image slots for the Perfumes category's
// gender-selection sub-template (Men / Women / Unisex, + Kids as of
// Prompt 170). Same "fixed slots, not a variable-length list" shape as
// types/admin-private-label.ts's PRIVATE_LABEL_IMAGE_SLOTS -- see that
// file's own comment for the full reasoning, restated for this feature
// in the 0034 migration's own comment.
//
// Values are literally "men"/"women"/"unisex"/"kids" -- the SAME strings
// as lib/catalog.ts's VALID_GENDERS (the real, public-filterable subset
// of the product_gender enum, 0004 migration + 0038 migration's "kids"
// addition) -- not a parallel naming scheme, so a tile's slot value can
// be used directly as the ?gender=<value> query param with no
// lookup/translation step.

export const PERFUME_GENDER_SLOTS = ["men", "women", "unisex", "kids"] as const;

export type PerfumeGenderSlot = (typeof PERFUME_GENDER_SLOTS)[number];

export type AdminPerfumeGenderImageRow = {
  slot: PerfumeGenderSlot;
  storage_path: string | null;
};

export type PerfumeGenderImageActionState =
  | { status: "idle" }
  | { status: "success" }
  | { status: "error"; message: string };

export const PERFUME_GENDER_IMAGE_ACTION_INITIAL_STATE: PerfumeGenderImageActionState =
  { status: "idle" };
