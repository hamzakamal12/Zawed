-- =====================================================================
-- Zawed Supply — Migration 5 : Phase 2 (quotations, invoices, payments)
--                              + internal approval workflow
--
-- Everything money-related is computed in SQL. The client never supplies
-- a price, a total, or an invoice balance.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Internal (customer-side) approval: a `customer_requester` raises a
-- request, their `customer_admin` approves it before we act on it.
-- ---------------------------------------------------------------------
do $$ begin
  create type internal_approval as enum ('not_required','pending','approved','rejected');
exception when duplicate_object then null; end $$;

alter table orders
  add column if not exists internal_approval internal_approval not null default 'not_required',
  add column if not exists approval_comment  text,
  add column if not exists approved_at       timestamptz,
  -- Checkout collects notes but the original table had nowhere to keep them,
  -- so they were being silently dropped.
  add column if not exists notes             text;

create index if not exists idx_orders_internal_approval
  on orders(company_id, internal_approval);

-- Cost snapshots make margin reporting exact instead of an estimate
-- against today's cost.
alter table order_items     add column if not exists cost_usd_snapshot numeric(12,4);
alter table quotation_items add column if not exists cost_usd_snapshot numeric(12,4);
alter table quotations      add column if not exists converted_order_id uuid references orders(id) on delete set null;

-- Active cost for a product (staff-priced inputs live behind RLS).
create or replace function current_cost_usd(p_product_id uuid)
returns numeric language sql stable security definer set search_path = public as $$
  select cost_usd from product_prices
  where product_id = p_product_id
    and effective_from <= now()
    and (effective_to is null or effective_to > now())
  order by effective_from desc limit 1
$$;

-- ---------------------------------------------------------------------
-- place_order(): route requester-raised orders through internal approval
-- and snapshot cost per line. Signature unchanged for the client.
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
language plpgsql security definer set search_path = public as $$
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
  v_approval internal_approval;
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

  select p.company_id, p.role into v_company, v_role from profiles p where p.id = v_uid;

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

  v_approval := case when v_role = 'customer_requester' then 'pending' else 'not_required' end;

  insert into orders (company_id, po_number, status, currency, fx_rate_snapshot,
                      subtotal, vat_amount, total, delivery_address,
                      requested_delivery_date, created_by, notes, internal_approval)
  values (v_company, nullif(trim(p_po_number), ''), 'pending_approval', 'SDG', v_fx,
          0, 0, 0, p_delivery_address, p_requested_delivery_date, v_uid, p_notes, v_approval)
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
      raise exception 'الحد الأدنى للطلب من "%" هو % وحدة', v_name, v_min using errcode = '22023';
    end if;

    select i.qty_on_hand - i.qty_reserved into v_stock from inventory i where i.product_id = v_pid;
    if coalesce(v_stock, 0) < v_qty then
      raise exception 'الكمية المتوفرة من "%" هي % فقط', v_name, coalesce(v_stock, 0)
        using errcode = '22023';
    end if;

    select gp.unit_price_sdg into v_unit from get_price(v_pid, v_company, v_qty) gp;
    if v_unit is null then
      raise exception 'لا يوجد سعر مُعرّف للمنتج "%"', v_name using errcode = '22023';
    end if;

    insert into order_items (order_id, product_id, qty, unit_price_snapshot, line_total, cost_usd_snapshot)
    values (v_order, v_pid, v_qty, v_unit, v_unit * v_qty, current_cost_usd(v_pid));

    v_sub := v_sub + (v_unit * v_qty);
    update inventory set qty_reserved = qty_reserved + v_qty where product_id = v_pid;
  end loop;

  if v_sub = 0 then
    raise exception 'السلة فارغة' using errcode = '22023';
  end if;

  v_vat := round(v_sub * coalesce(p_vat_percent, 0) / 100.0, 2);
  update orders o set subtotal = v_sub, vat_amount = v_vat, total = v_sub + v_vat
   where o.id = v_order;

  return query select v_order, v_number, (v_sub + v_vat);
end $$;

