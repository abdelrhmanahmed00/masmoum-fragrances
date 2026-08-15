-- Explicit grants for service_role.
--
-- Discovered during schema verification: this project's service_role had
-- NO table-level grants on any of these tables (confirmed with a raw HTTP
-- call using the service-role key, not just via supabase-js — got
-- "42501 permission denied for table categories", hint:
-- "GRANT SELECT ON public.categories TO service_role;"). The earlier
-- migrations only explicitly granted anon/authenticated and assumed
-- Supabase's default privileges would cover service_role — that assumption
-- did not hold in this project, so it needs an explicit grant.
--
-- service_role already has the BYPASSRLS role attribute (set by Supabase at
-- the account/infra level, not per-project SQL) — RLS policies never apply
-- to it. Table-level GRANTs are a separate mechanism from RLS/BYPASSRLS and
-- must exist independently, which is what this migration adds.

grant usage on schema public to service_role;

grant all on public.categories to service_role;
grant all on public.collections to service_role;
grant all on public.products to service_role;
grant all on public.product_sizes to service_role;
grant all on public.product_images to service_role;
grant all on public.product_collections to service_role;
grant all on public.quote_requests to service_role;
grant all on public.quote_request_items to service_role;
