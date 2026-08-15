-- Zawed Supply — Migration 15 : one person, two steps
--
-- The ordering flow becomes what the business actually is today:
--
--     pick what you need  →  a proforma you can print  →  you confirm it
--
-- One person. No second signature.
--
-- What this replaces: approval used to be decided by the ORDER PLACER'S ROLE.
-- A customer_requester's order was frozen until a customer_admin signed it; a
-- customer_admin's own order skipped the step entirely. That is a purchasing
-- department's workflow, and it was imposed on every organization whether they
-- had two people or one — including the ones where the requester and the
-- approver are the same person, who then had to wait for themselves.
--
-- Now: EVERY order becomes a proforma awaiting confirmation, and by default the
-- person who placed it is the person who confirms it. Same two steps for
-- everyone, no role to reason about.
--
-- The second-signature workflow is not deleted, it is switched off. A company
-- with `requires_internal_approval = true` gets exactly the old behaviour back
-- — a requester's order can only be confirmed by a customer_admin. So "add
-- permissions later, once the platform matures" is one boolean per company,
-- not a rewrite, and the rules stay tested in the meantime.

alter table companies
  add column if not exists requires_internal_approval boolean not null default false;

comment on column companies.requires_internal_approval is
  'When true, a customer_requester''s proforma can only be confirmed by a customer_admin — the two-person rule. Default false: whoever places the order confirms it.';

-- ---------------------------------------------------------------------
-- 1. Every order starts as a proforma awaiting confirmation
-- ---------------------------------------------------------------------
-- place_order() sets internal_approval from the placer's role. Rather than
-- rewrite the whole function (it also prices, reserves stock and numbers the
-- document), the value is corrected on the way in. One place, one rule.
-- A recurring order is agreed once, when the schedule is set up; asking for a
-- fresh confirmation every cycle would defeat the feature. Stamping the order
-- with the schedule that produced it both exempts it here and answers "where
-- did this come from?" on an order nobody remembers placing.
alter table orders
  add column if not exists recurring_id uuid references recurring_orders(id) on delete set null;

create or replace function set_order_awaits_confirmation()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  -- Staff-created orders are not proformas: staff act on an order a customer
  -- already agreed to, so there is nobody left to confirm.
  if is_staff() then
    return new;
  end if;
  -- Already agreed on a schedule.
  if new.recurring_id is not null then
    return new;
  end if;
  if new.internal_approval = 'not_required' then
    new.internal_approval := 'pending';
  end if;
  return new;
end $$;

drop trigger if exists trg_orders_awaits_confirmation on orders;
create trigger trg_orders_awaits_confirmation
  before insert on orders
  for each row execute function set_order_awaits_confirmation();

revoke execute on function set_order_awaits_confirmation() from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- 2. Who may confirm
-- ---------------------------------------------------------------------
create or replace function decide_internal_approval(
  p_order_id uuid,
  p_approve  boolean,
  p_comment  text default null
)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_uid       uuid := auth.uid();
  v_company   uuid;
  v_role      user_role;
  v_two_man   boolean;
  v_order     orders%rowtype;
