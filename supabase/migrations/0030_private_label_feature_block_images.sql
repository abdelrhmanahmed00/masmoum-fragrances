-- Prompt 94 (Phase 3) -- 2 new image slots for the two 3-column feature
-- blocks (Block A: "Private Label Perfumes" / "Creative Design &
-- Packaging" / "Quality in Manufacturing"; Block B: "Private Label
-- Expertise" / "Custom Fragrance Design" / "Premium Manufacturing").
-- Same pattern as 0029's "experience" slot: no schema/constraint change,
-- since private_label_images.slot has no `check` constraint (app-level
-- validation only, via types/admin-private-label.ts's
-- PRIVATE_LABEL_IMAGE_SLOTS).
insert into public.private_label_images (slot, storage_path) values
  ('block_a', null),
  ('block_b', null)
on conflict (slot) do nothing;
