-- =====================================================================
-- Zawed Supply — Migration 3/3 : Row Level Security
-- Every table is protected. Customers are hard-scoped to their own
-- company; cost_usd / margin are never exposed to customers.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Role helpers (SECURITY DEFINER to read profiles without RLS recursion)
-- ---------------------------------------------------------------------
create or replace function auth_role()
returns user_role language sql stable security definer set search_path = public as $$
  select role from profiles where id = auth.uid()
$$;

create or replace function auth_company_id()
returns uuid language sql stable security definer set search_path = public as $$
  select company_id from profiles where id = auth.uid()
$$;

create or replace function is_staff()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select role from profiles where id = auth.uid())
                  in ('admin','sales','warehouse'), false)
$$;

create or replace function is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select role from profiles where id = auth.uid()) = 'admin', false)
$$;

grant execute on function auth_role(), auth_company_id(), is_staff(), is_admin(),
                         get_price(uuid, uuid, int), current_fx_rate()
  to authenticated;

-- ---------------------------------------------------------------------
-- Enable RLS everywhere
-- ---------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array[
    'companies','profiles','categories','products','product_prices','fx_rates',
    'price_tiers','inventory','quotations','quotation_items','orders','order_items',
    'invoices','payments','recurring_orders','audit_log','doc_counters'
  ] loop
    execute format('alter table %I enable row level security;', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------
create policy profiles_select on profiles for select to authenticated
  using (id = auth.uid() or is_staff());
create policy profiles_insert on profiles for insert to authenticated
  with check (id = auth.uid() or is_admin());
create policy profiles_update on profiles for update to authenticated
  using (id = auth.uid() or is_admin())
  with check (id = auth.uid() or is_admin());

-- ---------------------------------------------------------------------
-- companies
-- ---------------------------------------------------------------------
create policy companies_select on companies for select to authenticated
  using (is_staff() or id = auth_company_id());
create policy companies_write on companies for all to authenticated
  using (is_admin()) with check (is_admin());

-- ---------------------------------------------------------------------
-- Catalog: categories / products readable by everyone signed in
-- ---------------------------------------------------------------------
create policy categories_select on categories for select to authenticated using (true);
create policy categories_write  on categories for all    to authenticated using (is_admin()) with check (is_admin());

create policy products_select on products for select to authenticated using (true);
create policy products_write  on products for all    to authenticated using (is_admin()) with check (is_admin());

-- product_prices: STAFF ONLY (hides cost & margin from customers)
create policy product_prices_select on product_prices for select to authenticated using (is_staff());
create policy product_prices_write  on product_prices for all    to authenticated using (is_admin()) with check (is_admin());

-- fx_rates: readable (needed for display); only admin writes
create policy fx_rates_select on fx_rates for select to authenticated using (true);
create policy fx_rates_write  on fx_rates for all    to authenticated using (is_admin()) with check (is_admin());

-- price_tiers: global tiers + your own company's tiers (never other companies')
create policy price_tiers_select on price_tiers for select to authenticated
  using (is_staff() or company_id is null or company_id = auth_company_id());
create policy price_tiers_write on price_tiers for all to authenticated
  using (is_admin()) with check (is_admin());

-- inventory: availability readable; warehouse + admin write
create policy inventory_select on inventory for select to authenticated using (true);
create policy inventory_write  on inventory for all to authenticated
  using (is_admin() or auth_role() = 'warehouse')
  with check (is_admin() or auth_role() = 'warehouse');

-- ---------------------------------------------------------------------
-- quotations
-- ---------------------------------------------------------------------
create policy quotations_select on quotations for select to authenticated
  using (is_staff() or company_id = auth_company_id());
create policy quotations_insert on quotations for insert to authenticated
  with check (is_staff());
create policy quotations_update on quotations for update to authenticated
  using (is_staff() or (auth_role() = 'customer_admin' and company_id = auth_company_id()))
  with check (is_staff() or (auth_role() = 'customer_admin' and company_id = auth_company_id()));
create policy quotations_delete on quotations for delete to authenticated
  using (is_admin());

create policy quotation_items_select on quotation_items for select to authenticated
  using (exists (select 1 from quotations q where q.id = quotation_id
                 and (is_staff() or q.company_id = auth_company_id())));
create policy quotation_items_write on quotation_items for all to authenticated
  using (is_staff()) with check (is_staff());

-- ---------------------------------------------------------------------
-- orders
-- ---------------------------------------------------------------------
create policy orders_select on orders for select to authenticated
  using (is_staff() or company_id = auth_company_id());
create policy orders_insert on orders for insert to authenticated
  with check (is_staff()
              or (auth_role() in ('customer_admin','customer_requester')
                  and company_id = auth_company_id()));
create policy orders_update on orders for update to authenticated
  using (is_staff() or (auth_role() = 'customer_admin' and company_id = auth_company_id()))
  with check (is_staff() or (auth_role() = 'customer_admin' and company_id = auth_company_id()));
create policy orders_delete on orders for delete to authenticated
  using (is_admin());

create policy order_items_select on order_items for select to authenticated
  using (exists (select 1 from orders o where o.id = order_id
                 and (is_staff() or o.company_id = auth_company_id())));
create policy order_items_write on order_items for all to authenticated
  using (exists (select 1 from orders o where o.id = order_id
                 and (is_staff() or o.company_id = auth_company_id())))
  with check (exists (select 1 from orders o where o.id = order_id
                 and (is_staff() or o.company_id = auth_company_id())));

-- ---------------------------------------------------------------------
-- invoices / payments  (customers read-only; staff manage)
-- ---------------------------------------------------------------------
create policy invoices_select on invoices for select to authenticated
  using (is_staff() or company_id = auth_company_id());
create policy invoices_write on invoices for all to authenticated
  using (is_staff()) with check (is_staff());

create policy payments_select on payments for select to authenticated
  using (is_staff() or exists (select 1 from invoices i where i.id = invoice_id
                               and i.company_id = auth_company_id()));
create policy payments_write on payments for all to authenticated
  using (is_staff()) with check (is_staff());

-- ---------------------------------------------------------------------
-- recurring_orders  (customer_admin manages own; staff manage all)
-- ---------------------------------------------------------------------
create policy recurring_select on recurring_orders for select to authenticated
  using (is_staff() or company_id = auth_company_id());
create policy recurring_write on recurring_orders for all to authenticated
  using (is_staff() or (auth_role() = 'customer_admin' and company_id = auth_company_id()))
  with check (is_staff() or (auth_role() = 'customer_admin' and company_id = auth_company_id()));

-- ---------------------------------------------------------------------
-- audit_log: admin read-only (rows are written by SECURITY DEFINER trigger)
-- ---------------------------------------------------------------------
create policy audit_select on audit_log for select to authenticated using (is_admin());

-- doc_counters: no policies — only the SECURITY DEFINER numbering
-- function touches it, so it stays fully locked to clients.
