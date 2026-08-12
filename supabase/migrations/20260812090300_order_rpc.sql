-- =====================================================================
-- Zawed Supply — Migration 4/4 : catalog pricing (batch) + place_order RPC
--
-- Two problems this solves:
--  1. SECURITY — order_items.unit_price_snapshot must never be chosen by
--     the client. place_order() re-prices every line server-side.
--  2. PERFORMANCE — one round trip prices the whole catalog instead of
--     N calls to get_price() over a 3G link.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Price every active product in a single call (qty = 1, list view).
-- ---------------------------------------------------------------------
create or replace function get_catalog_prices(p_company_id uuid default null)
returns table (
  product_id       uuid,
  unit_price_sdg   numeric,
  unit_price_usd   numeric,
  fx_rate_used     numeric,
  discount_applied numeric,
  tier_name        text
)
language sql
stable
security definer
set search_path = public
as $$
  select p.id, g.unit_price_sdg, g.unit_price_usd, g.fx_rate_used,
         g.discount_applied, g.tier_name
  from products p
  cross join lateral get_price(p.id, p_company_id, 1) g
  where p.is_active
$$;

comment on function get_catalog_prices(uuid) is
  'Batch pricing for the catalog list view — one round trip instead of N.';

-- ---------------------------------------------------------------------
-- place_order(items, …) — the ONLY supported way for a customer to
-- create an order. Prices are resolved server-side from get_price(),
-- so a tampered client cannot dictate unit_price_snapshot.
--
-- p_items: [{"product_id":"<uuid>","qty":5}, …]
-- ---------------------------------------------------------------------
create or replace function place_order(
  p_items                  jsonb,
  p_delivery_address       text,
  p_requested_delivery_date date default null,
  p_po_number              text default null,
  p_notes                  text default null,
  p_vat_percent            numeric default 0
)
returns table (order_id uuid, order_number text, total numeric)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid      uuid := auth.uid();
  v_company  uuid;
  v_role     user_role;
  v_needs_po boolean;
  v_active   boolean;
  v_fx       numeric := current_fx_rate();
  v_order    uuid;
  v_number   text;
  v_sub      numeric := 0;
  v_vat      numeric := 0;
  it         jsonb;
  v_pid      uuid;
  v_qty      int;
  v_unit     numeric;
  v_min      int;
  v_stock    int;
  v_name     text;
begin
  if v_uid is null then
    raise exception 'يجب تسجيل الدخول' using errcode = '28000';
  end if;

  select p.company_id, p.role into v_company, v_role
  from profiles p where p.id = v_uid;

  if v_company is null then
    raise exception 'حسابك غير مرتبط بشركة' using errcode = '42501';
  end if;
  if v_role not in ('customer_admin','customer_requester') then
    raise exception 'هذا الإجراء مخصص لحسابات العملاء' using errcode = '42501';
  end if;

  select c.requires_po_number, c.is_active into v_needs_po, v_active
  from companies c where c.id = v_company;

  if not coalesce(v_active, false) then
    raise exception 'حساب الشركة غير مُفعّل' using errcode = '42501';
  end if;
  if v_needs_po and coalesce(trim(p_po_number), '') = '' then
    raise exception 'رقم أمر الشراء (PO) مطلوب لهذه الشركة' using errcode = '22023';
  end if;
  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'السلة فارغة' using errcode = '22023';
  end if;
  if v_fx is null then
    raise exception 'لم يتم ضبط سعر الصرف بعد' using errcode = '22023';
  end if;

  insert into orders (company_id, po_number, status, currency, fx_rate_snapshot,
                      subtotal, vat_amount, total, delivery_address,
                      requested_delivery_date, created_by)
  values (v_company, nullif(trim(p_po_number), ''), 'pending_approval', 'SDG', v_fx,
          0, 0, 0, p_delivery_address, p_requested_delivery_date, v_uid)
  returning id, orders.order_number into v_order, v_number;

  for it in select * from jsonb_array_elements(p_items) loop
    v_pid := (it->>'product_id')::uuid;
    v_qty := greatest(coalesce((it->>'qty')::int, 0), 0);

    if v_qty = 0 then continue; end if;

    select p.min_order_qty, p.name_ar into v_min, v_name
    from products p where p.id = v_pid and p.is_active;

    if v_name is null then
      raise exception 'منتج غير متوفر' using errcode = '22023';
    end if;
    if v_qty < coalesce(v_min, 1) then
      raise exception 'الحد الأدنى للطلب من "%" هو % وحدة', v_name, v_min
        using errcode = '22023';
    end if;

    select i.qty_on_hand - i.qty_reserved into v_stock
    from inventory i where i.product_id = v_pid;
    if coalesce(v_stock, 0) < v_qty then
      raise exception 'الكمية المتوفرة من "%" هي % فقط', v_name, coalesce(v_stock, 0)
        using errcode = '22023';
    end if;

    -- Server-side price. The client's number is ignored entirely.
    select gp.unit_price_sdg into v_unit from get_price(v_pid, v_company, v_qty) gp;
    if v_unit is null then
      raise exception 'لا يوجد سعر مُعرّف للمنتج "%"', v_name using errcode = '22023';
    end if;

    insert into order_items (order_id, product_id, qty, unit_price_snapshot, line_total)
    values (v_order, v_pid, v_qty, v_unit, v_unit * v_qty);

    v_sub := v_sub + (v_unit * v_qty);

    -- Reserve stock so two buyers can't claim the same units.
    update inventory set qty_reserved = qty_reserved + v_qty where product_id = v_pid;
  end loop;

  if v_sub = 0 then
    raise exception 'السلة فارغة' using errcode = '22023';
  end if;

  v_vat := round(v_sub * coalesce(p_vat_percent, 0) / 100.0, 2);

  update orders o
     set subtotal = v_sub, vat_amount = v_vat, total = v_sub + v_vat
   where o.id = v_order;

  return query select v_order, v_number, (v_sub + v_vat);
end $$;

comment on function place_order(jsonb, text, date, text, text, numeric) is
  'Creates a customer order with server-resolved prices, PO/min-qty/stock validation, and stock reservation.';

grant execute on function get_catalog_prices(uuid) to authenticated;
grant execute on function place_order(jsonb, text, date, text, text, numeric) to authenticated;

-- ---------------------------------------------------------------------
-- Close the hole the RPC exists to fix: customers may no longer write
-- order_items directly. Staff still can (manual/phone orders).
-- ---------------------------------------------------------------------
drop policy if exists order_items_write on order_items;
create policy order_items_write on order_items for all to authenticated
  using (is_staff()) with check (is_staff());

-- Customers may still create the order header only through place_order()
-- (SECURITY DEFINER bypasses this), never by hand.
drop policy if exists orders_insert on orders;
create policy orders_insert on orders for insert to authenticated
  with check (is_staff());
