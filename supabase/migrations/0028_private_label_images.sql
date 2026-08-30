-- Prompt 92: Private Label page rebuild (Phase 1). New Storage bucket +
-- table for the page's own 7 admin-managed images (1 hero band + 6 grid
-- tiles) -- a FIXED set of named slots, not an admin-creatable list like
-- hero_slides. Shaped after site_settings (0011 migration)'s own
-- key-value singleton pattern (no is_active/sort_order -- every slot is
-- always shown, just with a graceful placeholder until an image is
-- uploaded), not the variable-length-list pattern hero_slides/products
-- use.
--
-- Bucket + storage.objects policies bundled into this ONE migration
-- (matching the newer, self-contained-migration convention -- e.g. 0025
-- static_pages -- rather than the older hero-images/product-images split
-- across separate 0012/0019/0020 files): public SELECT, authenticated
-- INSERT + DELETE (no UPDATE -- every upload gets a fresh, unique path,
-- the old object deleted only after the DB row is confirmed pointing at
-- the new one, same CDN-stale-cache-avoiding ordering as
-- lib/admin/hero-slides.ts's own createHeroSlide/updateHeroSlide).

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'private-label-images',
  'private-label-images',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;

create policy "private_label_images_public_select"
  on storage.objects
  for select
  to anon, authenticated
  using (bucket_id = 'private-label-images');

create policy "private_label_images_admin_insert"
  on storage.objects
  for insert
  to authenticated
  with check (bucket_id = 'private-label-images');

create policy "private_label_images_admin_delete"
  on storage.objects
  for delete
  to authenticated
  using (bucket_id = 'private-label-images');

-- private_label_images table --------------------------------------------
-- storage_path is the object path within the private-label-images bucket,
-- NOT a full URL (see lib/supabase/storage.ts) -- same convention as
-- every other Storage-backed table. Nullable: every slot starts with no
-- image, a real, expected, gracefully-handled state (the public page
-- renders a placeholder, never a broken <img>), not an error.
create table public.private_label_images (
  slot text primary key,
  storage_path text,
  updated_at timestamptz not null default now()
);

create trigger private_label_images_set_updated_at
  before update on public.private_label_images
  for each row
  execute function public.set_updated_at();

alter table public.private_label_images enable row level security;

revoke all on public.private_label_images from anon, authenticated;
grant select on public.private_label_images to anon, authenticated;

-- No is_active column, so no active-only filter -- every slot's row is
-- always meant to be publicly readable (same reasoning as
-- site_settings_public_select, 0011 migration).
create policy "private_label_images_public_select"
  on public.private_label_images
  for select
  to anon, authenticated
  using (true);

grant insert, update, delete on public.private_label_images to authenticated;

create policy "private_label_images_admin_all"
  on public.private_label_images
  for all
  to authenticated
  using (true)
  with check (true);

-- service_role grant -- see 0010_service_role_grants.sql's own comment
-- for why every new table needs this stated explicitly.
grant all on public.private_label_images to service_role;

-- Seed the 7 fixed slots with NULL storage_path -- nothing uploaded yet,
-- same "seed keys with NULL, real values entered later via the admin
-- dashboard" discipline as site_settings' own seed (0011 migration).
insert into public.private_label_images (slot, storage_path) values
  ('hero', null),
  ('tile_1', null),
  ('tile_2', null),
  ('tile_3', null),
  ('tile_4', null),
  ('tile_5', null),
  ('tile_6', null)
on conflict (slot) do nothing;
