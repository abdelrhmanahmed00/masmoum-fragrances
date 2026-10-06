-- NOT APPLIED. Prepared for review only, per explicit instruction when the
-- home-videos feature was removed from the app (see the prompt that
-- deleted app/admin/(dashboard)/home-videos/, lib/admin/home-videos.ts,
-- components/home/VideosSection.tsx/VideosCarousel.tsx, and the
-- types/home-video*.ts files). The home_videos table, its 3 rows, and the
-- "home-videos" Storage bucket are all left completely untouched in the
-- live database -- this file exists only so the drop is ready to run
-- later if/when the client decides the feature is permanently gone and
-- wants the table and its dead rows (ed5711e6..., 20bf304d..., 23566ced...,
-- all pointing to already-deleted Supabase Storage objects) cleaned up.
--
-- Run this yourself (or ask for it to be applied) only when you're sure --
-- it is NOT reversible without a fresh migration that recreates the table
-- (the 3 existing rows' data would be gone for good; they were already
-- pointing at dead files, so there is no real video content to lose, but
-- the rows' metadata -- ids, captions, timestamps -- would not survive).
--
-- Order matches how 0013/0021 built this up, reversed: drop the
-- storage.objects policies first (0021), then the table (0013, which also
-- drops its own two indexes implicitly), then the bucket itself and its
-- public SELECT policy (also 0013). The home_videos_admin_all policy from
-- 0014 is dropped together with the table (Postgres drops a table's own
-- policies automatically on DROP TABLE, so no separate DROP POLICY is
-- needed for that one -- only the storage.objects policies, which live on
-- a DIFFERENT table and must be dropped explicitly).

-- Storage write policies (0021) -----------------------------------------
drop policy if exists "home_videos_admin_insert" on storage.objects;
drop policy if exists "home_videos_admin_delete" on storage.objects;

-- Storage read policy (0013) ---------------------------------------------
drop policy if exists "home_videos_public_select" on storage.objects;

-- Table (0013) -- policies on the table itself (home_videos_public_select_active,
-- home_videos_admin_all from 0014) are dropped automatically with the table.
drop table if exists public.home_videos;

-- Bucket (0013) -- also removes any remaining objects in it (confirmed
-- empty, 0 objects, before this file was written).
delete from storage.buckets where id = 'home-videos';
