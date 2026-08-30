-- Prompt 86 (Phase A) -- "Brand" taxonomy: a distinct concept from
-- Category (Perfumes/Body Mist/...) and Collection (Luxury/Best Sellers/
-- ...). Admin-manageable list of brand names, optionally assignable to a
-- product. This migration is Phase A only (DB + admin CRUD + product
-- assignment) -- no public-facing display yet (that's Phase B, a later
-- migration/prompt). Purely additive: does not alter any existing table's
-- columns, policies, or data beyond adding one new nullable column to
-- products.
--
-- Same shape/conventions as categories (0002 migration) for the table
-- itself and its RLS -- not a new pattern, the exact established one:
-- anon SELECT active-only, no anon write, authenticated full CRUD
-- (0014 migration's single-admin convention), explicit service_role grant
-- (0010 migration's own documented reason every new table needs this
-- stated -- Supabase's default privileges don't cover service_role in
-- this project). created_at/updated_at + a set_updated_at trigger, same
-- as the more recently added tables (pages, 0025) rather than categories'
-- own older created_at-only shape -- this project's own newest convention,
-- not categories' original one.

create table public.brands (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name_en text not null,
  name_ar text not null,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index brands_is_active_idx on public.brands (is_active);
create index brands_sort_order_idx on public.brands (sort_order);

create trigger brands_set_updated_at
  before update on public.brands
  for each row
  execute function public.set_updated_at();

-- Row Level Security -------------------------------------------------------
alter table public.brands enable row level security;

revoke all on public.brands from anon, authenticated;
grant select on public.brands to anon, authenticated;

create policy "brands_public_select_active"
  on public.brands
  for select
  to anon, authenticated
  using (is_active = true);

grant insert, update, delete on public.brands to authenticated;

create policy "brands_admin_all"
  on public.brands
  for all
  to authenticated
  using (true)
  with check (true);

-- service_role grant -- see 0010_service_role_grants.sql's own comment
-- for why every new table needs this stated explicitly.
grant all on public.brands to service_role;

-- Product assignment ---------------------------------------------------
-- Nullable, ON DELETE SET NULL -- deliberately NOT category_id's shape
-- (`not null ... on delete restrict`, 0004 migration). A product must
-- never be blocked from having its brand removed, and must never be
-- deleted or broken if the brand row itself is deleted -- unassigned
-- (NULL) is a fully valid, expected state, not an error condition, per
-- this prompt's own explicit requirement. This is also why
-- lib/admin/brands.ts's deleteBrand needs none of categories.ts's
-- deleteCategory "is this in use?" pre-check dance -- SET NULL means a
-- brand delete can never be blocked by a product referencing it, it just
-- clears the reference.
--
-- Existing rows: brand_id is added with no default-changing backfill --
-- every current product row gets NULL automatically (ADD COLUMN with no
-- literal default backfills NULL for existing rows), which is exactly
-- "no brand assigned yet," the correct and only sensible starting state.
-- Zero existing functionality changes as a result of this column existing.
alter table public.products
  add column brand_id uuid references public.brands (id) on delete set null;

create index products_brand_id_idx on public.products (brand_id);