-- ---------------------------------------------------------------------
-- Internal approval decision (customer_admin only, own company).
-- ---------------------------------------------------------------------
create or replace function decide_internal_approval(
  p_order_id uuid,
  p_approve  boolean,
  p_comment  text default null
)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_company uuid;
  v_role user_role;
  v_order orders%rowtype;
begin
  select company_id, role into v_company, v_role from profiles where id = v_uid;
  if v_role <> 'customer_admin' then
    raise exception 'الموافقة مخصّصة لمسؤول حساب الشركة' using errcode = '42501';
  end if;

  select * into v_order from orders where id = p_order_id;
  if v_order.id is null or v_order.company_id <> v_company then
    raise exception 'الطلب غير موجود' using errcode = '42501';
  end if;
  if v_order.internal_approval <> 'pending' then
    raise exception 'هذا الطلب لا ينتظر موافقة' using errcode = '22023';
  end if;

  update orders
     set internal_approval = (case when p_approve then 'approved' else 'rejected' end)::internal_approval,
         approval_comment  = p_comment,
         approved_by       = v_uid,
         approved_at       = now(),
         status            = (case when p_approve then status::text else 'cancelled' end)::order_status
   where id = p_order_id;

  -- A rejected request releases the stock it was holding.
  if not p_approve then
    update inventory i
       set qty_reserved = greatest(i.qty_reserved - oi.qty, 0)
      from order_items oi
     where oi.order_id = p_order_id and oi.product_id = i.product_id;
  end if;
end $$;

-- ---------------------------------------------------------------------
-- Quotations
-- ---------------------------------------------------------------------
create or replace function create_quotation(
  p_company_id     uuid,
  p_items          jsonb,           -- [{product_id, qty}]
  p_notes          text default null,
  p_terms          text default null,
  p_vat_percent    numeric default 0,
  p_validity_days  int default 7
)
returns table (quotation_id uuid, quote_number text, total numeric)
language plpgsql security definer set search_path = public as $$
declare
  v_fx    numeric := current_fx_rate();
  v_quote uuid;
  v_num   text;
  v_sub   numeric := 0;
  v_vat   numeric := 0;
  it      jsonb;
  v_pid   uuid;
  v_qty   int;
  v_unit  numeric;
  v_name  text;
begin
  if not is_staff() then
    raise exception 'عروض الأسعار تُنشأ بواسطة فريق المبيعات' using errcode = '42501';
  end if;
  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'أضف صنفاً واحداً على الأقل' using errcode = '22023';
  end if;
  if v_fx is null then
    raise exception 'لم يتم ضبط سعر الصرف بعد' using errcode = '22023';
  end if;

  insert into quotations (company_id, created_by, status, currency, fx_rate_snapshot,
                          valid_until, subtotal, vat_percent, vat_amount, total,
                          notes_ar, terms_ar)
  values (p_company_id, auth.uid(), 'draft', 'SDG', v_fx,
          now() + make_interval(days => greatest(coalesce(p_validity_days, 7), 1)),
          0, coalesce(p_vat_percent, 0), 0, 0, p_notes, p_terms)
  returning id, quotations.quote_number into v_quote, v_num;

  for it in select * from jsonb_array_elements(p_items) loop
    v_pid := (it->>'product_id')::uuid;
    v_qty := greatest(coalesce((it->>'qty')::int, 0), 0);
    if v_qty = 0 then continue; end if;

    select name_ar into v_name from products where id = v_pid and is_active;
    if v_name is null then
      raise exception 'منتج غير متوفر' using errcode = '22023';
    end if;

    select gp.unit_price_sdg into v_unit from get_price(v_pid, p_company_id, v_qty) gp;
    if v_unit is null then
      raise exception 'لا يوجد سعر مُعرّف للمنتج "%"', v_name using errcode = '22023';
    end if;

    insert into quotation_items (quotation_id, product_id, qty, unit_price_snapshot,
                                 line_total, cost_usd_snapshot)
    values (v_quote, v_pid, v_qty, v_unit, v_unit * v_qty, current_cost_usd(v_pid));

    v_sub := v_sub + (v_unit * v_qty);
  end loop;

  v_vat := round(v_sub * coalesce(p_vat_percent, 0) / 100.0, 2);
  update quotations q set subtotal = v_sub, vat_amount = v_vat, total = v_sub + v_vat
   where q.id = v_quote;

  return query select v_quote, v_num, (v_sub + v_vat);
