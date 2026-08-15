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
