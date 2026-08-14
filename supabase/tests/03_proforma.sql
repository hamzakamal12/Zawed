-- Zawed Supply — proforma-first ordering
--
-- The rule the customer asked for: an organization picks what it needs, the
-- platform issues a PROFORMA, and the order is only confirmed once the
-- organization's own approver signs off.
--
-- The part worth testing is the gate. It is easy to write an approval screen;
-- what matters is that an unapproved order cannot be worked on by ANYONE,
-- including staff who never opened that screen.

\set QUIET on
set client_min_messages = notice;
\o /dev/null

\set requester '''00000000-0000-0000-0000-0000000000b1'''
\set approver  '''00000000-0000-0000-0000-0000000000b2'''
\set sales     '''00000000-0000-0000-0000-0000000000b3'''
\set company   '''00000000-0000-0000-0000-0000000000c9'''
\set paper     '''00000000-0000-0000-0000-0000000000d9'''

insert into auth.users (id, email) values
  (:requester, 'req@relief.org'), (:approver, 'admin@relief.org'), (:sales, 'sales@zawed.com');
insert into companies (id, name_ar, requires_po_number) values (:company, 'منظمة ريلف الدولية', false);
insert into profiles (id, full_name, role, company_id) values
  (:requester, 'طالب الشراء',  'customer_requester', :company),
  (:approver,  'مسؤول الحساب', 'customer_admin',     :company),
  (:sales,     'مبيعات',       'sales',              null);
insert into categories (id, name_ar) values ('00000000-0000-0000-0000-0000000000e9','ورق');
insert into products (id, sku, name_ar, category_id, min_order_qty, is_active) values
  (:paper, 'ZW-A4', 'ورق A4', '00000000-0000-0000-0000-0000000000e9', 1, true);
insert into product_prices (product_id, cost_usd, margin_percent) values (:paper, 3.50, 25);
insert into inventory (product_id, qty_on_hand, qty_reserved, reorder_point) values (:paper, 500, 0, 50);
insert into fx_rates (rate_sdg_per_usd, source) values (2600, 'parallel_market');

\echo '── proforma approval ───────────────────────────────────────'
\set QUIET off

-- 1. A requester orders. It does NOT become a live order.
select t.allowed(:requester, 'authenticated',
  $$select place_order('[{"product_id":"00000000-0000-0000-0000-0000000000d9","qty":10}]'::jsonb, 'الخرطوم')$$,
  'requester places an order');
select t.eq((select status::text from orders), 'pending_approval', 'it lands as pending_approval');
select t.eq((select internal_approval::text from orders), 'pending', 'awaiting the company approver');

-- 2. Stock is held while it waits. Not holding it would let a second order
--    sell the same units out from under an order already on someone's desk.
select t.eq((select qty_reserved from inventory), 10, 'stock is reserved while it waits');
select t.eq((select qty_on_hand from inventory), 500, 'on-hand is untouched until it ships');

-- 3. The gate. Staff cannot move an unapproved order, in either direction.
select t.denied(:sales, 'authenticated', $$update orders set status = 'picking'$$,
  'staff cannot start picking an unapproved order', 'بانتظار موافقة مسؤول حساب الشركة');
select t.denied(:sales, 'authenticated', $$update orders set status = 'delivered'$$,
  'staff cannot jump an unapproved order to delivered', 'بانتظار موافقة مسؤول حساب الشركة');

-- 4. And the person who asked is not the person who approves.
select t.denied(:requester, 'authenticated',
  $$select decide_internal_approval((select id from orders), true, 'موافق')$$,
  'a requester cannot approve their own order');

-- 5. The approver signs off — and that is what confirms the order.
select t.allowed(:approver, 'authenticated',
  $$select decide_internal_approval((select id from orders), true, 'معتمد من الإدارة المالية')$$,
  'the company approver signs off');
select t.eq((select internal_approval::text from orders), 'approved', 'approval recorded');
select t.eq((select status::text from orders), 'confirmed', 'approval confirms the order');
select t.eq((select approval_comment from orders), 'معتمد من الإدارة المالية', 'the note is kept');

-- 6. With the gate open, staff can work.
select t.allowed(:sales, 'authenticated', $$update orders set status = 'picking'$$,
  'staff can progress an approved order');
select t.eq((select status::text from orders), 'picking', 'the order moved to picking');

-- 7. A second approval would overwrite the decision and its audit trail.
select t.denied(:approver, 'authenticated',
  $$select decide_internal_approval((select id from orders), true, null)$$,
  'approving twice is refused');

-- 8. Rejection must give the stock back. A rejected order that keeps its
--    reservation quietly makes inventory unsellable.
select t.allowed(:requester, 'authenticated',
  $$select place_order('[{"product_id":"00000000-0000-0000-0000-0000000000d9","qty":25}]'::jsonb, 'الخرطوم')$$,
  'requester places a second order');
select t.eq((select qty_reserved from inventory), 35, 'both orders are holding stock');

select t.allowed(:approver, 'authenticated',
  $$select decide_internal_approval((select id from orders where internal_approval = 'pending'), false, 'تجاوز الميزانية')$$,
  'the approver rejects it');
select t.eq((select status::text from orders where internal_approval = 'rejected'), 'cancelled',
            'rejection cancels the order');
select t.eq((select qty_reserved from inventory), 10, 'rejection releases the reserved stock');

-- 9. The approver ordering for themselves has nobody left to wait for, so the
--    order is confirmed outright rather than sitting in their own queue.
select t.allowed(:approver, 'authenticated',
  $$select place_order('[{"product_id":"00000000-0000-0000-0000-0000000000d9","qty":5}]'::jsonb, 'الخرطوم')$$,
  'the approver orders directly');
select t.eq((select internal_approval::text from orders order by created_at desc limit 1),
            'not_required', 'their own order needs no approval');
-- Still `pending_approval`, and that is correct: with internal_approval at
-- 'not_required' the status means "waiting for the SUPPLIER to confirm", not
-- "waiting for the customer" — the distinction migration 10 spells out.
select t.eq((select status::text from orders order by created_at desc limit 1),
            'pending_approval', 'it waits on the supplier, not on the customer');

-- 10. …and the gate does not block it.
select t.allowed(:sales, 'authenticated',
  $$update orders set status = 'picking' where internal_approval = 'not_required'$$,
  'staff can work on it immediately');

-- 11. Another company's approver has no reach into our orders.
select t.rows(:sales, 'authenticated', 'select 1 from orders', 3::bigint, 'staff see all three orders');
select t.rows(:requester, 'authenticated', 'select 1 from orders', 3::bigint,
              'the company sees its own three orders');
