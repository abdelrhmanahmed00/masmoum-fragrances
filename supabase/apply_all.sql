-- ===========================================================================
-- Masmoum Fragrances — combined schema migration
-- Generated convenience concatenation of supabase/migrations/0001..0011 for
-- pasting into the Supabase SQL Editor in a single run (fresh database only —
-- if 0001-0010 already ran, only paste 0011 to add the new site_settings
-- table). Canonical source of truth: the individual files in
-- supabase/migrations/.
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- migrations/0001_extensions_and_helpers.sql
-- ---------------------------------------------------------------------------
-- Extensions & shared helpers used across the schema.

create extension if not exists pgcrypto;

-- Generic trigger function to keep an `updated_at` column current on every
-- UPDATE. Reused by any table that has an `updated_at` column (currently
-- just products).
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- migrations/0002_categories.sql
-- ---------------------------------------------------------------------------
-- Categories: top-level catalog grouping (Perfumes, Body Mist, ...).
-- Fully dashboard-manageable later — nothing in application code should
-- hardcode this list; it is seeded here only as known starting data.

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name_en text not null,
  name_ar text not null,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index categories_is_active_idx on public.categories (is_active);
create index categories_sort_order_idx on public.categories (sort_order);

-- Row Level Security -------------------------------------------------------
alter table public.categories enable row level security;

-- Table-level grants: anon/authenticated may only ever SELECT for now.
-- INSERT/UPDATE/DELETE are not granted at all — defense in depth on top of
-- the RLS policy itself. A future admin layer adds its own GRANT + policy.
revoke all on public.categories from anon, authenticated;
grant select on public.categories to anon, authenticated;

create policy "categories_public_select_active"
  on public.categories
  for select
  to anon, authenticated
  using (is_active = true);

-- Future admin policy (NOT created in this migration — no admin auth exists
-- yet). Once an admin check exists (e.g. a `profiles.role = 'admin'` column
-- or an `is_admin(uid)` function), add without altering this table:
--
--   grant insert, update, delete on public.categories to authenticated;
--   create policy "categories_admin_all"
--     on public.categories
--     for all
--     to authenticated
--     using (public.is_admin(auth.uid()))
--     with check (public.is_admin(auth.uid()));
--
-- All other catalog tables in this schema (collections, products,
-- product_sizes, product_images, product_collections) follow this exact
-- same pattern — see their own migration files.

-- Seed data ------------------------------------------------------------
-- Known categories. Arabic names are initial working translations — editable
-- later from the dashboard, same as everything else in this table.
insert into public.categories (slug, name_en, name_ar, sort_order) values
  ('perfumes',       'Perfumes',                       'عطور',        1),
  ('body-mist',      'Body Mist',                       'بادي ميست',    2),
  ('hair-mist',      'Hair Mist',                       'هير ميست',     3),
  ('deodorant',      'Deodorant',                       'مزيل التعرق',   4),
  ('roll-on',        'Roll-On',                         'رول أون',      5),
  ('home-fragrance', 'Home Fragrance / Air Freshener',  'معطر المنزل',   6)
on conflict (slug) do nothing;

-- ---------------------------------------------------------------------------
-- migrations/0003_collections.sql
-- ---------------------------------------------------------------------------
-- Collections: optional cross-cutting tags (Luxury Collection, Private
-- Collection, Best Sellers, ...), independent of categories. Many-to-many
-- with products via product_collections (0007). No seed data — created
-- from the dashboard when needed.

