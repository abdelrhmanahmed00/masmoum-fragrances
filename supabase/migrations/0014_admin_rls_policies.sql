-- Admin RLS policies -- activates what every migration since 0002 left
-- deferred ("Future admin policy (NOT created in this migration — no
-- admin auth exists yet)"). Admin auth now exists (Prompt 21: Supabase
-- Auth email/password, one hand-created account, no self-serve signup).
--
-- Supersedes the exact shape those earlier comments sketched: they
-- anticipated a `public.is_admin(auth.uid())` check (e.g. a future
-- `profiles.role` column). Prompt 21's approved architecture is simpler
-- and is what's actually implemented here: single-admin model,
-- authorization = authentication. There is no self-serve signup (public
-- sign-ups are disabled in the Supabase Dashboard, see the Prompt 21
-- report) and the one account is created by hand — so ANY successfully
-- authenticated session already IS the admin. No roles/permissions table.
-- If this project ever needs multiple admins with different permissions,
-- that's a genuinely new requirement for a future migration, not
-- something to speculatively build now.
--
-- Every table below already has `grant select ... to anon, authenticated`
-- and a public-facing SELECT policy from its own original migration —
-- this migration only adds insert/update/delete. The new "_admin_all"
-- policies use `for all using (true) with check (true))`, which — being
-- an additional PERMISSIVE policy — is OR'd with the existing public
-- SELECT policy for the SELECT command specifically. That's intentional,
-- not a side effect: the admin needs to see inactive/draft rows too
-- (e.g. a product with is_active = false while still being edited), not
-- just what the public storefront shows.

-- Catalog + content tables --------------------------------------------------

grant insert, update, delete on public.categories to authenticated;
create policy "categories_admin_all"
  on public.categories
  for all
  to authenticated
  using (true)
  with check (true);

grant insert, update, delete on public.collections to authenticated;
create policy "collections_admin_all"
  on public.collections
  for all
  to authenticated
  using (true)
  with check (true);

grant insert, update, delete on public.products to authenticated;
create policy "products_admin_all"
  on public.products
  for all
  to authenticated
  using (true)
  with check (true);

grant insert, update, delete on public.product_sizes to authenticated;
create policy "product_sizes_admin_all"
  on public.product_sizes
  for all
  to authenticated
  using (true)
  with check (true);

grant insert, update, delete on public.product_images to authenticated;
create policy "product_images_admin_all"
  on public.product_images
  for all
  to authenticated
  using (true)
  with check (true);

grant insert, update, delete on public.product_collections to authenticated;
create policy "product_collections_admin_all"
  on public.product_collections
  for all
  to authenticated
  using (true)
  with check (true);

grant insert, update, delete on public.hero_slides to authenticated;
create policy "hero_slides_admin_all"
  on public.hero_slides
  for all
  to authenticated
  using (true)
  with check (true);

grant insert, update, delete on public.home_videos to authenticated;
create policy "home_videos_admin_all"
  on public.home_videos
  for all
  to authenticated
  using (true)
  with check (true);

grant insert, update, delete on public.site_settings to authenticated;
create policy "site_settings_admin_all"
  on public.site_settings
  for all
  to authenticated
  using (true)
  with check (true);

-- Quote requests -------------------------------------------------------------
-- SELECT + UPDATE only, deliberately no DELETE -- same reasoning the
-- original 0008 migration's own deferred comment already gave: prefer
-- `status = 'closed'` (the enum from 0008: 'new' | 'contacted' | 'closed')
-- over destructively deleting a customer's inquiry record. UPDATE is
-- granted at the table level (Postgres has no column-level RLS without
-- separate column privileges, which would be more machinery than this
-- needs); in practice the dashboard UI (a later prompt) is expected to
-- only ever change `status`, not rewrite a buyer's submitted contact
-- details, but that's a UI-layer convention, not something this policy
-- itself restricts.

grant select, update on public.quote_requests to authenticated;

create policy "quote_requests_admin_select"
  on public.quote_requests
  for select
  to authenticated
  using (true);

create policy "quote_requests_admin_update"
  on public.quote_requests
  for update
  to authenticated
  using (true)
  with check (true);

-- quote_request_items: SELECT only. These are just line-item records
-- tied to a parent quote_requests row -- the admin views them alongside
-- the request, never edits or removes them independently.

grant select on public.quote_request_items to authenticated;

create policy "quote_request_items_admin_select"
  on public.quote_request_items
  for select
  to authenticated
  using (true);

-- Not covered by this migration, deliberately: storage.objects write
-- policies for the authenticated role (hero-images/product-images/
-- home-videos buckets currently only have public SELECT policies, see
-- 0012/0013). Whether admin image/video uploads go through the
-- authenticated user's own session (needing a new storage.objects INSERT
-- policy) or through a service-role Server Action (needing none) is a
-- decision for the prompt that actually builds those upload forms, not
-- this one -- out of scope for "authentication only."
