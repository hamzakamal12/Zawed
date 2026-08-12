-- =====================================================================
-- Zawed Supply — B2B office-supplies e-procurement platform (Sudan)
-- Migration 1/3 : schema (types, tables, indexes, numbering, audit)
-- Target: Supabase / PostgreSQL 15+
-- =====================================================================

create extension if not exists pgcrypto;      -- gen_random_uuid()
create extension if not exists unaccent;       -- diacritic-tolerant search

-- ---------------------------------------------------------------------
-- Enumerated types
-- ---------------------------------------------------------------------
do $$ begin
  create type company_type        as enum ('ngo','corporate','government','sme');
  create type currency_code       as enum ('SDG','USD');
  create type user_role           as enum ('admin','sales','warehouse','customer_admin','customer_requester');
  create type product_unit        as enum ('piece','box','ream','carton','kg','liter');
  create type fx_source           as enum ('manual','parallel_market','central_bank');
  create type quotation_status    as enum ('draft','sent','accepted','rejected','expired');
  create type order_status        as enum ('pending_approval','confirmed','picking','out_for_delivery','delivered','cancelled');
  create type invoice_status      as enum ('unpaid','partially_paid','paid','overdue');
  create type payment_method      as enum ('bank_transfer','bankak','fawry','cash','cheque');
  create type recurring_frequency as enum ('weekly','monthly','quarterly');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------
-- updated_at helper
-- ---------------------------------------------------------------------
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

