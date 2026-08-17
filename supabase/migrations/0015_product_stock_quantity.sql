-- Stock quantity (Prompt 28) -- a new client requirement, not part of the
-- original 0004 products schema. Nullable, no default: null means
-- "unlimited / always available" (the default/expected state for most
-- products, per the client's own framing), a set number means the public
-- site should show availability and "Sold Out" once it reaches 0.
--
-- Purely admin-controlled -- nothing in this schema or application code
-- auto-decrements this from quote_request_items. A submitted quote is an
-- inquiry, not a confirmed sale; there is no automatic stock deduction
-- anywhere in this system, by design.

alter table public.products
  add column stock_quantity integer;

alter table public.products
  add constraint products_stock_quantity_non_negative
    check (stock_quantity is null or stock_quantity >= 0);
