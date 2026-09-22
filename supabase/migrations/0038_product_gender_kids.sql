-- Prompt 170: 4th gender value, "kids" -- extends the existing
-- Men/Women/Unisex system (0004 migration's product_gender enum, 0034
-- migration's perfume_gender_images fixed-slot table) to a 4th value,
-- for the Smart Boy Kids Cologne products (currently mis-bucketed under
-- "men") and any future kids' products.
--
-- Safe to run as one statement/transaction: ALTER TYPE ... ADD VALUE is
-- transactional on this project's Postgres version (Supabase runs on
-- PG 15+, which allows it inside a transaction block -- the one real
-- restriction is that the new value can't be USED in the SAME
-- transaction it's added in, e.g. in a WHERE/INSERT referencing
-- 'kids'). This migration only ADDS the enum value; nothing in this
-- file (or the app) writes gender = 'kids' to the products table until
-- a later, separate transaction (Prompt 170 Part 3's real
-- updateProduct() calls, run after this migration is confirmed live).
--
-- The perfume_gender_images seed insert below is unaffected by that
-- restriction: its `slot` column is a plain `text` primary key (0034
-- migration), not the product_gender enum itself, so seeding
-- ('kids', null) here in the same transaction is fine.
alter type public.product_gender add value 'kids';

-- Seed the 4th fixed slot with NULL storage_path -- same "starts empty,
-- admin uploads later" convention as the original 3 (0034 migration's
-- own seed). Without this row, PerfumeGenderImageSlotForm's real upload
-- path (a plain .update(), not an upsert -- see
-- lib/admin/perfume-gender-images.ts) has nothing to match on and the
-- "Kids Tile" upload would silently no-op.
insert into public.perfume_gender_images (slot, storage_path) values
  ('kids', null)
on conflict (slot) do nothing;
