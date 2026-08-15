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
