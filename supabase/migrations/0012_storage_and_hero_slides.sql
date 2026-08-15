-- Storage buckets (hero-images, product-images) + hero_slides table.
--
-- Note on storage.objects RLS: unlike our own public-schema tables, we do
-- NOT run revoke/grant table-level privileges on storage.objects here.
-- storage.objects is a single shared system table across every bucket in
-- the project (owned by Supabase's storage service), so revoking its
-- table-level grants would affect ALL buckets, not just these two. The
-- correct, Supabase-documented pattern is to scope access purely through
-- RLS policies filtered by bucket_id, which is what this migration does.
-- RLS is already enabled on storage.objects by Supabase by default.

-- Buckets ---------------------------------------------------------------
-- public = true means objects are servable via the public URL endpoint
-- with no auth needed (see lib/supabase/storage.ts for URL construction).
-- file_size_limit is in bytes (5242880 = 5MB). allowed_mime_types blocks
-- anything other than the three web image formats we actually use.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('hero-images', 'hero-images', true, 5242880, array['image/jpeg', 'image/png', 'image/webp']),
  ('product-images', 'product-images', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

-- storage.objects RLS policies -------------------------------------------
-- Public read (defense in depth on top of public=true, which already
-- serves the public URL endpoint without RLS -- this covers listing /
-- metadata reads through the client library too).
create policy "hero_images_public_select"
  on storage.objects
  for select
  to anon, authenticated
  using (bucket_id = 'hero-images');

create policy "product_images_public_select"
  on storage.objects
  for select
  to anon, authenticated
  using (bucket_id = 'product-images');

-- No insert/update/delete policies for anon/authenticated on either bucket
-- -- with RLS enabled, the absence of a matching policy denies the
-- operation by default (same pattern already used for quote_requests'
-- missing SELECT policy). Write access is effectively service_role-only,
-- which bypasses RLS entirely.

-- hero_slides table -------------------------------------------------------
-- storage_path is the object path within the hero-images bucket, NOT a
-- full URL (see lib/supabase/storage.ts). Table starts empty on purpose --
-- no fake slide data; the Hero UI (a later prompt) must handle zero rows.

create table public.hero_slides (
  id uuid primary key default gen_random_uuid(),
  storage_path text not null,
  headline_en text,
  headline_ar text,
  subheadline_en text,
  subheadline_ar text,
  cta_label_en text,
  cta_label_ar text,
  cta_href text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index hero_slides_is_active_idx on public.hero_slides (is_active);
create index hero_slides_sort_order_idx on public.hero_slides (sort_order);

alter table public.hero_slides enable row level security;

revoke all on public.hero_slides from anon, authenticated;
grant select on public.hero_slides to anon, authenticated;

create policy "hero_slides_public_select_active"
  on public.hero_slides
  for select
  to anon, authenticated
  using (is_active = true);

-- service_role grant -- see 0010_service_role_grants.sql: granted
-- explicitly upfront this time rather than discovered as a bug later.
grant all on public.hero_slides to service_role;

-- Future admin policy (NOT created in this migration -- no admin auth
-- exists yet): same pattern as categories (see 0002_categories.sql).
