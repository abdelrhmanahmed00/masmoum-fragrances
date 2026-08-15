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
