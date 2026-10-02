-- Prompt 190: dual image sizes at upload time -- a real, code-only lever
-- against the Supabase cached-egress-quota problem (Prompts 179-184's
-- outage), now that the Cloudflare cache-proxy approach (Prompt 183) is
-- abandoned (the account that manages the DNS is inaccessible). Every grid/
-- listing/tile context (product cards, category tiles, the product
-- gallery's own thumbnail strip, quote cart line items) was shipping the
-- SAME full ~1600px file a detail view needs, to every visitor, on every
-- page that shows many of them at once -- the single biggest real lever
-- available without touching Vercel or any external service, since
-- next.config.ts's `unoptimized: true` (Prompt 177/178, permanent) means
-- no server-side resizing happens anywhere else in this pipeline.
--
-- A second NULLABLE column on each existing image-bearing row, not a
-- separate "thumbnails" table or renaming the existing column -- same
-- "belongs directly on the row it describes" reasoning as 0033's own
-- comment for image_storage_path. Nullable and additive: every row
-- uploaded before this prompt keeps thumbnail_storage_path = null and
-- every read call site falls back to the existing full-size path when it's
-- null (see lib/catalog.ts), so this never breaks an existing image --
-- the thumbnail benefit only applies going forward, to uploads made after
-- this migration + the matching code change ship.
--
-- Scoped to product_images and categories specifically -- the two tables
-- whose images actually render in a many-at-once grid/tile context
-- (confirmed by reading every real call site, not assumed: ProductCard.tsx
-- at 25-50vw per card, CategoryTemplatesStrip.tsx at ~128-176px tiles).
-- hero_slides/private_label_images/bottle_color_images/
-- perfume_gender_images are each single-instance or few-instance displays
-- (a hero carousel, a handful of named marketing slots, one swatch per
-- color) -- real images, but never repeated dozens-at-once on one page the
-- way product/category grids are, so they're deliberately left out of this
-- prompt's scope rather than widened without evidence of the same cost.

alter table public.product_images
  add column thumbnail_storage_path text;

alter table public.categories
  add column thumbnail_storage_path text;

-- No index needed on either -- same as image_storage_path (0033) and
-- storage_path (0006): never filtered/ordered on, only selected alongside
-- the row's other fields.

-- No RLS/grant changes needed -- both columns are covered by their table's
-- existing policies the exact same way image_storage_path already is (see
-- 0033's own comment for the full reasoning: a plain `using (...)`/
-- `with check (true)` policy with no column list already covers any new
-- column on an already-covered table).
