-- Prompt 49: generic, dashboard-managed static content pages (Policy,
-- Private Label now; About/Contact or anything else later, no new code
-- needed for a simple content page after this).
--
-- Same RLS shape as every other admin-managed content table (categories,
-- collections, ...): anon SELECT active-only, no anon write; authenticated
-- full CRUD via the single-admin model (0014 migration's own convention).
--
-- No FK from any other table to pages.id -- confirmed by grep across
-- every migration file before writing this (`grep -rn "references public.pages"
-- supabase/migrations/` -- zero matches, and this table doesn't exist
-- until this migration creates it, so nothing could reference it yet
-- either). This is why lib/admin/pages.ts's delete function (unlike
-- categories/collections, which check for referencing products first)
-- can just delete outright -- there is no dependent-row concern here at
-- all, not just an unlikely one.

create table public.pages (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title_en text not null,
  title_ar text not null,
  content_en text not null default '',
  content_ar text not null default '',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index pages_is_active_idx on public.pages (is_active);

create trigger pages_set_updated_at
  before update on public.pages
  for each row
  execute function public.set_updated_at();

-- Row Level Security -------------------------------------------------------
alter table public.pages enable row level security;

revoke all on public.pages from anon, authenticated;
grant select on public.pages to anon, authenticated;

create policy "pages_public_select_active"
  on public.pages
  for select
  to anon, authenticated
  using (is_active = true);

grant insert, update, delete on public.pages to authenticated;

create policy "pages_admin_all"
  on public.pages
  for all
  to authenticated
  using (true)
  with check (true);

-- service_role grant -- see 0010_service_role_grants.sql's own comment
-- for why every new table needs this stated explicitly.
grant all on public.pages to service_role;

-- Seed two real rows, both active, with EMPTY content -- deliberately not
-- placeholder/fake policy or legal text. The client writes the real
-- content themselves via the admin dashboard (this prompt's own explicit
-- instruction: "do NOT invent real policy/legal text yourself"). Titles
-- are set to sensible real defaults since they're short/structural, not
-- legal content.
insert into public.pages (slug, title_en, title_ar, content_en, content_ar, is_active) values
  ('policy', 'Policy', 'السياسة', '', '', true),
  ('private-label', 'Private Label', 'العلامة الخاصة', '', '', true)
on conflict (slug) do nothing;
