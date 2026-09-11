-- Prompt 131: Custom Bottle Designer -- Phase 1 (Foundation). No
-- customer-facing UI yet; this migration only lays down the DB shape
-- Phases 2-5 will build on top of, so later phases need no further
-- migrations for these two tables' own structure.

-- bottle_color_images -----------------------------------------------------
-- Byte-for-byte the same shape as private_label_images (0028 migration):
-- a FIXED set of 5 named slots (the 5 real cap colors -- transparent
-- glass, only the cap color differs across images), not a variable-
-- length admin-creatable list like categories/products. An admin can
-- replace a slot's image, never add/remove a slot itself. Re-read
-- 0028's own table before writing this, reused unchanged: public SELECT,
-- authenticated full CRUD, service_role grant, storage_path nullable
-- (every slot starts with no image, a real graceful-placeholder state,
-- not an error).
--
-- No CHECK constraint on `slot` -- same deliberate choice as
-- private_label_images (see 0029's own comment restating 0028's original
-- reasoning): validation lives in application code
-- (BOTTLE_COLOR_SLOTS, a TypeScript const array), so adding/renaming a
-- color slot later never needs a matching DB migration just to update a
-- constraint.

create table public.bottle_color_images (
  slot text primary key,
  storage_path text,
  updated_at timestamptz not null default now()
);

create trigger bottle_color_images_set_updated_at
  before update on public.bottle_color_images
  for each row
  execute function public.set_updated_at();

alter table public.bottle_color_images enable row level security;

revoke all on public.bottle_color_images from anon, authenticated;
grant select on public.bottle_color_images to anon, authenticated;

create policy "bottle_color_images_public_select"
  on public.bottle_color_images
  for select
  to anon, authenticated
  using (true);

grant insert, update, delete on public.bottle_color_images to authenticated;

create policy "bottle_color_images_admin_all"
  on public.bottle_color_images
  for all
  to authenticated
  using (true)
  with check (true);

grant all on public.bottle_color_images to service_role;

insert into public.bottle_color_images (slot, storage_path) values
  ('yellow', null),
  ('blue', null),
  ('fuchsia', null),
  ('pink', null),
  ('green', null)
on conflict (slot) do nothing;

-- bottle-color-images Storage bucket --------------------------------------
-- Same conventions as every other admin-uploaded image bucket in this
-- project (category-images, perfume-gender-images, ...): public SELECT,
-- authenticated INSERT + DELETE only, no UPDATE (every upload/replacement
-- gets a fresh unique path, Prompt 7's CDN stale-cache finding).

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'bottle-color-images',
  'bottle-color-images',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;

create policy "bottle_color_images_bucket_public_select"
  on storage.objects
  for select
  to anon, authenticated
  using (bucket_id = 'bottle-color-images');

create policy "bottle_color_images_bucket_admin_insert"
  on storage.objects
  for insert
  to authenticated
  with check (bucket_id = 'bottle-color-images');

create policy "bottle_color_images_bucket_admin_delete"
  on storage.objects
  for delete
  to authenticated
  using (bucket_id = 'bottle-color-images');

-- design_requests -----------------------------------------------------
-- Schema built now (Phase 1) so Phases 2-5 (the actual customer-facing
-- designer + submission flow) need no further migration for this
-- table's own shape -- only real application code.
--
-- status: plain text (not a reused/new enum type) per this prompt's own
-- explicit spec -- deliberately NOT sharing quote_request_status (0008
-- migration) across two conceptually distinct request tables (a status
-- enum tying two unrelated tables together means a future status value
-- needed by one silently becomes valid for the other too). Instead: a
-- real CHECK constraint restricting to the SAME 3 values/convention
-- quote_requests already established (new/contacted/closed) -- checked
-- and reused, per this prompt's own instruction, without the type-level
-- coupling.
--
-- bottle_color: plain text, no CHECK against bottle_color_images' 5 real
-- slot values -- same reasoning as bottle_color_images.slot itself
-- having no CHECK constraint (see that table's own comment above):
-- validated in application code against BOTTLE_COLOR_SLOTS instead, so
-- the two stay in sync via one shared TypeScript source of truth rather
-- than a DB constraint that would need its own migration to update.
--
-- logo_storage_path / composite_image_storage_path / bottle_color: NOT
-- NULL -- a design_requests row only ever gets created once a customer
-- has completed the designer flow and both images exist; unlike the
-- admin image-slot tables (which start empty by design), there's no
-- valid "in-progress, some fields missing" state for a SUBMITTED
-- request. `note` is the one genuinely optional field (not every
-- customer leaves one), per this prompt's own explicit spec.
--
-- RLS: byte-for-byte the same "anon INSERT only, no read-back" shape as
-- quote_requests (0008 migration) -- re-read before writing this, reused
-- unchanged: no SELECT/UPDATE/DELETE grant to anon/authenticated at all
-- (the real protection), the INSERT policy itself is a second layer on
-- top, `with check (status = 'new')` blocks a public submission from
-- ever creating a row in any other status. Admin gets select + update
-- (same as quote_requests -- no delete policy either, same "prefer
-- status = 'closed' over destroying a customer record" reasoning
-- restated from that table's own migration comment).

create table public.design_requests (
  id uuid primary key default gen_random_uuid(),
  logo_storage_path text not null,
  composite_image_storage_path text not null,
  bottle_color text not null,
  note text,
  status text not null default 'new' check (status in ('new', 'contacted', 'closed')),
  created_at timestamptz not null default now()
);

create index design_requests_status_idx on public.design_requests (status);
create index design_requests_created_at_idx on public.design_requests (created_at);

alter table public.design_requests enable row level security;

revoke all on public.design_requests from anon, authenticated;
grant insert on public.design_requests to anon, authenticated;

create policy "design_requests_public_insert"
  on public.design_requests
  for insert
  to anon, authenticated
  with check (status = 'new');

grant select, update on public.design_requests to authenticated;

create policy "design_requests_admin_select"
  on public.design_requests
  for select
  to authenticated
  using (true);

create policy "design_requests_admin_update"
  on public.design_requests
  for update
  to authenticated
  using (true)
  with check (true);

grant all on public.design_requests to service_role;

-- design-requests Storage bucket -------------------------------------------
-- The ONE deliberate exception in this project's Storage policies: real
-- anon INSERT, scoped tightly to this bucket alone (every policy below
-- filters on `bucket_id = 'design-requests'`, the same bucket-scoping
-- mechanism already used to keep every other bucket's policies from
-- leaking into one another -- this doesn't grant anon write access
-- anywhere else, confirmed by construction: a `bucket_id = 'design-
-- requests'` check can never match an object in any other bucket).
-- Needed because this bucket holds CUSTOMER-uploaded content (their
-- background-removed logo) and the server-generated composite preview,
-- created during an anonymous designer session -- unlike every other
-- image bucket in this project, which is exclusively admin-uploaded
-- content via an authenticated session. No anon UPDATE or DELETE granted
-- -- a visitor can add their own design's files, never modify or remove
-- ANY object (their own or anyone else's) once uploaded, matching
-- quote_requests' own "anon can create, never touch existing rows"
-- shape at the Storage layer too.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'design-requests',
  'design-requests',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;

create policy "design_requests_bucket_public_select"
  on storage.objects
  for select
  to anon, authenticated
  using (bucket_id = 'design-requests');

create policy "design_requests_bucket_anon_insert"
  on storage.objects
  for insert
  to anon, authenticated
  with check (bucket_id = 'design-requests');

create policy "design_requests_bucket_admin_delete"
  on storage.objects
  for delete
  to authenticated
  using (bucket_id = 'design-requests');
