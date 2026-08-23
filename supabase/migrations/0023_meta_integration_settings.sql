-- Prompt 47: Meta Pixel + Conversions API integration settings.
--
-- Deliberately NOT added to site_settings (Prompt 6/0011): that table
-- grants `select ... to anon, authenticated using (true)` -- every row is
-- public by design (contact info shown in the Footer). The Meta
-- Conversions API access token is a private server-side secret (same
-- sensitivity class as SUPABASE_SERVICE_ROLE_KEY) -- storing it in
-- site_settings would mean the anon key could read it straight out of the
-- table, a real secret leak. This is a separate table with NO anon grant
-- and NO anon policy at all -- not even a restrictive one, there simply
-- is no anon-facing policy to bypass.
--
-- meta_pixel_id is NOT secret (every site running Meta Pixel embeds it in
-- public page HTML by design -- that's how the browser-side pixel script
-- works at all), so it's fine to live in the same row as the token; the
-- protection this migration adds is scoped to WHO can read the ROW at
-- all, not to hiding one column from another. The public site never
-- reads this table with the anon key regardless -- see lib/meta-pixel.ts's
-- createCachedServiceRoleClient usage for how the pixel ID actually
-- reaches public pages (service-role read, narrow column select).
--
-- Singleton table, not a key-value store like site_settings: there is
-- exactly one Meta integration configuration for the whole site, not an
-- open-ended set of keys. `id boolean primary key default true` + the
-- check constraint below is a standard Postgres singleton-table pattern
-- -- `id` can only ever be `true`, and the primary key uniqueness
-- constraint means at most one row can exist with that value, so the
-- table can never hold more than the one row seeded below. Application
-- code always reads/writes `where id = true` (or just `.maybeSingle()`
-- with no filter, since it's structurally impossible for a second row to
-- exist).

create table public.integration_settings (
  id boolean primary key default true,
  meta_pixel_id text,
  meta_conversions_api_token text,
  updated_at timestamptz not null default now(),
  constraint integration_settings_singleton check (id)
);

create trigger integration_settings_set_updated_at
  before update on public.integration_settings
  for each row
  execute function public.set_updated_at();

-- Row Level Security -------------------------------------------------------
alter table public.integration_settings enable row level security;

-- No grant, no policy for anon at all -- this is the actual protection
-- (RLS with zero permissive policies for a role denies everything to that
-- role by default; the explicit revoke below is belt-and-suspenders,
-- matching this project's existing convention of stating "no access" out
-- loud rather than leaving it implicit -- see e.g. 0008_quote_requests.sql).
revoke all on public.integration_settings from anon, authenticated;

grant select, insert, update, delete on public.integration_settings to authenticated;

create policy "integration_settings_admin_all"
  on public.integration_settings
  for all
  to authenticated
  using (true)
  with check (true);

-- service_role grant -- see 0010_service_role_grants.sql: this project's
-- default privileges do not automatically cover service_role, so every
-- new table needs this granted explicitly. This is also the ONLY way the
-- public site's server-side rendering can ever read meta_pixel_id (there
-- is no anon policy, by design, and the public site has no authenticated
-- admin session) -- see lib/meta-pixel.ts for the narrow, single-column
-- read this grant is actually used for.
grant all on public.integration_settings to service_role;

-- Seed the one row with both values NULL -- nothing configured yet. Every
-- consuming code path (root layout's pixel script, quote submission's
-- CAPI call) must already treat both as optional and render/send nothing
-- when unset -- same graceful-null convention as site_settings.
insert into public.integration_settings (id, meta_pixel_id, meta_conversions_api_token)
values (true, null, null)
on conflict (id) do nothing;
