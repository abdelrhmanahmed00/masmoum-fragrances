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
