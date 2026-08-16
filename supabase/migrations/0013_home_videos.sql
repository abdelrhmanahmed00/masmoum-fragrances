-- Storage bucket ("home-videos") + home_videos table for the homepage's
-- circular video row. No seed data — table starts empty on purpose; the
-- VideosSection component (a later step) handles zero rows gracefully.

-- Bucket -------------------------------------------------------------------
-- Only relevant when a row uses storage_path (self-hosted upload) rather
-- than external_url (an existing YouTube/TikTok/Instagram link).
-- file_size_limit in bytes (20971520 = 20MB, reasonable for a short muted
-- loop; way below Supabase Storage's own hard cap but generous enough for
-- 1080p clips a few seconds long).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('home-videos', 'home-videos', true, 20971520, array['video/mp4', 'video/webm'])
on conflict (id) do nothing;

-- storage.objects RLS policy (same reasoning as 0012_storage_and_hero_slides.sql:
-- no table-level revoke/grant on the shared storage.objects table, scope
-- purely via bucket_id in the policy).
create policy "home_videos_public_select"
  on storage.objects
  for select
  to anon, authenticated
  using (bucket_id = 'home-videos');

-- No insert/update/delete policy for anon/authenticated -- absence of a
-- matching policy denies the operation under RLS, same as hero-images.

-- home_videos table ---------------------------------------------------------
-- storage_path / external_url: at least one must be set (a row needs SOME
-- video source), enforced by the check constraint below. Both are nullable
-- individually since a given video uses exactly one path, not both.
-- thumbnail_storage_path is a separate optional poster image, independent
-- of which source type is used.

create table public.home_videos (
  id uuid primary key default gen_random_uuid(),
  storage_path text,
  external_url text,
  thumbnail_storage_path text,
  caption_en text,
  caption_ar text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint home_videos_has_a_source
    check (storage_path is not null or external_url is not null)
);

create index home_videos_is_active_idx on public.home_videos (is_active);
create index home_videos_sort_order_idx on public.home_videos (sort_order);

alter table public.home_videos enable row level security;

revoke all on public.home_videos from anon, authenticated;
grant select on public.home_videos to anon, authenticated;

create policy "home_videos_public_select_active"
  on public.home_videos
  for select
  to anon, authenticated
  using (is_active = true);

-- service_role grant -- see 0010_service_role_grants.sql: granted
-- explicitly upfront (same discipline as 0011/0012).
grant all on public.home_videos to service_role;

-- Future admin policy (NOT created in this migration -- no admin auth
-- exists yet): same pattern as categories (see 0002_categories.sql).
