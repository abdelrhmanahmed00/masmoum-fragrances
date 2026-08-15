-- Site settings: a simple key-value store for global, dashboard-editable
-- site content that doesn't belong to a specific catalog table (contact
-- info now; future keys like an about-page blurb could live here too).
--
-- Values are nullable and seeded as NULL — nothing has been entered yet.
-- Consuming code (Footer.tsx) must render nothing for a null value, never
-- the literal word "null" or a broken UI gap. Real values are entered
-- later via the admin dashboard (a future phase) with no code changes
-- needed on the frontend once they're set.

create table public.site_settings (
  key text primary key,
  value_en text,
  value_ar text,
  updated_at timestamptz not null default now()
);

create trigger site_settings_set_updated_at
  before update on public.site_settings
  for each row
  execute function public.set_updated_at();

-- Row Level Security -------------------------------------------------------
alter table public.site_settings enable row level security;

revoke all on public.site_settings from anon, authenticated;
grant select on public.site_settings to anon, authenticated;

-- Unlike the catalog tables, there's no is_active column here — every row
-- in this table is meant to be publicly readable site content.
create policy "site_settings_public_select"
  on public.site_settings
  for select
  to anon, authenticated
  using (true);

-- service_role grant — see 0010_service_role_grants.sql: this project's
-- default privileges do not automatically cover service_role, so every new
-- table needs this granted explicitly.
grant all on public.site_settings to service_role;

-- Future admin policy (NOT created in this migration — no admin auth exists
-- yet): same pattern as categories (see 0002_categories.sql) —
--   grant insert, update, delete on public.site_settings to authenticated;
--   create policy "site_settings_admin_all" ... using (public.is_admin(auth.uid()));

-- Seed keys with NULL values — intentionally not fake/placeholder data.
insert into public.site_settings (key, value_en, value_ar) values
  ('contact_email', null, null),
  ('contact_phone', null, null),
  ('contact_whatsapp', null, null)
on conflict (key) do nothing;
