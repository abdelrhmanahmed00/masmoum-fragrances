-- Prompt 33: submit_quote_request v2 -- resolves stock per the hybrid
-- size/product precedence rule (0017 migration) instead of always
-- decrementing products.stock_quantity directly.
--
-- New migration, not a hand-edit of 0016 -- migrations are historical
-- record (established rule, e.g. Prompt 27's delete investigation kept
-- 0009 untouched, Prompt 30 kept 0015 untouched). create or replace on
-- the SAME name + parameter signature as 0016 -- no application code
-- (lib/quote-request-submission.ts's supabase.rpc(...) call) needs to
-- change what it calls, only how the JSON error payload it might get
-- back is shaped (see that file's own updated comment).
--
-- Precedence, mirrored exactly from lib/stock.ts's resolveAvailableStock
-- (side by side, verify these agree -- see the Prompt 33 report):
--
--   TypeScript (lib/stock.ts):
--     if (sizeStockQuantity !== null) return sizeStockQuantity;
--     if (productStockQuantity !== null) return productStockQuantity;
--     return null;
--
--   plpgsql (this migration, per line item):
--     if v_size_stock is not null then       -- decrement product_sizes
--     elsif v_product_stock is not null then -- decrement products
--     end if;                                -- else: unlimited, skip
--
-- The RPC doesn't call resolveAvailableStock's "return a number" shape
-- directly -- it needs to know WHICH TABLE/ROW to conditionally decrement,
-- not just the resolved number -- but the branching condition (size
-- override present? else product-level present? else unlimited) is the
-- identical three-way precedence, applied to decide the decrement target
-- instead of a display value.
--
-- Critical multi-item shared-pool case (task's own point 3): two line
-- items for the same product, different sizes, NEITHER with its own
-- stock_quantity -- both draw from products.stock_quantity. Processing
-- items sequentially inside ONE transaction handles this correctly with
-- no special-casing: the second item's conditional UPDATE re-reads
-- products.stock_quantity fresh when it runs, which already reflects the
-- first item's decrement from earlier in this SAME transaction (ordinary
-- read-your-own-writes semantics, not a subtlety of THIS migration -- the
-- same mechanism 0016 already relied on for a single row across multiple
-- items of the same product). Verified for real, not just reasoned about,
-- in the Prompt 33 report -- see the "shared-pool double-decrement" test.
--
-- Race safety across the more complex resolution: unchanged mechanism
-- from 0016 -- each decrement is still ONE atomic conditional UPDATE
-- (`... WHERE id = ... AND stock_quantity >= qty`), now against whichever
-- table the precedence resolved to for that item. Postgres's row lock
-- during that UPDATE still serializes concurrent callers against the
-- SAME row (product_sizes.id or products.id, whichever applies) exactly
-- as before -- re-verified for the shared-product-level-pool case
-- specifically in the Prompt 33 report's concurrency test, not assumed
-- to still hold just because the single-size case was already proven.

create or replace function public.submit_quote_request(
  p_full_name text,
  p_company_name text,
  p_country text,
  p_city text,
  p_email text,
  p_phone_whatsapp text,
  p_business_type text,
  p_message text,
  p_items jsonb -- array of {product_id, product_size_id, quantity}
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_quote_request_id uuid := gen_random_uuid();
  v_item jsonb;
  v_product_id uuid;
  v_product_size_id uuid;
  v_quantity integer;
  v_updated_rows integer;
  v_product_stock integer;
  v_size_stock integer;
  v_size_label text;
  v_name_en text;
  v_name_ar text;
begin
  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'At least one item is required';
  end if;

  -- a. Insert the quote_requests row -- unchanged from 0016.
  insert into public.quote_requests (
    id, full_name, company_name, country, city, email, phone_whatsapp,
    business_type, message
  ) values (
    v_quote_request_id, p_full_name, p_company_name, p_country, p_city,
    p_email, p_phone_whatsapp, p_business_type, p_message
  );

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_product_id := (v_item ->> 'product_id')::uuid;
    v_product_size_id := (v_item ->> 'product_size_id')::uuid;
    v_quantity := (v_item ->> 'quantity')::integer;

    if v_product_id is null or v_quantity is null or v_quantity <= 0 then
      raise exception 'Malformed line item';
    end if;

    -- Resolve the product's own stock + name (needed regardless of which
    -- pool ends up governing -- name for the error payload, stock for the
    -- fallback branch below).
    select stock_quantity, name_en, name_ar
      into v_product_stock, v_name_en, v_name_ar
      from public.products
      where id = v_product_id;

    if not found then
      raise exception 'Product % does not exist', v_product_id;
    end if;

    -- Resolve the size's own stock, if a size was specified. A
    -- non-existent product_size_id (deleted between page load and
    -- submit) is deliberately NOT specially handled here -- v_size_stock
    -- simply stays null (falls through to the product-level branch,
    -- exactly like "no override set"), and the quote_request_items
    -- INSERT below's own FK constraint is the real backstop that catches
    -- a genuinely invalid id, same division of responsibility 0016
    -- already used (DB constraints are the backstop, not re-implemented
    -- here).
    v_size_stock := null;
    v_size_label := null;
    if v_product_size_id is not null then
      select stock_quantity, size_label
        into v_size_stock, v_size_label
        from public.product_sizes
        where id = v_product_size_id;
    end if;

    if v_size_stock is not null then
      -- b/precedence step 1: size-level override governs this item,
      -- independent of the product-level number. Same atomic conditional
      -- UPDATE pattern as 0016 -- the check and the write are one
      -- statement, so Postgres's row lock on THIS product_sizes row is
      -- what makes concurrent decrements of the same size race-safe.
      update public.product_sizes
      set stock_quantity = stock_quantity - v_quantity
      where id = v_product_size_id
        and stock_quantity is not null
        and stock_quantity >= v_quantity;

      get diagnostics v_updated_rows = row_count;

      if v_updated_rows = 0 then
        -- Re-select fresh rather than reuse the earlier snapshot -- under
        -- real concurrency a different transaction could have changed
        -- this row between that SELECT and this UPDATE (the atomic
        -- UPDATE's own WHERE clause is what's actually safe here; this
        -- re-select only makes the error message's "available" accurate).
        select stock_quantity into v_size_stock
          from public.product_sizes where id = v_product_size_id;

        raise exception 'INSUFFICIENT_STOCK:%', jsonb_build_object(
          'productId', v_product_id,
          'productSizeId', v_product_size_id,
          'pool', 'size',
          'nameEn', v_name_en,
          'nameAr', v_name_ar,
          'sizeLabel', v_size_label,
          'available', v_size_stock,
          'requested', v_quantity
        )::text;
      end if;

    elsif v_product_stock is not null then
      -- precedence step 2: product-level pool governs -- SHARED across
      -- every size in this same request that has no override of its own.
      -- Sequential processing within this one transaction is what makes
      -- a second item drawing from this same pool see the first item's
      -- decrement already applied (read-your-own-writes) -- verified for
      -- real in the Prompt 33 report, not just asserted here.
      update public.products
      set stock_quantity = stock_quantity - v_quantity
      where id = v_product_id
        and stock_quantity is not null
        and stock_quantity >= v_quantity;

      get diagnostics v_updated_rows = row_count;

      if v_updated_rows = 0 then
        select stock_quantity into v_product_stock
          from public.products where id = v_product_id;

        raise exception 'INSUFFICIENT_STOCK:%', jsonb_build_object(
          'productId', v_product_id,
          'productSizeId', v_product_size_id,
          'pool', 'product',
          'nameEn', v_name_en,
          'nameAr', v_name_ar,
          'sizeLabel', v_size_label,
          'available', v_product_stock,
          'requested', v_quantity
        )::text;
      end if;
    end if;
    -- else (v_size_stock is null and v_product_stock is null):
    -- precedence step 3, unlimited -- skip the decrement entirely.

    -- d. Insert this line item -- unchanged from 0016. The FK on
    -- product_size_id (0009, ON DELETE SET NULL) is what would catch a
    -- genuinely nonexistent size id here, aborting the whole transaction
    -- via an unhandled exception exactly like every other failure path.
    insert into public.quote_request_items (
      quote_request_id, product_id, product_size_id, quantity
    ) values (
      v_quote_request_id, v_product_id, v_product_size_id, v_quantity
    );
  end loop;

  -- e. Return the new quote_requests.id on success -- unchanged from 0016.
  return v_quote_request_id;
end;
$$;

-- Re-stated for a self-contained migration -- CREATE OR REPLACE on the
-- same name+signature preserves existing grants automatically, this
-- isn't strictly required, but keeps 0018 runnable standalone without
-- depending on remembering 0016 already ran this.
grant execute on function public.submit_quote_request(
  text, text, text, text, text, text, text, text, jsonb
) to anon, authenticated;
