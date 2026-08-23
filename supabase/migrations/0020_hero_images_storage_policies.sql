-- Prompt 35: admin (authenticated) write access to the hero-images
-- Storage bucket -- same starting point product-images had before Prompt
-- 34's 0019 migration (Prompt 7 gave hero-images public SELECT only;
-- write access was implicitly service-role-only, no policy for
-- authenticated at all). Confirmed by re-reading 0012 (bucket creation)
-- and 0014 (admin RLS) before writing this: neither one ever added a
-- storage.objects write policy for either bucket -- 0014's own trailing
-- comment says so explicitly ("Not covered by this migration,
-- deliberately: storage.objects write policies for the authenticated
-- role... is a decision for the prompt that actually builds those upload
-- forms").
--
-- Same decision as 0019, same reasoning, not re-litigated here: session-
-- based upload via createSessionClient() (RLS-governed as `authenticated`,
-- structurally enforced), not a service-role client gated by a manual
-- application-layer check -- consistency with every other admin write in
-- this project.
--
-- Scoped to bucket_id = 'hero-images' only -- does not touch
-- product-images' own policies from 0019, and does not grant anything
-- for home-videos (0013's bucket, out of scope for this prompt).
--
-- No UPDATE policy, same reasoning as 0019: every upload (including a
-- slide's image REPLACEMENT on edit) gets a fresh, unique path, never an
-- in-place overwrite (Prompt 7's CDN stale-cache finding) -- so nothing
-- in this feature ever needs to update an existing Storage object.

create policy "hero_images_admin_insert"
  on storage.objects
  for insert
  to authenticated
  with check (bucket_id = 'hero-images');

create policy "hero_images_admin_delete"
  on storage.objects
  for delete
  to authenticated
  using (bucket_id = 'hero-images');
