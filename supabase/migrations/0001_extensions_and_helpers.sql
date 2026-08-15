-- Extensions & shared helpers used across the schema.

create extension if not exists pgcrypto;

-- Generic trigger function to keep an `updated_at` column current on every
-- UPDATE. Reused by any table that has an `updated_at` column (currently
-- just products).
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
