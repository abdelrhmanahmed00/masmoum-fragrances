-- Prompt 96 (Phase 5, FINAL) -- 1 new image slot for the closing CTA
-- band's background photo. The reference's real CTA section
-- (gulforchid.com/private-label, element 9fbe990) genuinely uses a
-- background photo (dark-overlaid, real cited `opacity:0.31`) behind its
-- own "Contact Us For Manufacturing Solutions" CTA -- so, per this
-- prompt's own instruction, an admin slot is added here rather than a
-- flat solid-color-only substitute, for the same reason every other real
-- photo section on this page (hero, 6 tiles, experience, 2 feature
-- blocks) already got one. Same pattern as 0029/0030: no schema/
-- constraint change, since private_label_images.slot has no `check`
-- constraint (app-level validation only, via
-- types/admin-private-label.ts's PRIVATE_LABEL_IMAGE_SLOTS).
insert into public.private_label_images (slot, storage_path) values
  ('cta_background', null)
on conflict (slot) do nothing;