-- ---------------------------------------------------------------------
-- companies
-- ---------------------------------------------------------------------
create table if not exists companies (
  id                 uuid primary key default gen_random_uuid(),
  name_ar            text not null,
  name_en            text,
  type               company_type not null default 'sme',
  tax_id             text,
  billing_address    text,
  default_currency   currency_code not null default 'SDG',
  payment_terms_days int not null default 30,
  credit_limit       numeric(14,2) not null default 0,
  requires_po_number boolean not null default false,
  is_active          boolean not null default true,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- profiles (1:1 with auth.users)
-- ---------------------------------------------------------------------
create table if not exists profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  full_name  text,
  phone      text,
  role       user_role not null default 'customer_requester',
  company_id uuid references companies(id) on delete set null,
  is_active  boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_profiles_company on profiles(company_id);
create index if not exists idx_profiles_role    on profiles(role);

-- ---------------------------------------------------------------------
-- categories
-- ---------------------------------------------------------------------
create table if not exists categories (
  id         uuid primary key default gen_random_uuid(),
  name_ar    text not null,
  name_en    text,
  sort_order int not null default 0,
  icon       text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- products
-- ---------------------------------------------------------------------
create table if not exists products (
  id             uuid primary key default gen_random_uuid(),
  sku            text unique not null,
  name_ar        text not null,
  name_en        text,
  category_id    uuid references categories(id) on delete set null,
  unit           product_unit not null default 'piece',
  units_per_pack int not null default 1,
  image_url      text,
  description_ar text,
  is_active      boolean not null default true,
  min_order_qty  int not null default 1,
  lead_time_days int not null default 0,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index if not exists idx_products_category on products(category_id);
create index if not exists idx_products_active   on products(is_active);
-- IMMUTABLE unaccent wrapper (required to use unaccent in an index expression)
create or replace function f_unaccent(text)
returns text language sql immutable strict parallel safe as $$
  select public.unaccent('public.unaccent', $1)
$$;
-- diacritic-insensitive Arabic/English search
create index if not exists idx_products_search on products
  using gin (to_tsvector('simple', f_unaccent(coalesce(name_ar,'') || ' ' || coalesce(name_en,'') || ' ' || sku)));

-- ---------------------------------------------------------------------
-- product_prices  (never store a final SDG price — cost + margin only)
-- ---------------------------------------------------------------------
create table if not exists product_prices (
  id             uuid primary key default gen_random_uuid(),
  product_id     uuid not null references products(id) on delete cascade,
  cost_usd       numeric(12,4) not null,
  margin_percent numeric(6,2) not null default 0,
  effective_from timestamptz not null default now(),
  effective_to   timestamptz,
  created_by     uuid references profiles(id) on delete set null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index if not exists idx_product_prices_lookup
  on product_prices(product_id, effective_from desc);

-- ---------------------------------------------------------------------
-- fx_rates  (latest active row wins)
-- ---------------------------------------------------------------------
create table if not exists fx_rates (
  id               uuid primary key default gen_random_uuid(),
  rate_sdg_per_usd numeric(14,4) not null,
  source           fx_source not null default 'manual',
  effective_from   timestamptz not null default now(),
  created_by       uuid references profiles(id) on delete set null,
  created_at       timestamptz not null default now()
);
create index if not exists idx_fx_rates_effective on fx_rates(effective_from desc);

-- ---------------------------------------------------------------------
-- price_tiers  (negotiated / volume discounts)
-- ---------------------------------------------------------------------
create table if not exists price_tiers (
  id               uuid primary key default gen_random_uuid(),
  company_id       uuid references companies(id) on delete cascade,   -- null = all companies
  product_id       uuid references products(id)  on delete cascade,   -- null = all products
  min_qty          int not null default 1,
  discount_percent numeric(6,2) not null default 0,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index if not exists idx_price_tiers_product on price_tiers(product_id);
create index if not exists idx_price_tiers_company on price_tiers(company_id);

-- ---------------------------------------------------------------------
-- inventory
-- ---------------------------------------------------------------------
create table if not exists inventory (
  id                 uuid primary key default gen_random_uuid(),
  product_id         uuid not null unique references products(id) on delete cascade,
  qty_on_hand        int not null default 0,
  qty_reserved       int not null default 0,
  reorder_point      int not null default 0,
  warehouse_location text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- quotations
-- ---------------------------------------------------------------------
create table if not exists quotations (
  id                uuid primary key default gen_random_uuid(),
  quote_number      text unique,
  company_id        uuid not null references companies(id) on delete restrict,
  created_by        uuid references profiles(id) on delete set null,
  status            quotation_status not null default 'draft',
  currency          currency_code not null default 'SDG',
  fx_rate_snapshot  numeric(14,4),
  valid_until       timestamptz not null default (now() + interval '7 days'),
  subtotal          numeric(14,2) not null default 0,
  vat_percent       numeric(6,2)  not null default 0,
  vat_amount        numeric(14,2) not null default 0,
  total             numeric(14,2) not null default 0,
  notes_ar          text,
  terms_ar          text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index if not exists idx_quotations_company on quotations(company_id, status);

create table if not exists quotation_items (
  id                  uuid primary key default gen_random_uuid(),
  quotation_id        uuid not null references quotations(id) on delete cascade,
  product_id          uuid not null references products(id) on delete restrict,
  qty                 int not null check (qty > 0),
  unit_price_snapshot numeric(14,2) not null,
  line_total          numeric(14,2) not null,
  created_at          timestamptz not null default now()
);
create index if not exists idx_quotation_items_q on quotation_items(quotation_id);

-- ---------------------------------------------------------------------
-- orders
-- ---------------------------------------------------------------------
create table if not exists orders (
  id                     uuid primary key default gen_random_uuid(),
  order_number           text unique,
  company_id             uuid not null references companies(id) on delete restrict,
  quotation_id           uuid references quotations(id) on delete set null,
  po_number              text,
  status                 order_status not null default 'pending_approval',
  currency               currency_code not null default 'SDG',
  fx_rate_snapshot       numeric(14,4),
  subtotal               numeric(14,2) not null default 0,
  vat_amount             numeric(14,2) not null default 0,
  total                  numeric(14,2) not null default 0,
  delivery_address       text,
  requested_delivery_date date,
  delivered_at           timestamptz,
  created_by             uuid references profiles(id) on delete set null,
  approved_by            uuid references profiles(id) on delete set null,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);
create index if not exists idx_orders_company on orders(company_id, status);
create index if not exists idx_orders_status  on orders(status);

create table if not exists order_items (
  id                  uuid primary key default gen_random_uuid(),
  order_id            uuid not null references orders(id) on delete cascade,
  product_id          uuid not null references products(id) on delete restrict,
  qty                 int not null check (qty > 0),
  unit_price_snapshot numeric(14,2) not null,
  line_total          numeric(14,2) not null,
  qty_delivered       int not null default 0,
  created_at          timestamptz not null default now()
);
create index if not exists idx_order_items_o on order_items(order_id);

-- ---------------------------------------------------------------------
-- invoices
-- ---------------------------------------------------------------------
create table if not exists invoices (
  id             uuid primary key default gen_random_uuid(),
  invoice_number text unique,
  order_id       uuid not null references orders(id) on delete restrict,
  company_id     uuid not null references companies(id) on delete restrict,
  issue_date     date not null default current_date,
  due_date       date,
  currency       currency_code not null default 'SDG',
  total          numeric(14,2) not null default 0,
  amount_paid    numeric(14,2) not null default 0,
  status         invoice_status not null default 'unpaid',
  pdf_url        text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index if not exists idx_invoices_company on invoices(company_id, status);
create index if not exists idx_invoices_order   on invoices(order_id);

-- ---------------------------------------------------------------------
-- payments
-- ---------------------------------------------------------------------
create table if not exists payments (
  id               uuid primary key default gen_random_uuid(),
  invoice_id       uuid not null references invoices(id) on delete cascade,
  amount           numeric(14,2) not null check (amount > 0),
  currency         currency_code not null default 'SDG',
  method           payment_method not null,
  reference_number text,
  receipt_url      text,
  recorded_by      uuid references profiles(id) on delete set null,
  paid_at          timestamptz not null default now(),
  created_at       timestamptz not null default now()
);
create index if not exists idx_payments_invoice on payments(invoice_id);

-- ---------------------------------------------------------------------
-- recurring_orders  (retention: auto-drafts a standing order)
-- ---------------------------------------------------------------------
create table if not exists recurring_orders (
  id            uuid primary key default gen_random_uuid(),
  company_id    uuid not null references companies(id) on delete cascade,
  name          text not null,
  frequency     recurring_frequency not null default 'monthly',
  next_run_date date,
  is_active     boolean not null default true,
  items         jsonb not null default '[]'::jsonb,  -- [{product_id, qty}]
  created_by    uuid references profiles(id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists idx_recurring_company on recurring_orders(company_id, is_active);

-- ---------------------------------------------------------------------
-- audit_log
-- ---------------------------------------------------------------------
create table if not exists audit_log (
  id         uuid primary key default gen_random_uuid(),
  table_name text not null,
  record_id  uuid,
  action     text not null,
  actor_id   uuid,
  old_value  jsonb,
  new_value  jsonb,
  created_at timestamptz not null default now()
);
create index if not exists idx_audit_table on audit_log(table_name, record_id);

-- ---------------------------------------------------------------------
-- updated_at triggers
-- ---------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array[
    'companies','profiles','categories','products','product_prices',
    'price_tiers','inventory','quotations','orders','invoices','recurring_orders'
  ] loop
    execute format('drop trigger if exists trg_%1$s_updated on %1$s;', t);
    execute format('create trigger trg_%1$s_updated before update on %1$s
                    for each row execute function set_updated_at();', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------
-- Sequential document numbers, reset per year:  Q-2026-0001 etc.
-- ---------------------------------------------------------------------
create table if not exists doc_counters (
  prefix  text not null,
  year    int  not null,
  counter int  not null default 0,
  primary key (prefix, year)
);

create or replace function next_doc_number(p_prefix text)
returns text language plpgsql security definer set search_path = public as $$
declare
  y int := extract(year from now())::int;
  n int;
begin
  insert into doc_counters(prefix, year, counter)
    values (p_prefix, y, 1)
  on conflict (prefix, year)
    do update set counter = doc_counters.counter + 1
  returning counter into n;
  return format('%s-%s-%s', p_prefix, y, lpad(n::text, 4, '0'));
end $$;

create or replace function assign_quote_number()
returns trigger language plpgsql as $$
begin
  if new.quote_number is null then new.quote_number := next_doc_number('Q'); end if;
  return new;
end $$;
create or replace function assign_order_number()
returns trigger language plpgsql as $$
begin
  if new.order_number is null then new.order_number := next_doc_number('SO'); end if;
  return new;
end $$;
create or replace function assign_invoice_number()
returns trigger language plpgsql as $$
begin
  if new.invoice_number is null then new.invoice_number := next_doc_number('INV'); end if;
  return new;
end $$;

drop trigger if exists trg_quote_number on quotations;
create trigger trg_quote_number before insert on quotations
  for each row execute function assign_quote_number();
drop trigger if exists trg_order_number on orders;
create trigger trg_order_number before insert on orders
  for each row execute function assign_order_number();
drop trigger if exists trg_invoice_number on invoices;
create trigger trg_invoice_number before insert on invoices
  for each row execute function assign_invoice_number();

-- ---------------------------------------------------------------------
-- Generic audit trigger (security definer so it bypasses RLS to log)
-- ---------------------------------------------------------------------
create or replace function write_audit()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  actor uuid;
begin
  begin actor := auth.uid(); exception when others then actor := null; end;
  if tg_op = 'DELETE' then
    insert into audit_log(table_name, record_id, action, actor_id, old_value)
      values (tg_table_name, old.id, tg_op, actor, to_jsonb(old));
    return old;
  elsif tg_op = 'UPDATE' then
    insert into audit_log(table_name, record_id, action, actor_id, old_value, new_value)
      values (tg_table_name, new.id, tg_op, actor, to_jsonb(old), to_jsonb(new));
    return new;
  else
    insert into audit_log(table_name, record_id, action, actor_id, new_value)
      values (tg_table_name, new.id, tg_op, actor, to_jsonb(new));
    return new;
  end if;
end $$;

do $$
declare t text;
begin
  foreach t in array array[
    'orders','invoices','payments','product_prices','fx_rates','quotations'
  ] loop
    execute format('drop trigger if exists trg_%1$s_audit on %1$s;', t);
    execute format('create trigger trg_%1$s_audit after insert or update or delete on %1$s
                    for each row execute function write_audit();', t);
  end loop;
end $$;