end $$;

-- Convert an accepted quotation into an order, keeping the QUOTED prices
-- (that is the whole point of a quote) rather than re-pricing at today's FX.
create or replace function accept_quotation(
  p_quotation_id     uuid,
  p_po_number        text default null,
  p_delivery_address text default null
)
returns table (order_id uuid, order_number text, total numeric)
language plpgsql security definer set search_path = public as $$
declare
  v_uid     uuid := auth.uid();
  v_role    user_role;
  v_company uuid;
  v_q       quotations%rowtype;
  v_order   uuid;
  v_num     text;
  v_needs_po boolean;
  r         record;
  v_avail   int;
begin
  select role, company_id into v_role, v_company from profiles where id = v_uid;
  select * into v_q from quotations where id = p_quotation_id;

  if v_q.id is null then
    raise exception 'عرض السعر غير موجود' using errcode = '22023';
  end if;
  -- Staff may convert on the customer's behalf; a customer only their own.
  if not is_staff() and v_q.company_id <> v_company then
    raise exception 'غير مسموح' using errcode = '42501';
  end if;
  if v_q.status in ('accepted','rejected','expired') then
    raise exception 'عرض السعر لم يعد قابلاً للتحويل' using errcode = '22023';
  end if;
  if v_q.valid_until < now() then
    update quotations set status = 'expired' where id = p_quotation_id;
    raise exception 'انتهت صلاحية عرض السعر' using errcode = '22023';
  end if;

  select requires_po_number into v_needs_po from companies where id = v_q.company_id;
  if v_needs_po and coalesce(trim(p_po_number), '') = '' then
    raise exception 'رقم أمر الشراء (PO) مطلوب لهذه الشركة' using errcode = '22023';
  end if;

  for r in select qi.product_id, qi.qty, p.name_ar
             from quotation_items qi join products p on p.id = qi.product_id
            where qi.quotation_id = p_quotation_id loop
    select qty_on_hand - qty_reserved into v_avail from inventory where product_id = r.product_id;
    if coalesce(v_avail, 0) < r.qty then
      raise exception 'الكمية المتوفرة من "%" هي % فقط', r.name_ar, coalesce(v_avail, 0)
        using errcode = '22023';
    end if;
  end loop;

  insert into orders (company_id, quotation_id, po_number, status, currency,
                      fx_rate_snapshot, subtotal, vat_amount, total,
                      delivery_address, created_by, internal_approval)
  values (v_q.company_id, v_q.id, nullif(trim(p_po_number), ''), 'confirmed', v_q.currency,
          v_q.fx_rate_snapshot, v_q.subtotal, v_q.vat_amount, v_q.total,
          coalesce(p_delivery_address, (select billing_address from companies where id = v_q.company_id)),
          v_uid, 'not_required')
  returning id, orders.order_number into v_order, v_num;

  insert into order_items (order_id, product_id, qty, unit_price_snapshot, line_total, cost_usd_snapshot)
  select v_order, qi.product_id, qi.qty, qi.unit_price_snapshot, qi.line_total, qi.cost_usd_snapshot
  from quotation_items qi where qi.quotation_id = p_quotation_id;

  update inventory i set qty_reserved = i.qty_reserved + qi.qty
    from quotation_items qi
   where qi.quotation_id = p_quotation_id and qi.product_id = i.product_id;

  update quotations set status = 'accepted', converted_order_id = v_order
   where id = p_quotation_id;

  return query select v_order, v_num, v_q.total;
end $$;

-- Lapse quotations past their validity (called on load; cheap and idempotent).
create or replace function expire_quotations()
returns int language plpgsql security definer set search_path = public as $$
declare n int;
begin
  update quotations set status = 'expired'
   where status in ('draft','sent') and valid_until < now();
  get diagnostics n = row_count;
  return n;
end $$;

-- ---------------------------------------------------------------------
-- Invoices & payments
-- ---------------------------------------------------------------------
create or replace function issue_invoice(p_order_id uuid)
returns table (invoice_id uuid, invoice_number text, total numeric)
language plpgsql security definer set search_path = public as $$
declare
  v_o     orders%rowtype;
  v_terms int;
  v_id    uuid;
  v_num   text;
  v_exist uuid;