create table public.collections (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name_en text not null,
  name_ar text not null,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index collections_is_active_idx on public.collections (is_active);
create index collections_sort_order_idx on public.collections (sort_order);

alter table public.collections enable row level security;

revoke all on public.collections from anon, authenticated;
grant select on public.collections to anon, authenticated;

create policy "collections_public_select_active"
  on public.collections
  for select
  to anon, authenticated
  using (is_active = true);

-- Future admin policy: same pattern as categories (see 0002_categories.sql).

-- ---------------------------------------------------------------------------
-- migrations/0004_products.sql
-- ---------------------------------------------------------------------------
-- Products.

create type public.product_gender as enum ('men', 'women', 'unisex', 'not_applicable');

create table public.products (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  category_id uuid not null references public.categories (id) on delete restrict,
  name_en text not null,
  name_ar text not null,
  description_en text,
  description_ar text,
  -- Mainly meaningful for Perfumes; defaults to not_applicable for
  -- categories where gender doesn't apply (e.g. Home Fragrance).
  gender public.product_gender not null default 'not_applicable',
  -- Fragrance notes are nullable: not every category has them (e.g. Home
  -- Fragrance / Air Freshener may not list top/middle/base notes).
  fragrance_top_notes_en text,
  fragrance_top_notes_ar text,
  fragrance_middle_notes_en text,
  fragrance_middle_notes_ar text,
  fragrance_base_notes_en text,
  fragrance_base_notes_ar text,
  moq integer not null default 1 check (moq > 0),
  is_active boolean not null default true,
  is_featured boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index products_category_id_idx on public.products (category_id);
create index products_is_active_idx on public.products (is_active);
create index products_gender_idx on public.products (gender);
create index products_is_featured_idx on public.products (is_featured);
create index products_sort_order_idx on public.products (sort_order);

create trigger products_set_updated_at
  before update on public.products
  for each row
  execute function public.set_updated_at();

alter table public.products enable row level security;

revoke all on public.products from anon, authenticated;
grant select on public.products to anon, authenticated;

create policy "products_public_select_active"
  on public.products
  for select
  to anon, authenticated
  using (is_active = true);

-- Future admin policy: same pattern as categories (see 0002_categories.sql).

-- ---------------------------------------------------------------------------
-- migrations/0005_product_sizes.sql
-- ---------------------------------------------------------------------------
-- Product sizes: selectable size options within a single product page
-- (e.g. 30ml / 50ml / 100ml) — NOT separate products.

create table public.product_sizes (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  size_label text not null,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (product_id, size_label)
);

create index product_sizes_product_id_idx on public.product_sizes (product_id);
create index product_sizes_is_active_idx on public.product_sizes (is_active);

alter table public.product_sizes enable row level security;

revoke all on public.product_sizes from anon, authenticated;
grant select on public.product_sizes to anon, authenticated;

create policy "product_sizes_public_select_active"
  on public.product_sizes
  for select
  to anon, authenticated
  using (is_active = true);

-- Future admin policy: same pattern as categories (see 0002_categories.sql).

-- ---------------------------------------------------------------------------
-- migrations/0006_product_images.sql
-- ---------------------------------------------------------------------------
-- Product images: Supabase Storage paths (not full URLs) — the public URL
-- is constructed at render time from the bucket + storage_path.

create table public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  storage_path text not null,
  sort_order integer not null default 0,
  is_primary boolean not null default false,
  created_at timestamptz not null default now()
);

create index product_images_product_id_idx on public.product_images (product_id);

-- At most one primary image per product.
create unique index product_images_one_primary_per_product
  on public.product_images (product_id)
  where is_primary;

alter table public.product_images enable row level security;

revoke all on public.product_images from anon, authenticated;
grant select on public.product_images to anon, authenticated;

-- product_images has no is_active column of its own — visibility follows
-- the parent product's is_active flag.
create policy "product_images_public_select_of_active_products"
  on public.product_images
  for select
  to anon, authenticated
  using (
    exists (
      select 1 from public.products p
      where p.id = product_images.product_id
        and p.is_active = true
    )
  );

-- Future admin policy: same pattern as categories (see 0002_categories.sql).

-- ---------------------------------------------------------------------------
-- migrations/0007_product_collections.sql
-- ---------------------------------------------------------------------------
-- product_collections: many-to-many junction between products and
-- collections (optional tagging, e.g. "Best Sellers").

create table public.product_collections (
  product_id uuid not null references public.products (id) on delete cascade,
  collection_id uuid not null references public.collections (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (product_id, collection_id)
);

create index product_collections_collection_id_idx on public.product_collections (collection_id);

alter table public.product_collections enable row level security;

revoke all on public.product_collections from anon, authenticated;
grant select on public.product_collections to anon, authenticated;

-- No is_active column here either — visible only when both linked rows
-- (the product and the collection) are active.
create policy "product_collections_public_select_active"
  on public.product_collections
  for select
  to anon, authenticated
  using (
    exists (
      select 1 from public.products p
      where p.id = product_collections.product_id
        and p.is_active = true
    )
    and exists (
      select 1 from public.collections c
      where c.id = product_collections.collection_id
        and c.is_active = true
    )
  );

-- Future admin policy: same pattern as categories (see 0002_categories.sql).

-- ---------------------------------------------------------------------------
-- migrations/0008_quote_requests.sql
-- ---------------------------------------------------------------------------
-- Quote requests: the submitted wholesale inquiry form. Public may INSERT
-- only — never SELECT/UPDATE/DELETE, so customer data can't be read back
-- with the anon key. Full access is reserved for a future authenticated
-- admin role.
--
-- Client usage note for the future application code: because anon has no
-- SELECT access, the app cannot rely on `.insert().select()` to learn the
-- new row's id (that would need a SELECT grant/policy that doesn't exist).
-- Instead, generate the id client-side (e.g. crypto.randomUUID()) and pass
-- it explicitly on insert, then use that same known id when inserting the
-- matching quote_request_items rows. No schema change is needed for this —
-- `id` has a default but a client-supplied value is accepted like any
-- other column.

create type public.quote_request_status as enum ('new', 'contacted', 'closed');

create table public.quote_requests (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  company_name text not null,
  country text not null,
  city text,
  email text not null check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  phone_whatsapp text not null,
  business_type text,
  message text,
  status public.quote_request_status not null default 'new',
  created_at timestamptz not null default now()
);

create index quote_requests_status_idx on public.quote_requests (status);
create index quote_requests_created_at_idx on public.quote_requests (created_at);

alter table public.quote_requests enable row level security;

-- No SELECT/UPDATE/DELETE granted to anon or authenticated at all — this is
-- the primary protection; the RLS policy below is a second layer on top.
revoke all on public.quote_requests from anon, authenticated;
grant insert on public.quote_requests to anon, authenticated;

create policy "quote_requests_public_insert"
  on public.quote_requests
  for insert
  to anon, authenticated
  with check (status = 'new');

-- Future admin policy (NOT created in this migration — no admin auth exists
-- yet):
--
--   grant select, update on public.quote_requests to authenticated;
--   create policy "quote_requests_admin_select"
--     on public.quote_requests for select to authenticated
--     using (public.is_admin(auth.uid()));
--   create policy "quote_requests_admin_update"
--     on public.quote_requests for update to authenticated
--     using (public.is_admin(auth.uid()))
--     with check (public.is_admin(auth.uid()));
--
-- Deliberately no admin DELETE policy suggested — prefer status = 'closed'
-- over destructively deleting customer inquiry records.

-- ---------------------------------------------------------------------------
-- migrations/0009_quote_request_items.sql
-- ---------------------------------------------------------------------------
-- Quote request line items: product + size + quantity per quote request.

create table public.quote_request_items (
  id uuid primary key default gen_random_uuid(),
  quote_request_id uuid not null references public.quote_requests (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete restrict,
  product_size_id uuid references public.product_sizes (id) on delete set null,
  quantity integer not null check (quantity > 0),
  created_at timestamptz not null default now()
);

create index quote_request_items_quote_request_id_idx on public.quote_request_items (quote_request_id);
create index quote_request_items_product_id_idx on public.quote_request_items (product_id);
create index quote_request_items_product_size_id_idx on public.quote_request_items (product_size_id);

alter table public.quote_request_items enable row level security;

revoke all on public.quote_request_items from anon, authenticated;
grant insert on public.quote_request_items to anon, authenticated;

create policy "quote_request_items_public_insert"
  on public.quote_request_items
  for insert
  to anon, authenticated
  with check (true);

-- Future admin policy: same pattern as quote_requests (see
-- 0008_quote_requests.sql) — SELECT/UPDATE reserved for a future
-- authenticated admin role.

-- ---------------------------------------------------------------------------
-- migrations/0010_service_role_grants.sql
-- ---------------------------------------------------------------------------
-- Explicit grants for service_role.
--
-- Discovered during schema verification: this project's service_role had
-- NO table-level grants on any of these tables (confirmed with a raw HTTP
-- call using the service-role key, not just via supabase-js — got
-- "42501 permission denied for table categories", hint:
-- "GRANT SELECT ON public.categories TO service_role;"). The earlier
-- migrations only explicitly granted anon/authenticated and assumed
-- Supabase's default privileges would cover service_role — that assumption
-- did not hold in this project, so it needs an explicit grant.
--
-- service_role already has the BYPASSRLS role attribute (set by Supabase at
-- the account/infra level, not per-project SQL) — RLS policies never apply
-- to it. Table-level GRANTs are a separate mechanism from RLS/BYPASSRLS and
-- must exist independently, which is what this migration adds.

grant usage on schema public to service_role;

grant all on public.categories to service_role;
grant all on public.collections to service_role;
grant all on public.products to service_role;
grant all on public.product_sizes to service_role;
grant all on public.product_images to service_role;
grant all on public.product_collections to service_role;
grant all on public.quote_requests to service_role;
grant all on public.quote_request_items to service_role;

-- ---------------------------------------------------------------------------
-- migrations/0011_site_settings.sql
-- ---------------------------------------------------------------------------
-- Site settings: a simple key-value store for global, dashboard-editable
-- site content that doesn't belong to a specific catalog table (contact
-- info now; future keys like an about-page blurb could live here too).
--
-- Values are nullable and seeded as NULL — nothing has been entered yet.
-- Consuming code (Footer.tsx) must render nothing for a null value, never
-- the literal word "null" or a broken UI gap. Real values are entered
-- later via the admin dashboard (a future phase) with no code changes
-- needed on the frontend once they're set.

create table public.site_settings (
  key text primary key,
  value_en text,
  value_ar text,
  updated_at timestamptz not null default now()
);

create trigger site_settings_set_updated_at
  before update on public.site_settings
  for each row
  execute function public.set_updated_at();

-- Row Level Security -------------------------------------------------------
alter table public.site_settings enable row level security;

revoke all on public.site_settings from anon, authenticated;
grant select on public.site_settings to anon, authenticated;

-- Unlike the catalog tables, there's no is_active column here — every row
-- in this table is meant to be publicly readable site content.
create policy "site_settings_public_select"
  on public.site_settings
  for select
  to anon, authenticated
  using (true);

-- service_role grant — see 0010_service_role_grants.sql: this project's
-- default privileges do not automatically cover service_role, so every new
-- table needs this granted explicitly.
grant all on public.site_settings to service_role;

-- Future admin policy (NOT created in this migration — no admin auth exists
-- yet): same pattern as categories (see 0002_categories.sql) —
--   grant insert, update, delete on public.site_settings to authenticated;
--   create policy "site_settings_admin_all" ... using (public.is_admin(auth.uid()));

-- Seed keys with NULL values — intentionally not fake/placeholder data.
insert into public.site_settings (key, value_en, value_ar) values
  ('contact_email', null, null),
  ('contact_phone', null, null),
  ('contact_whatsapp', null, null)
on conflict (key) do nothing;

