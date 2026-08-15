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
