-- Prompt 33: per-size stock, hybrid with product-level fallback.
--
-- Exact same column/constraint SHAPE as products.stock_quantity (0015) --
-- nullable integer, non-negative-or-null -- for the same reason: null
-- means "no size-specific number set" (falls back to the product-level
-- pool, or unlimited if that's null too, per the precedence rule this
-- prompt implements in lib/stock.ts / the 0018 RPC), not "zero".

alter table public.product_sizes
  add column stock_quantity integer;

alter table public.product_sizes
  add constraint product_sizes_stock_quantity_non_negative
    check (stock_quantity is null or stock_quantity >= 0);
