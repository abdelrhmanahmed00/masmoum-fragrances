-- Prompt 44: three new site_settings keys for social media links
-- (Instagram, Facebook, TikTok).
--
-- These are plain URLs, not locale-dependent text -- unlike
-- contact_email/phone/whatsapp, which genuinely use BOTH value_en and
-- value_ar (confirmed via Footer.tsx's pickLocalizedSetting, Prompt 43:
-- it prefers the current locale's value with a fallback to the other).
-- A URL doesn't have an "English version" and an "Arabic version."
--
-- Decision: reuse the existing value_en column to hold the URL, leave
-- value_ar NULL/unused for these 3 rows, rather than adding a new
-- dedicated `value` column via ALTER TABLE. Reasoning: site_settings is
-- already a loose, heterogeneous key-value store -- nothing enforces
-- that every row uses both columns the same way, and a new column would
-- only ever be populated by these 3 rows out of what's now 6 total, not
-- enough of a real recurring pattern to justify a schema change and a
-- third column that's NULL on every other row. value_en is read/written
-- as "this row's single value" for these 3 keys specifically -- both
-- lib/admin/site-settings.ts and Footer.tsx comment this explicitly at
-- every read/write site so this doesn't read as "the English text" to a
-- future reader.

insert into public.site_settings (key, value_en, value_ar) values
  ('social_instagram_url', null, null),
  ('social_facebook_url', null, null),
  ('social_tiktok_url', null, null)
on conflict (key) do nothing;
