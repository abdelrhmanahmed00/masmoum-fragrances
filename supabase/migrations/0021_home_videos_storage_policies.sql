-- Prompt 37: admin (authenticated) write access to the home-videos
-- Storage bucket -- same starting point hero-images had before Prompt
-- 35's 0020 migration (Prompt 10 gave home-videos public SELECT only;
-- write access was implicitly service-role-only). Confirmed by re-reading
-- 0013 (bucket creation) and 0014 (admin RLS) before writing this: 0014
-- already grants `authenticated` full CRUD on the home_videos TABLE
-- (home_videos_admin_all), but neither migration ever added a
-- storage.objects write policy for this bucket.
--
-- Same decision as 0019/0020, same reasoning, not re-litigated: session-
-- based upload via createSessionClient(), RLS-governed as `authenticated`,
-- structurally enforced -- consistency with every other admin write in
-- this project.

create policy "home_videos_admin_insert"
  on storage.objects
  for insert
  to authenticated
  with check (bucket_id = 'home-videos');

create policy "home_videos_admin_delete"
  on storage.objects
  for delete
  to authenticated
  using (bucket_id = 'home-videos');

-- Widen the bucket's allowed_mime_types to also accept image thumbnails.
-- Prompt 10 configured this bucket for video/mp4 + video/webm ONLY, since
-- no thumbnail upload UI existed yet. Confirmed necessary (not assumed)
-- by re-reading VideosCarousel.tsx before building the thumbnail field:
-- the poster IS actually rendered in BOTH video-source branches -- the
-- native <video poster> attribute for uploaded videos, and as the
-- background <Image> behind the play button for external-URL videos --
-- so a thumbnail upload without this change would be rejected by the
-- bucket itself regardless of what the application code allows.
-- file_size_limit (20MB) is untouched -- already far more than enough
-- for a thumbnail image, no reason to raise it just for this.
update storage.buckets
set allowed_mime_types = array['video/mp4', 'video/webm', 'image/jpeg', 'image/png', 'image/webp']
where id = 'home-videos';
