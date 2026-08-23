-- Prompt 34: admin (authenticated) write access to the product-images
-- Storage bucket -- deferred explicitly in Prompt 21's 0014 migration:
-- "Whether admin image uploads go through the authenticated user's own
-- session (needing a new storage.objects INSERT policy) or through a
-- service-role Server Action (needing none) is a decision for the prompt
-- that actually builds those upload forms."
--
-- Decision: authenticated-session upload, via createSessionClient() --
-- the SAME client every other admin mutation in this project already
-- uses, RLS-governed as `authenticated`, not a service-role client gated
-- by a manual application-layer auth check. Reasoning: every other admin
-- write in this codebase (categories, collections, products, product
-- sizes, quote_requests status) is authorized STRUCTURALLY, by a real
-- Postgres RLS policy scoped `to authenticated` -- there is no other
-- place a write is instead gated by "the Server Action remembered to
-- check the session before using an elevated client." Reaching for
-- service_role here (0010/0011's `createServiceRoleClient`, which
-- bypasses RLS entirely) would make image upload/delete the ONE
-- exception to that pattern, and would put the actual authorization
-- check's correctness on manual code discipline instead of the database
-- enforcing it -- exactly the kind of gap this project has repeatedly
-- preferred to close structurally rather than trust a future edit not to
-- forget (see e.g. Prompt 30's SECURITY DEFINER RPC reasoning, and the
-- general RLS-first posture of every migration since 0002). A new
-- storage.objects policy is a small, well-scoped price for that
-- consistency, and keeps this admin's storage access reasoned about the
-- exact same way as every other table in this project.
--
-- Scoped to bucket_id = 'product-images' only -- the hero-images bucket
-- (0012 migration) still has no write policy for anyone but service_role,
-- unaffected by this migration; a future Hero Slides prompt can make the
-- same choice independently when it actually needs one.
--
-- No UPDATE policy: nothing in this feature ever updates an existing
-- Storage object in place -- every upload gets a fresh, unique path (see
-- lib/admin/product-images.ts's own comment for why, tied to the Prompt 7
-- CDN stale-cache finding), so granting UPDATE would be an unused
-- privilege, not least-privilege.

create policy "product_images_admin_insert"
  on storage.objects
  for insert
  to authenticated
  with check (bucket_id = 'product-images');

create policy "product_images_admin_delete"
  on storage.objects
  for delete
  to authenticated
  using (bucket_id = 'product-images');
