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