begin
  select p.company_id, p.role into v_company, v_role from profiles p where p.id = v_uid;
  if v_role not in ('customer_admin','customer_requester') then
    raise exception 'تأكيد الطلب مخصّص لحسابات العملاء' using errcode = '42501';
  end if;

  select * into v_order from orders where id = p_order_id;
  if v_order.id is null or v_order.company_id is distinct from v_company then
    raise exception 'الطلب غير موجود' using errcode = '42501';
  end if;
  if v_order.internal_approval <> 'pending' then
    raise exception 'هذا الطلب لا ينتظر تأكيداً' using errcode = '22023';
  end if;

  select c.requires_internal_approval into v_two_man from companies c where c.id = v_company;

  if coalesce(v_two_man, false) then
    -- The company asked for a second pair of eyes: the person who raised the
    -- order is exactly the person who must not be the one to clear it.
    if v_role <> 'customer_admin' then
      raise exception 'الموافقة مخصّصة لمسؤول حساب الشركة' using errcode = '42501';
    end if;
  else
    -- Simple mode. You confirm your own order; a customer_admin may also
    -- confirm anyone's, since they answer for the company's account either way.
    if v_role <> 'customer_admin' and v_order.created_by is distinct from v_uid then
      raise exception 'يمكنك تأكيد طلباتك أنت فقط' using errcode = '42501';
    end if;
  end if;

  update orders
     set internal_approval = (case when p_approve then 'approved' else 'rejected' end)::internal_approval,
         approval_comment  = p_comment,
         approved_by       = v_uid,
         approved_at       = now(),
         -- Confirmation is what turns the proforma into a live order.
         status            = (case when p_approve then 'confirmed' else 'cancelled' end)::order_status
   where id = p_order_id;

  -- Cancelling releases the stock the proforma was holding.
  if not p_approve then
    update inventory i
       set qty_reserved = greatest(i.qty_reserved - oi.qty, 0)
      from order_items oi
     where oi.order_id = p_order_id and oi.product_id = i.product_id;
  end if;
end $$;

revoke execute on function decide_internal_approval(uuid, boolean, text) from public, anon;
grant execute on function decide_internal_approval(uuid, boolean, text) to authenticated;

-- ---------------------------------------------------------------------
-- 3. Abandoned proformas must give the stock back
-- ---------------------------------------------------------------------
-- Stock is reserved the moment the proforma is raised — it has to be, or the
-- quantity on a printed document could be sold to someone else before it is
-- signed. The cost is that a proforma nobody ever confirms holds that stock
-- for good. Under the old rule that was a narrow case; now every order passes
-- through this state, so it needs an expiry or the warehouse slowly becomes
-- unsellable on paper.
alter table app_settings
  add column if not exists proforma_expiry_days int not null default 7;

alter table app_settings drop constraint if exists app_settings_proforma_expiry;
alter table app_settings add constraint app_settings_proforma_expiry
  check (proforma_expiry_days between 1 and 365);

grant update (proforma_expiry_days) on app_settings to authenticated;

create or replace function expire_stale_proformas()
returns int language plpgsql security definer set search_path = public as $$
declare
  v_days int;
  v_n    int := 0;
begin
  select proforma_expiry_days into v_days from app_settings where id;

  -- Release the stock BEFORE cancelling, so a failure mid-way leaves the
  -- order still visibly open rather than cancelled with its stock still held.
  update inventory i
     set qty_reserved = greatest(i.qty_reserved - oi.qty, 0)
    from order_items oi
    join orders o on o.id = oi.order_id
   where oi.product_id = i.product_id
     and o.internal_approval = 'pending'
     and o.created_at < now() - make_interval(days => v_days);

  update orders
     set internal_approval = 'rejected',
         status            = 'cancelled',
         approval_comment  = coalesce(approval_comment, 'انتهت صلاحية الفاتورة المبدئية دون تأكيد')
   where internal_approval = 'pending'
     and created_at < now() - make_interval(days => v_days);

  get diagnostics v_n = row_count;
  return v_n;
end $$;

revoke execute on function expire_stale_proformas() from public, anon;
grant execute on function expire_stale_proformas() to authenticated;

create index if not exists idx_orders_pending_confirmation
  on orders(created_at) where internal_approval = 'pending';

-- ---------------------------------------------------------------------
-- 4. Teach the recurring runner to stamp its own orders
-- ---------------------------------------------------------------------
-- Reproduced verbatim from migration 6 except for the INSERT, which now sets
-- recurring_id. Copying a long function to change one line is unpleasant, but
-- CREATE OR REPLACE has no way to patch a body, and the alternative — a magic
-- session flag the trigger reads — hides the rule somewhere nobody will find.
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
                      notes, internal_approval, recurring_id)
  values (v_rec.company_id, v_po, 'pending_approval', 'SDG', v_fx, 0, 0, 0,
          v_addr, v_uid, v_rec.name, 'not_required', p_recurring_id)
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

revoke execute on function run_recurring_order(uuid) from public, anon;
grant execute on function run_recurring_order(uuid) to authenticated;
