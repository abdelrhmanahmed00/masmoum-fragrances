-- Prompt 127: Special "Perfumes" Category Sub-Template (Phase 3) -- the
-- 3 gender-selection tile images (Men / Women / Unisex), shown on the
-- intermediate /categories/perfumes page before a gender is chosen.
--
-- New Storage bucket + table, byte-for-byte the same shape as
-- private_label_images (0028 migration): a FIXED set of 3 named slots,
-- not a variable-length admin-creatable list like categories/products --
-- an admin can replace a slot's image, never add/remove a slot itself
-- (there are exactly 3 real gender enum values this page will ever offer,
-- VALID_GENDERS in lib/catalog.ts), so this needs the same "row per fixed
-- slot, storage_path nullable, admin replaces in place" shape 0028 already
-- established for exactly this kind of fixed-slot content, not
-- categories' own dynamic-list shape (0033 migration) or hero_slides'
-- variable-length-list shape.
--
-- Slot values are literally "men"/"women"/"unisex" -- the SAME strings as
-- the public_gender enum's own filterable values (0004 migration's
-- product_gender enum, minus "not_applicable" -- VALID_GENDERS in
-- lib/catalog.ts already excludes that one from anything public-facing).
-- Reusing the identical strings (not a parallel "male"/"female" naming
-- scheme) means the sub-template's tile-to-filter-value mapping is
-- direct, not a lookup table that could drift out of sync.
--
-- New bucket ("perfume-gender-images"), not reusing private-label-images
-- or category-images: same "dedicated bucket per conceptually distinct
-- feature" reasoning as every prior image-bucket decision in this
-- project (0033's own comment restates this for category-images vs.
-- private-label-images/hero-images) -- keeps each feature's Storage
-- objects independently manageable/deletable with zero cross-feature
-- risk.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'perfume-gender-images',
  'perfume-gender-images',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;

create policy "perfume_gender_images_public_select"
  on storage.objects
  for select
  to anon, authenticated
  using (bucket_id = 'perfume-gender-images');

create policy "perfume_gender_images_admin_insert"
  on storage.objects
  for insert
  to authenticated
  with check (bucket_id = 'perfume-gender-images');

create policy "perfume_gender_images_admin_delete"
  on storage.objects
  for delete
  to authenticated
  using (bucket_id = 'perfume-gender-images');

-- perfume_gender_images table --------------------------------------------
-- storage_path is the object path within the perfume-gender-images
-- bucket, NOT a full URL (see lib/supabase/storage.ts) -- same convention
-- as every other Storage-backed table. Nullable: every slot starts with
-- no image, a real, expected, gracefully-handled state (the public page
-- renders a placeholder, never a broken <img>), same as
-- private_label_images.
create table public.perfume_gender_images (
  slot text primary key,
  storage_path text,
  updated_at timestamptz not null default now()
);

create trigger perfume_gender_images_set_updated_at
  before update on public.perfume_gender_images
  for each row
  execute function public.set_updated_at();

alter table public.perfume_gender_images enable row level security;

revoke all on public.perfume_gender_images from anon, authenticated;
grant select on public.perfume_gender_images to anon, authenticated;

-- No is_active column, so no active-only filter -- every slot's row is
-- always meant to be publicly readable (same reasoning as
-- private_label_images_public_select, 0028 migration).
create policy "perfume_gender_images_public_select"
  on public.perfume_gender_images
  for select
  to anon, authenticated
  using (true);

grant insert, update, delete on public.perfume_gender_images to authenticated;

create policy "perfume_gender_images_admin_all"
  on public.perfume_gender_images
  for all
  to authenticated
  using (true)
  with check (true);

-- service_role grant -- see 0010_service_role_grants.sql's own comment
-- for why every new table needs this stated explicitly.
grant all on public.perfume_gender_images to service_role;

-- Seed the 3 fixed slots with NULL storage_path -- nothing uploaded yet,
-- same "seed keys with NULL, real values entered later via the admin
-- dashboard" discipline as private_label_images' own seed.
insert into public.perfume_gender_images (slot, storage_path) values
  ('men', null),
  ('women', null),
  ('unisex', null)
on conflict (slot) do nothing;
