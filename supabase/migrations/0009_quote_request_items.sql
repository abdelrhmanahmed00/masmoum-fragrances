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
