-- Zawed Supply — Migration 9 : proforma-first ordering
--
-- The intended purchasing flow for an organization is:
--   the buyer picks what they need  ->  a PROFORMA INVOICE is produced
--   ->  the company's own officials approve it  ->  the order is confirmed.
--
-- Two pieces of that were missing. The internal approval step existed but was
-- advisory: approving left the order exactly where it was, and nothing stopped
-- the supplier from picking, shipping and invoicing an order the customer's
-- own manager had not yet approved. This closes both.
--
-- Stock is already reserved by place_order() at submission time and released
-- on rejection, so confirming on approval does not skip a stock check — the
-- goods were held the moment the proforma was raised.

-- ---------------------------------------------------------------------
-- 1. Approving now confirms the order
-- ---------------------------------------------------------------------
create or replace function decide_internal_approval(
  p_order_id uuid,
  p_approve  boolean,
  p_comment  text default null
)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_uid     uuid := auth.uid();
  v_company uuid;
  v_role    user_role;
  v_order   orders%rowtype;
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
         -- Approval is what turns the proforma into a live order.
         status            = (case when p_approve then 'confirmed' else 'cancelled' end)::order_status
   where id = p_order_id;

  -- Rejection releases the stock the proforma was holding.
  if not p_approve then
    update inventory i
       set qty_reserved = greatest(i.qty_reserved - oi.qty, 0)
      from order_items oi
     where oi.order_id = p_order_id and oi.product_id = i.product_id;
  end if;
end $$;

-- ---------------------------------------------------------------------
-- 2. An unapproved proforma cannot be worked on
-- ---------------------------------------------------------------------
-- Without this the approval gate is decoration: `orders` is updatable by any
-- staff member, so the warehouse could pick and deliver an order the customer
-- had not authorised. The carve-out is the approval decision itself, which
-- moves internal_approval and status in the same statement.
create or replace function block_unapproved_order_progress()
returns trigger language plpgsql set search_path = public as $$
begin
  if old.internal_approval = 'pending'
     and new.internal_approval = 'pending'
     and new.status is distinct from old.status then
    raise exception 'الطلب بانتظار موافقة مسؤول حساب الشركة'
      using errcode = '22023';
  end if;
  return new;
end $$;

drop trigger if exists trg_orders_block_unapproved on orders;
create trigger trg_orders_block_unapproved
  before update on orders
  for each row execute function block_unapproved_order_progress();

revoke execute on function block_unapproved_order_progress() from authenticated, anon, public;
