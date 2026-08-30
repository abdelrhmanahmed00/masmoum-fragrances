-- Prompt 93 (Phase 2): adds the 8th private_label_images slot --
-- "experience" -- for the new headline+bullets+image section's large
-- image. Same table (0028 migration), same fixed-slots pattern -- no
-- schema change needed at all beyond one more seeded row, since `slot`
-- was deliberately left a plain `text primary key` with no `check`
-- constraint (validation lives at the application layer,
-- lib/admin/private-label-images.ts's isValidSlot, driven by the single
-- PRIVATE_LABEL_IMAGE_SLOTS array in types/admin-private-label.ts) --
-- exactly the kind of forward-compatible choice that made this a
-- one-line migration instead of an ALTER TABLE.
insert into public.private_label_images (slot, storage_path) values
  ('experience', null)
on conflict (slot) do nothing;
