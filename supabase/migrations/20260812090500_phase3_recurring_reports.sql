-- =====================================================================
-- Zawed Supply — Migration 6 : Phase 3 (recurring orders + reports)
-- =====================================================================

alter table recurring_orders
  add column if not exists last_run_at   timestamptz,
  add column if not exists last_order_id uuid references orders(id) on delete set null;

-- ---------------------------------------------------------------------
-- Recurring orders — the retention feature. Generates a real order from
-- the saved basket, priced at TODAY's rate, and advances next_run_date.
-- ---------------------------------------------------------------------
create or replace function run_recurring_order(p_recurring_id uuid)
returns table (order_id uuid, order_number text, total numeric)
language plpgsql security definer set search_path = public as $$
declare
  v_uid     uuid := auth.uid();
  v_role    user_role;
  v_company uuid;
  v_rec     recurring_orders%rowtype;
  v_fx      numeric := current_fx_rate();
  v_order   uuid;
  v_num     text;
  v_sub     numeric := 0;
  it        jsonb;
  v_pid     uuid;
  v_qty     int;
  v_unit    numeric;
  v_avail   int;
  v_name    text;
  v_addr    text;
  v_po      text;
begin
  select role, company_id into v_role, v_company from profiles where id = v_uid;
  select * into v_rec from recurring_orders where id = p_recurring_id;

  if v_rec.id is null then
    raise exception 'القائمة غير موجودة' using errcode = '22023';
  end if;
  if not is_staff() and v_rec.company_id <> v_company then
    raise exception 'غير مسموح' using errcode = '42501';
  end if;
  if v_fx is null then
    raise exception 'لم يتم ضبط سعر الصرف بعد' using errcode = '22023';
  end if;

  select billing_address, case when requires_po_number then 'RECURRING-' || to_char(now(),'YYYYMM') end
    into v_addr, v_po
  from companies where id = v_rec.company_id;

  insert into orders (company_id, po_number, status, currency, fx_rate_snapshot,
                      subtotal, vat_amount, total, delivery_address, created_by,
                      notes, internal_approval)
  values (v_rec.company_id, v_po, 'pending_approval', 'SDG', v_fx, 0, 0, 0,
          v_addr, v_uid, v_rec.name, 'not_required')
  returning id, orders.order_number into v_order, v_num;

  for it in select * from jsonb_array_elements(v_rec.items) loop
    v_pid := (it->>'product_id')::uuid;
    v_qty := greatest(coalesce((it->>'qty')::int, 0), 0);
    if v_qty = 0 then continue; end if;

    select name_ar into v_name from products where id = v_pid and is_active;
    if v_name is null then continue; end if;   -- skip retired products silently

    select qty_on_hand - qty_reserved into v_avail from inventory where product_id = v_pid;
    if coalesce(v_avail, 0) < v_qty then
      raise exception 'الكمية المتوفرة من "%" هي % فقط', v_name, coalesce(v_avail, 0)
        using errcode = '22023';
    end if;

    select gp.unit_price_sdg into v_unit from get_price(v_pid, v_rec.company_id, v_qty) gp;
    if v_unit is null then continue; end if;

    insert into order_items (order_id, product_id, qty, unit_price_snapshot, line_total, cost_usd_snapshot)
    values (v_order, v_pid, v_qty, v_unit, v_unit * v_qty, current_cost_usd(v_pid));

    v_sub := v_sub + v_unit * v_qty;
    update inventory set qty_reserved = qty_reserved + v_qty where product_id = v_pid;
  end loop;

  if v_sub = 0 then
    delete from orders where id = v_order;
    raise exception 'لا توجد أصناف متاحة في هذه القائمة' using errcode = '22023';
  end if;

  update orders set subtotal = v_sub, total = v_sub where id = v_order;

  update recurring_orders
     set last_run_at   = now(),
         last_order_id = v_order,
         next_run_date = case frequency
                           when 'weekly'    then current_date + 7
                           when 'monthly'   then (current_date + interval '1 month')::date
                           when 'quarterly' then (current_date + interval '3 months')::date
                         end
   where id = p_recurring_id;

  return query select v_order, v_num, v_sub;
end $$;

-- ---------------------------------------------------------------------
-- Reports (staff only — they expose cost and margin)
-- ---------------------------------------------------------------------

