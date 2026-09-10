-- Prompt 125: Category Templates Strip (Phase 1) -- one admin-uploadable
-- image per category, shown as the tile background on the new homepage
-- strip. Additive only: does not touch any existing column, policy, or
-- data on public.categories.
--
-- A single nullable column on the EXISTING categories table, not a
-- separate images table like private_label_images (0028 migration) --
-- deliberately different shape, re-read and confirmed before writing
-- this: Private Label needed a separate table because it has a FIXED set
-- of named slots (hero, tile_1..tile_6) that aren't rows of any other
-- table. Categories are already their own table with their own admin
-- CRUD (create/edit/delete, sort_order, is_active) -- one image per
-- category is a 1:1 relationship that belongs directly on the row it
-- describes, the same way hero_slides.storage_path lives directly on
-- hero_slides rather than in a side table. New Storage bucket
-- ("category-images"), same bucket-per-feature convention as
-- hero-images/product-images/private-label-images -- not reused from any
-- of those (a category image is conceptually distinct content from a
-- hero banner, a product photo, or a Private Label marketing image, and
-- a dedicated bucket keeps each feature's Storage objects independently
-- manageable/deletable without cross-feature risk, same reasoning 0028's
-- own comment gives for private-label-images not reusing hero-images).

alter table public.categories
  add column image_storage_path text;

-- No index needed -- this column is never filtered/ordered on, only
-- selected alongside the row's other fields (same as hero_slides.
-- storage_path, which also has no index).

-- No RLS/grant changes needed -- categories_public_select_active (0002
-- migration) is a plain `for select ... using (is_active = true)` policy
-- with no column list, so it already covers this new column for anon/
-- authenticated reads. categories_admin_all (0014 migration, `for all
-- using (true) with check (true)`) already covers writing it too. Neither
-- policy needs to change for a new column on an already-covered table.

-- Storage bucket + policies -----------------------------------------------
-- Bundled into this one migration (the newer self-contained-migration
-- convention -- e.g. 0025 static_pages, 0028 private_label_images --
-- rather than the older hero-images/product-images split across separate
-- 0012/0019/0020 files). Same public SELECT + authenticated INSERT/DELETE
-- shape as every other image bucket in this project; no UPDATE policy --
-- every upload (including a category image REPLACEMENT on edit) gets a
-- fresh, unique path, never an in-place overwrite (Prompt 7's CDN
-- stale-cache finding, restated by every prior image-upload migration).

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'category-images',
  'category-images',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;

create policy "category_images_public_select"
  on storage.objects
  for select
  to anon, authenticated
  using (bucket_id = 'category-images');

create policy "category_images_admin_insert"
  on storage.objects
  for insert
  to authenticated
  with check (bucket_id = 'category-images');

create policy "category_images_admin_delete"
  on storage.objects
  for delete
  to authenticated
  using (bucket_id = 'category-images');
