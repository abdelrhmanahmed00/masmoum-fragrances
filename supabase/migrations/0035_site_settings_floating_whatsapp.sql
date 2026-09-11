-- Prompt 130: a SECOND, independent WhatsApp number for the site-wide
-- floating button (Prompt 122), separate from contact_whatsapp (which the
-- Footer's own two WhatsApp links keep using unchanged).
--
-- Not strictly required by schema -- site_settings.key has no CHECK
-- constraint (confirmed by re-reading 0011's own table definition before
-- writing this), so lib/admin/site-settings.ts's own upsert would create
-- this row on the very first admin save regardless. Seeded here anyway,
-- matching this project's own established convention for adding a new
-- site_settings key: 0022 (social media links) seeded its 3 new keys via
-- a migration too, for the same "the row exists with NULL from the
-- start, discoverable in the schema, not silently materialized by
-- whatever the first save happens to write" reasoning restated there.
--
-- value_ar included (not left unused like the social-link keys) --
-- contact_whatsapp itself uses both value_en/value_ar (Footer.tsx's
-- pickLocalizedSetting locale-fallback rule), and this is the same kind
-- of contact-number field, not a locale-independent URL like the social
-- keys -- same reasoning, applied consistently.

insert into public.site_settings (key, value_en, value_ar) values
  ('contact_whatsapp_floating', null, null)
on conflict (key) do nothing;
