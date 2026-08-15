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
