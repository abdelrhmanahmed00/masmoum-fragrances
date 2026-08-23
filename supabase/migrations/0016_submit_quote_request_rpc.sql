-- Prompt 30: atomic, race-safe stock decrement on quote submission.
--
-- Reverses the explicit design decision recorded in 0015_product_stock_quantity.sql
-- ("nothing in this schema or application code auto-decrements this ...
-- no automatic stock deduction anywhere in this system, by design"). That
-- decision is superseded as of this migration: submitting a quote now DOES
-- decrement stock_quantity, atomically, for every line item whose product
-- tracks stock (stock_quantity is not null).
--
-- Why this has to be a single SQL function instead of the two-step JS
-- insert (quote_requests, then quote_request_items) the app used since
-- Prompt 20: multiple round-trips from application code cannot be made
-- transactional against Supabase's REST API -- there is no way to say
-- "insert this row, decrement these products, and if any of it fails roll
-- all of it back" from two separate .insert() calls. A single plpgsql
-- function body executed via one RPC call runs inside one implicit
-- transaction; an unhandled exception anywhere in it rolls back every
-- statement already run in that same call, which is exactly the
-- all-or-nothing guarantee this feature needs.
--
-- Why the stock decrement itself is race-safe: each line item is applied
-- with a single conditional UPDATE --
--   update products set stock_quantity = stock_quantity - qty
--   where id = ... and stock_quantity >= qty
-- -- rather than a separate "read current stock, check in application
-- code, then write" sequence. The check and the write are the same SQL
-- statement, and Postgres takes a row lock as part of executing that
-- UPDATE, so two concurrent calls decrementing the same product's row
-- are serialized by Postgres itself: the second call's UPDATE simply
-- doesn't start evaluating its own WHERE clause against that row until
-- the first call's transaction has committed or rolled back. There is no
-- window between "check" and "decrement" for a second transaction to
-- interleave, which is precisely the window a naive
-- SELECT-then-UPDATE-in-application-code approach would leave open.
--
-- search_path: research performed for this migration (not assumed) --
-- Supabase's own current guidance (docs.supabase.com/guides/database/functions
-- and supabase/supabase's examples/prompts/database-functions.md, checked
-- 2026-08-17) is to set search_path to the EMPTY string on every function
-- ("Always set search_path to an empty string (set search_path = '';)")
-- and fully qualify every object reference with its schema, rather than
-- pinning search_path to a fixed schema list (e.g. "public, pg_temp").
-- An empty search_path can't be hijacked by an object of the same name
-- created in an earlier-resolving schema, because there is no unqualified
-- resolution happening at all -- every reference below is schema-qualified
-- (public.products, public.quote_requests, public.quote_request_items).
--
-- SECURITY DEFINER: required because anon has no write grant on
-- public.products at all (see 0004_products.sql -- anon has SELECT only,
-- restricted further by RLS to is_active = true rows). This function
-- executes with the privileges of its owner (the migration-running role,
-- effectively postgres), so it can write to products despite the caller
-- being anon. The explicit "grant execute ... to anon" below is what lets
-- anon invoke it; the function body is what does the privileged write.
-- After this migration, calling this function is the ONLY way the anon
-- role can ever modify public.products -- there is no other grant, no
-- other SECURITY DEFINER function, and RLS on products still has no anon
-- write policy of any kind. Confirmed by re-reading 0004_products.sql
-- while designing this migration: it revokes all and grants only select
-- to anon/authenticated, nothing else.

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
  v_current_stock integer;
  v_name_en text;
  v_name_ar text;
begin
  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'At least one item is required';
  end if;

  -- a. Insert the quote_requests row. status is omitted -- its column
  -- default ('new') applies, matching the shape the old app-level insert
  -- always used and mirroring the anon RLS insert policy's
  -- "with check (status = 'new')" (not enforced against this
  -- SECURITY DEFINER function's writes, but respected anyway for
  -- consistency with the rest of the system, not just because RLS
  -- happens not to apply here).
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
    -- ->> on a JSON null yields SQL NULL directly, so an absent/null size
    -- casts cleanly to NULL::uuid with no special-casing needed.
    v_product_size_id := (v_item ->> 'product_size_id')::uuid;
    v_quantity := (v_item ->> 'quantity')::integer;

    if v_product_id is null or v_quantity is null or v_quantity <= 0 then
      raise exception 'Malformed line item';
    end if;

    -- b. Atomic conditional decrement -- single statement, see the
    -- migration header comment for why this is what makes the check and
    -- the write race-safe. Only actually changes a row when stock is
    -- tracked (not null) and sufficient; otherwise 0 rows are affected
    -- and we fall into the diagnostic branch below to work out why.
    update public.products
    set stock_quantity = stock_quantity - v_quantity
    where id = v_product_id
      and stock_quantity is not null
      and stock_quantity >= v_quantity;

    get diagnostics v_updated_rows = row_count;

    if v_updated_rows = 0 then
      -- Disambiguate: product missing, unlimited stock (correctly
      -- skipped -- c.), or genuinely insufficient. This lookup is purely
      -- diagnostic/for the error payload -- it does not decide whether
      -- anything gets written, so it introduces no new race: the atomic
      -- UPDATE above already fully decided that outcome.
      select stock_quantity, name_en, name_ar
        into v_current_stock, v_name_en, v_name_ar
        from public.products
        where id = v_product_id;

      if not found then
        raise exception 'Product % does not exist', v_product_id;
      elsif v_current_stock is not null then
        -- Genuine insufficient stock. Payload is JSON so the calling
        -- application code can parse it reliably regardless of what
        -- characters appear in a product name, rather than parsing a
        -- human-readable sentence.
        raise exception 'INSUFFICIENT_STOCK:%', jsonb_build_object(
          'productId', v_product_id,
          'nameEn', v_name_en,
          'nameAr', v_name_ar,
          'available', v_current_stock,
          'requested', v_quantity
        )::text;
      end if;
      -- else: stock_quantity is null (unlimited) -- c. this row was
      -- correctly excluded by the UPDATE's WHERE clause on purpose, not
      -- a failure. Fall through and insert the line item with no
      -- decrement.
    end if;

    -- d. Insert this line item.
    insert into public.quote_request_items (
      quote_request_id, product_id, product_size_id, quantity
    ) values (
      v_quote_request_id, v_product_id, v_product_size_id, v_quantity
    );
  end loop;

  -- e. Return the new quote_requests.id on success.
  return v_quote_request_id;
end;
$$;

-- The only anon write path onto public.products, by design -- see header.
grant execute on function public.submit_quote_request(
  text, text, text, text, text, text, text, text, jsonb
) to anon, authenticated;
