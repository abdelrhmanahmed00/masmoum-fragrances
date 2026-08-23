-- Prompt 48 (final sign-off, adversarial security testing): real bug
-- found and fixed. submit_quote_request (0016, replaced by 0018) resolved
-- a line item's product_size_id by ID ALONE:
--
--   select stock_quantity, size_label
--     into v_size_stock, v_size_label
--     from public.product_sizes
--     where id = v_product_size_id;
--
-- -- with no check that the resolved size row's own product_id actually
-- matches the item's product_id. Confirmed exploitable, not just
-- theoretical: a scratch test submitted product_id = <test2's id> paired
-- with product_size_id = <a real size belonging to a DIFFERENT product,
-- "Verification Test Perfume">. The RPC happily resolved that unrelated
-- size's stock/label and would have (a) decremented the WRONG product's
-- size-level stock, and (b) persisted a quote_request_items row whose
-- product_id and product_size_id don't actually belong together --
-- exactly the "Product A, Size: <B's size label>" corruption a fulfilling
-- admin would see on the quote-requests detail page (Prompt 46), with no
-- way to tell it happened. This can only be triggered by a maliciously
-- crafted request (the real UI never constructs a mismatched pair -- size
-- options are always rendered from the SAME product's own sizes array,
-- ProductPurchasePanel.tsx) -- but the server had no defense of its own
-- against one, which is exactly what this migration closes.
--
-- create or replace on the same name+signature as 0018 -- migrations are
-- historical record, 0018 is left untouched (same established rule cited
-- in its own header comment).

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

  -- a. Insert the quote_requests row -- unchanged from 0016/0018.
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

    -- Resolve the product's own stock + name -- unchanged from 0018.
    select stock_quantity, name_en, name_ar
      into v_product_stock, v_name_en, v_name_ar
      from public.products
      where id = v_product_id;

    if not found then
      raise exception 'Product % does not exist', v_product_id;
    end if;

    -- Resolve the size's own stock, if a size was specified -- THE FIX:
    -- `and product_id = v_product_id` added to this WHERE clause. A
    -- product_size_id that doesn't exist at all, OR that exists but
    -- belongs to a DIFFERENT product, both now fail this lookup
    -- identically (Postgres's implicit FOUND is false either way) --
    -- treated the same as "no size was specified" below, exactly the
    -- existing graceful-fallback philosophy this function already used
    -- for a genuinely nonexistent id (see 0018's own comment), just now
    -- correctly extended to cover a mismatched-but-real id too.
    v_size_stock := null;
    v_size_label := null;
    if v_product_size_id is not null then
      select stock_quantity, size_label
        into v_size_stock, v_size_label
        from public.product_sizes
        where id = v_product_size_id
          and product_id = v_product_id;

      if not found then
        -- Normalize to null BEFORE both the stock-resolution branch below
        -- and the quote_request_items INSERT at the end of this loop --
        -- this is what actually prevents the mismatched pair from ever
        -- being persisted, not just from governing the wrong stock pool.
        v_product_size_id := null;
      end if;
    end if;

    if v_size_stock is not null then
      -- b/precedence step 1: size-level override governs this item --
      -- unchanged from 0018.
      update public.product_sizes
      set stock_quantity = stock_quantity - v_quantity
      where id = v_product_size_id
        and stock_quantity is not null
        and stock_quantity >= v_quantity;

      get diagnostics v_updated_rows = row_count;

      if v_updated_rows = 0 then
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
      -- precedence step 2: product-level pool governs -- unchanged from
      -- 0018.
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

    -- d. Insert this line item -- v_product_size_id is now guaranteed to
    -- be either a real size that actually belongs to v_product_id, or
    -- null. The FK on product_size_id (0009, ON DELETE SET NULL) remains
    -- the backstop for a genuinely nonexistent id; this fix is what
    -- makes it also the backstop for a mismatched-but-real one.
    insert into public.quote_request_items (
      quote_request_id, product_id, product_size_id, quantity
    ) values (
      v_quote_request_id, v_product_id, v_product_size_id, v_quantity
    );
  end loop;

  -- e. Return the new quote_requests.id on success -- unchanged.
  return v_quote_request_id;
end;
$$;

-- Re-stated for a self-contained migration -- see 0018's own comment for
-- why (CREATE OR REPLACE preserves existing grants automatically; this
-- just keeps the migration runnable standalone).
grant execute on function public.submit_quote_request(
  text, text, text, text, text, text, text, text, jsonb
) to anon, authenticated;