begin
  if not is_staff() then
    raise exception 'إصدار الفواتير مخصّص للموظفين' using errcode = '42501';
  end if;

  select * into v_o from orders where id = p_order_id;
  if v_o.id is null then
    raise exception 'الطلب غير موجود' using errcode = '22023';
  end if;
  if v_o.status = 'cancelled' then
    raise exception 'لا يمكن إصدار فاتورة لطلب ملغي' using errcode = '22023';
  end if;

  select id into v_exist from invoices where order_id = p_order_id limit 1;
  if v_exist is not null then
    return query select i.id, i.invoice_number, i.total from invoices i where i.id = v_exist;
    return;
  end if;

  select payment_terms_days into v_terms from companies where id = v_o.company_id;

  insert into invoices (order_id, company_id, issue_date, due_date, currency, total, amount_paid, status)
  values (p_order_id, v_o.company_id, current_date,
          current_date + coalesce(v_terms, 30), v_o.currency, v_o.total, 0, 'unpaid')
  returning id, invoices.invoice_number into v_id, v_num;

  return query select v_id, v_num, v_o.total;
end $$;

create or replace function record_payment(
  p_invoice_id uuid,
  p_amount     numeric,
  p_method     payment_method,
  p_reference  text default null,
  p_paid_at    timestamptz default now()
)
returns table (amount_paid numeric, status invoice_status)
language plpgsql security definer set search_path = public as $$
declare
  v_inv  invoices%rowtype;
  v_paid numeric;
  v_st   invoice_status;
begin
  if not is_staff() then
    raise exception 'تسجيل المدفوعات مخصّص للموظفين' using errcode = '42501';
  end if;
  if coalesce(p_amount, 0) <= 0 then
    raise exception 'قيمة الدفعة يجب أن تكون أكبر من صفر' using errcode = '22023';
  end if;

  select * into v_inv from invoices where id = p_invoice_id;
  if v_inv.id is null then
    raise exception 'الفاتورة غير موجودة' using errcode = '22023';
  end if;

  select coalesce(sum(amount), 0) into v_paid from payments where invoice_id = p_invoice_id;
  if v_paid + p_amount > v_inv.total + 0.01 then
    raise exception 'المبلغ يتجاوز رصيد الفاتورة المتبقّي (%)', round(v_inv.total - v_paid, 2)
      using errcode = '22023';
  end if;

  insert into payments (invoice_id, amount, currency, method, reference_number, recorded_by, paid_at)
  values (p_invoice_id, p_amount, v_inv.currency, p_method, p_reference, auth.uid(), p_paid_at);

  v_paid := v_paid + p_amount;
  v_st := case
            when v_paid >= v_inv.total - 0.01 then 'paid'
            when v_paid > 0                   then 'partially_paid'
            else 'unpaid'
          end;
  -- An unsettled invoice past its due date reads as overdue.
  if v_st <> 'paid' and v_inv.due_date < current_date then
    v_st := 'overdue';
  end if;

  update invoices set amount_paid = v_paid, status = v_st where id = p_invoice_id;
  return query select v_paid, v_st;
end $$;

-- Flip unsettled invoices past due to `overdue` (idempotent).
create or replace function refresh_overdue_invoices()
returns int language plpgsql security definer set search_path = public as $$
declare n int;
begin
  update invoices
     set status = 'overdue'
   where status in ('unpaid','partially_paid') and due_date < current_date;
  get diagnostics n = row_count;
  return n;
end $$;

grant execute on function
  decide_internal_approval(uuid, boolean, text),
  create_quotation(uuid, jsonb, text, text, numeric, int),
  accept_quotation(uuid, text, text),
  expire_quotations(),
  issue_invoice(uuid),
  record_payment(uuid, numeric, payment_method, text, timestamptz),
  refresh_overdue_invoices(),
  current_cost_usd(uuid)
  to authenticated;

-- current_cost_usd exposes cost — keep it staff-only at the API surface.
revoke execute on function current_cost_usd(uuid) from authenticated;
grant  execute on function current_cost_usd(uuid) to service_role;