-- Revenue per month in both currencies. USD uses each order's own FX
-- snapshot, so history stays truthful as the pound moves.
create or replace function report_revenue_by_month(p_months int default 12)
returns table (month date, orders_count bigint, revenue_sdg numeric, revenue_usd numeric)
language sql stable security definer set search_path = public as $$
  select date_trunc('month', o.created_at)::date as month,
         count(*)                                as orders_count,
         sum(o.total)                            as revenue_sdg,
         sum(case when coalesce(o.fx_rate_snapshot, 0) > 0
                  then o.total / o.fx_rate_snapshot else 0 end) as revenue_usd
  from orders o
  where is_staff()
    and o.status <> 'cancelled'
    and o.created_at >= date_trunc('month', now()) - make_interval(months => greatest(p_months,1) - 1)
  group by 1
  order by 1 desc
$$;

create or replace function report_top_customers(p_limit int default 10)
returns table (company_id uuid, name_ar text, name_en text, orders_count bigint, revenue_sdg numeric)
language sql stable security definer set search_path = public as $$
  select c.id, c.name_ar, c.name_en, count(o.id), coalesce(sum(o.total), 0)
  from companies c
  join orders o on o.company_id = c.id and o.status <> 'cancelled'
  where is_staff()
  group by c.id, c.name_ar, c.name_en
  order by 5 desc
  limit greatest(p_limit, 1)
$$;

create or replace function report_top_products(p_limit int default 10)
returns table (product_id uuid, sku text, name_ar text, qty_sold bigint, revenue_sdg numeric)
language sql stable security definer set search_path = public as $$
  select p.id, p.sku, p.name_ar, sum(oi.qty)::bigint, coalesce(sum(oi.line_total), 0)
  from products p
  join order_items oi on oi.product_id = p.id
  join orders o on o.id = oi.order_id and o.status <> 'cancelled'
  where is_staff()
  group by p.id, p.sku, p.name_ar
  order by 5 desc
  limit greatest(p_limit, 1)
$$;

-- Margin uses the cost snapshot taken when the line was sold, converted at
-- that order's FX snapshot — not today's cost or today's rate.
create or replace function report_margin(p_months int default 6)
returns table (month date, revenue_sdg numeric, cost_sdg numeric, margin_sdg numeric, margin_percent numeric)
language sql stable security definer set search_path = public as $$
  with lines as (
    select date_trunc('month', o.created_at)::date as month,
           oi.line_total as revenue,
           coalesce(oi.cost_usd_snapshot, 0) * oi.qty * coalesce(o.fx_rate_snapshot, 0) as cost
    from order_items oi
    join orders o on o.id = oi.order_id
    where is_staff()
      and o.status <> 'cancelled'
      and o.created_at >= date_trunc('month', now()) - make_interval(months => greatest(p_months,1) - 1)
  )
  select month,
         sum(revenue),
         sum(cost),
         sum(revenue) - sum(cost),
         case when sum(revenue) > 0
              then round((sum(revenue) - sum(cost)) / sum(revenue) * 100, 1)
              else 0 end
  from lines
  group by month
  order by month desc
$$;

create or replace function report_aged_receivables()
returns table (bucket text, invoices_count bigint, amount_sdg numeric)
language sql stable security definer set search_path = public as $$
  with open_inv as (
    select i.total - i.amount_paid as balance,
           current_date - i.due_date as days_late
    from invoices i
    where is_staff()
      and i.status <> 'paid'
      and i.total > i.amount_paid
  )
  select b.bucket, count(o.balance), coalesce(sum(o.balance), 0)
  from (values ('current', 0, 0), ('1-30', 1, 30), ('31-60', 31, 60),
               ('61-90', 61, 90), ('90+', 91, 100000)) as b(bucket, lo, hi)
  left join open_inv o
    on (b.bucket = 'current' and o.days_late <= 0)
    or (b.bucket <> 'current' and o.days_late between b.lo and b.hi)
  group by b.bucket, b.lo
  order by b.lo
$$;

grant execute on function
  run_recurring_order(uuid),
  report_revenue_by_month(int),
  report_top_customers(int),
  report_top_products(int),
  report_margin(int),
  report_aged_receivables()
  to authenticated;
