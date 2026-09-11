-- Prompt 142: Custom Bottle Designer -- Phase C (multi-design requests
-- with customer info). Restructures design_requests from Phase 1's flat
-- shape (0036 migration: one row = one design, one logo, no customer
-- info) into a proper parent/child/grandchild structure: ONE submission
-- (design_requests, the parent) can contain MULTIPLE saved designs
-- (design_request_items, the child -- Phase B's own "My Designs" list,
-- Prompt 141), each of which can have MULTIPLE logos
-- (design_request_item_logos, the grandchild -- Phase A's own
-- multi-logo canvas, Prompt 140).
--
-- TABLE NAME: kept as `design_requests` for the parent, not renamed --
-- per this prompt's own explicit framing ("design_requests becomes the
-- PARENT"). Renaming was considered (it would make "this table used to
-- mean something different" unmistakable from the name alone) but
-- rejected: every existing reference across the codebase (lib/admin/
-- design-requests.ts, the admin list/detail pages, types/admin-design-
-- request.ts, the design-requests Storage bucket's own RLS policies
-- which already reference "design-requests" as a bucket id, unrelated
-- to but easily confused with a renamed table) would need updating for
-- no real safety benefit, since the OLD rows are being intentionally
-- cleared below, not left in place under a reused name where genuine
-- confusion could occur.
--
-- OLD DATA: the table currently holds exactly 2 rows (confirmed via a
-- real query immediately before writing this migration) -- both created
-- during this session's own live testing (Prompts 137-139: one has note
-- "test1", the other has no note at all; neither has ANY customer info,
-- because the OLD schema never captured any). These are genuinely just
-- test data, not real customer inquiries -- and structurally CANNOT be
-- carried forward into the new schema's NOT NULL customer_* columns
-- without fabricating fake customer records, which would be worse than
-- losing 2 known-test rows. Dropped outright below. Their Storage
-- objects (2 composite images + 2 logo images, still sitting in the
-- design-requests bucket) are cleaned up separately via the Storage API
-- after this migration runs, not part of this SQL file.
--
-- The design-requests STORAGE BUCKET itself (and its own RLS policies)
-- is completely untouched by this migration -- it's independent of the
-- database table structure, still the same bucket, same anon-INSERT
-- exception (0036 migration's own comment), same file-naming
-- convention.

drop table if exists public.design_requests cascade;

-- design_requests (parent) -------------------------------------------------
-- One row per submission. customer_name/customer_email/customer_phone/
-- customer_company deliberately reuse quote_requests' own real field
-- shape (0008 migration) for consistency across the two request
-- systems, per this prompt's own explicit instruction -- same names
-- prefixed with customer_ (this table's own rows aren't about a
-- product quote, so a bare "email"/"phone" would be more ambiguous
-- here, worth the extra prefix), same nullability (quote_requests.
-- full_name/email/phone_whatsapp/company_name are ALL not null -- so
-- are these four), same email-format CHECK constraint (identical
-- regex, copied verbatim from 0008's own column definition).
-- country/city/business_type/message are quote_requests' OWN
-- additional fields, deliberately NOT added here -- this prompt's own
-- explicit column list for this table is exactly these four customer_*
-- fields plus status/created_at, not quote_requests' full shape.
--
-- status: plain text with a CHECK constraint (not quote_request_status,
-- the reused enum) -- same "two conceptually distinct request tables
-- should never share a status enum" reasoning the ORIGINAL 0036
-- migration already gave for Phase 1's flat table, restated here since
-- it applies unchanged to the new parent table.

create table public.design_requests (
  id uuid primary key default gen_random_uuid(),
  customer_name text not null,
  customer_email text not null check (customer_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  customer_phone text not null,
  customer_company text not null,
  status text not null default 'new' check (status in ('new', 'contacted', 'closed')),
  created_at timestamptz not null default now()
);

create index design_requests_status_idx on public.design_requests (status);
create index design_requests_created_at_idx on public.design_requests (created_at);

alter table public.design_requests enable row level security;

revoke all on public.design_requests from anon, authenticated;
grant insert on public.design_requests to anon, authenticated;

create policy "design_requests_public_insert"
  on public.design_requests
  for insert
  to anon, authenticated
  with check (status = 'new');

grant select, update on public.design_requests to authenticated;

create policy "design_requests_admin_select"
  on public.design_requests
  for select
  to authenticated
  using (true);

create policy "design_requests_admin_update"
  on public.design_requests
  for update
  to authenticated
  using (true)
  with check (true);

grant all on public.design_requests to service_role;

-- design_request_items (child) ---------------------------------------------
-- One row per SAVED DESIGN within a submission (Phase B's own "My
-- Designs" list, Prompt 141 -- one design = one bottle color + its own
-- logos + its own note). bottle_color: same "no CHECK constraint,
-- validated in application code against BOTTLE_COLOR_SLOTS" reasoning
-- as every other bottle-color-carrying column in this project
-- (bottle_color_images.slot, the OLD design_requests.bottle_color).
-- composite_image_storage_path: not null, same "a design item only
-- ever gets created once its composite has genuinely been generated"
-- reasoning the old flat table's own column had. note: nullable --
-- per-design, matching Phase B's own "note is per-design, not global"
-- restructuring (Prompt 141), not every design carries one.
-- sort_order: preserves the customer's own ordering of their saved
-- designs (the sequence they appear in "My Designs" / will appear in
-- the final submission), an application-assigned integer (array index
-- at submission time), not a DB-computed value.

create table public.design_request_items (
  id uuid primary key default gen_random_uuid(),
  design_request_id uuid not null references public.design_requests (id) on delete cascade,
  bottle_color text not null,
  composite_image_storage_path text not null,
  note text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index design_request_items_design_request_id_idx on public.design_request_items (design_request_id);

alter table public.design_request_items enable row level security;

-- Same "anon INSERT only, no ownership check" shape as
-- quote_request_items (0009 migration) -- anon has no session/user_id
-- concept at all in this project, so a child row's insert can't
-- genuinely be tied back to "the same visitor who created the parent"
-- beyond the fact that they must already know the parent's real id (a
-- random UUID, not enumerable) to reference it -- the identical,
-- already-accepted risk shape quote_request_items has carried since
-- Prompt 9, not a new gap introduced here.
revoke all on public.design_request_items from anon, authenticated;
grant insert on public.design_request_items to anon, authenticated;

create policy "design_request_items_public_insert"
  on public.design_request_items
  for insert
  to anon, authenticated
  with check (true);

-- SELECT only for authenticated -- same "admin views child rows
-- alongside the parent, never edits/removes them independently"
-- reasoning as quote_request_items' own admin policy (0014 migration).
grant select on public.design_request_items to authenticated;

create policy "design_request_items_admin_select"
  on public.design_request_items
  for select
  to authenticated
  using (true);

grant all on public.design_request_items to service_role;

-- design_request_item_logos (grandchild) ------------------------------------
-- One row per LOGO within a saved design (Phase A's own multi-logo
-- canvas, Prompt 140 -- one design item can have several).
-- Deliberately minimal -- exactly the columns this prompt's own spec
-- lists, no created_at: a logo's lifecycle is entirely scoped to its
-- owning design item, nothing here ever needs its own independent
-- "when was this row created" beyond the item's own timestamp.
-- sort_order: preserves the order logos were added within that one
-- design (matching Phase A's own array-order convention), same
-- application-assigned-integer shape as design_request_items.sort_order
-- above.

create table public.design_request_item_logos (
  id uuid primary key default gen_random_uuid(),
  design_request_item_id uuid not null references public.design_request_items (id) on delete cascade,
  logo_storage_path text not null,
  sort_order integer not null default 0
);

create index design_request_item_logos_design_request_item_id_idx on public.design_request_item_logos (design_request_item_id);

alter table public.design_request_item_logos enable row level security;

revoke all on public.design_request_item_logos from anon, authenticated;
grant insert on public.design_request_item_logos to anon, authenticated;

create policy "design_request_item_logos_public_insert"
  on public.design_request_item_logos
  for insert
  to anon, authenticated
  with check (true);

grant select on public.design_request_item_logos to authenticated;

create policy "design_request_item_logos_admin_select"
  on public.design_request_item_logos
  for select
  to authenticated
  using (true);

grant all on public.design_request_item_logos to service_role;
