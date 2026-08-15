-- Zawed Supply — proforma-first ordering
--
-- The business rule, as of migration 15:
--
--     pick what you need  →  a proforma you can print  →  you confirm it
--
-- One person, two steps, the same for everybody. The second-signature
-- workflow still exists but is off by default, behind
-- companies.requires_internal_approval — so this suite covers both the simple
-- mode that everyone gets and the strict mode a company can opt into later.
--
-- The part worth testing is the gate. It is easy to write a confirm button;
-- what matters is that an unconfirmed order cannot be worked on by ANYONE,
-- including staff who never saw it, and that an abandoned proforma gives its
-- stock back instead of holding it for good.

\set QUIET on
set client_min_messages = notice;
\o /dev/null

\set requester '''00000000-0000-0000-0000-0000000000b1'''
\set approver  '''00000000-0000-0000-0000-0000000000b2'''
\set sales     '''00000000-0000-0000-0000-0000000000b3'''
\set mate      '''00000000-0000-0000-0000-0000000000b4'''
\set company   '''00000000-0000-0000-0000-0000000000c9'''
\set paper     '''00000000-0000-0000-0000-0000000000d9'''

insert into auth.users (id, email) values
  (:requester, 'req@relief.org'), (:approver, 'admin@relief.org'),
  (:sales, 'sales@zawed.com'), (:mate, 'mate@relief.org');
insert into companies (id, name_ar, requires_po_number) values (:company, 'منظمة ريلف الدولية', false);
insert into profiles (id, full_name, role, company_id) values
  (:requester, 'طالب الشراء',  'customer_requester', :company),
  (:approver,  'مسؤول الحساب', 'customer_admin',     :company),
  (:mate,      'زميل',         'customer_requester', :company),
  (:sales,     'مبيعات',       'sales',              null);
insert into categories (id, name_ar) values ('00000000-0000-0000-0000-0000000000e9','ورق');
insert into products (id, sku, name_ar, category_id, min_order_qty, is_active) values
  (:paper, 'ZW-A4', 'ورق A4', '00000000-0000-0000-0000-0000000000e9', 1, true);
insert into product_prices (product_id, cost_usd, margin_percent) values (:paper, 3.50, 25);
insert into inventory (product_id, qty_on_hand, qty_reserved, reorder_point) values (:paper, 500, 0, 50);
insert into fx_rates (rate_sdg_per_usd, source) values (2600, 'parallel_market');

\echo '── simple mode: you order, you confirm ─────────────────────'
\set QUIET off

-- 1. Ordering produces a proforma, not a live order.
select t.allowed(:requester, 'authenticated',
  $$select place_order('[{"product_id":"00000000-0000-0000-0000-0000000000d9","qty":10}]'::jsonb, 'الخرطوم')$$,
  'requester places an order');
select t.eq((select status::text from orders), 'pending_approval', 'it lands as a proforma');
select t.eq((select internal_approval::text from orders), 'pending', 'awaiting confirmation');

-- 2. Stock is held while it waits. Not holding it would let a second order
--    sell the same units out from under a proforma already printed.
select t.eq((select qty_reserved from inventory), 10, 'stock is reserved while it waits');
select t.eq((select qty_on_hand from inventory), 500, 'on-hand is untouched until it ships');

-- 3. The gate. Staff cannot move an unconfirmed order, in either direction.
select t.denied(:sales, 'authenticated', $$update orders set status = 'picking'$$,
  'staff cannot start picking an unconfirmed order', 'بانتظار موافقة مسؤول حساب الشركة');
select t.denied(:sales, 'authenticated', $$update orders set status = 'delivered'$$,
  'staff cannot jump an unconfirmed order to delivered', 'بانتظار موافقة مسؤول حساب الشركة');

-- 4. …but a colleague cannot confirm it for you. Simple mode is not "anyone
--    can sign anything" — it is "the person who asked, confirms".
select t.denied(:mate, 'authenticated',
  $$select decide_internal_approval((select id from orders), true, null)$$,
  'a colleague cannot confirm your order', 'يمكنك تأكيد طلباتك أنت فقط');

-- 5. The person who placed it confirms it. That is the whole second step.
select t.allowed(:requester, 'authenticated',
  $$select decide_internal_approval((select id from orders), true, 'أؤكد الطلب')$$,
  'the requester confirms their own order');
select t.eq((select internal_approval::text from orders), 'approved', 'confirmation recorded');
select t.eq((select status::text from orders), 'confirmed', 'confirmation makes it a live order');
select t.eq((select approval_comment from orders), 'أؤكد الطلب', 'the note is kept');

-- 6. With the gate open, staff can work.
select t.allowed(:sales, 'authenticated', $$update orders set status = 'picking'$$,
  'staff can progress a confirmed order');
select t.eq((select status::text from orders), 'picking', 'the order moved to picking');

-- 7. Confirming twice would overwrite the decision and its audit trail.
select t.denied(:requester, 'authenticated',
  $$select decide_internal_approval((select id from orders), true, null)$$,
  'confirming twice is refused', 'لا ينتظر تأكيداً');

-- 8. A customer_admin's own order goes through the same two steps. Under the
--    old rule theirs skipped confirmation entirely, which meant one class of
--    user never saw the proforma before it became an order.
select t.allowed(:approver, 'authenticated',
  $$select place_order('[{"product_id":"00000000-0000-0000-0000-0000000000d9","qty":5}]'::jsonb, 'الخرطوم')$$,
  'the account owner places an order too');
select t.eq((select internal_approval::text from orders order by created_at desc limit 1),
            'pending', 'their order is also a proforma first');
select t.allowed(:approver, 'authenticated',
  $$select decide_internal_approval((select id from orders where internal_approval = 'pending'), true, null)$$,
  'and they confirm it themselves');

-- 9. Declining releases the stock. A cancelled proforma that keeps its
--    reservation quietly makes inventory unsellable.
select t.allowed(:requester, 'authenticated',
  $$select place_order('[{"product_id":"00000000-0000-0000-0000-0000000000d9","qty":25}]'::jsonb, 'الخرطوم')$$,
  'requester raises a third proforma');
select t.eq((select qty_reserved from inventory), 40, 'all three are holding stock');
select t.allowed(:requester, 'authenticated',
  $$select decide_internal_approval((select id from orders where internal_approval = 'pending'), false, 'لم نعد نحتاجه')$$,
  'the requester cancels their own proforma');
select t.eq((select status::text from orders where internal_approval = 'rejected'), 'cancelled',
            'declining cancels the order');
select t.eq((select qty_reserved from inventory), 15, 'declining releases the reserved stock');

\echo '── abandoned proformas expire ──────────────────────────────'

-- 10. Stock held by a proforma nobody ever confirms has to come back, or the
--     warehouse becomes unsellable on paper one abandoned basket at a time.
select t.allowed(:requester, 'authenticated',
  $$select place_order('[{"product_id":"00000000-0000-0000-0000-0000000000d9","qty":30}]'::jsonb, 'الخرطوم')$$,
  'a proforma is raised and then abandoned');
select t.eq((select qty_reserved from inventory), 45, 'it is holding its stock');

-- Age it past the expiry window.
update orders set created_at = now() - interval '8 days' where internal_approval = 'pending';
select t.eq((select expire_stale_proformas()), 1, 'one stale proforma is expired');
select t.eq((select qty_reserved from inventory), 15, 'its stock is released');
select t.eq((select status::text from orders order by created_at limit 1), 'cancelled',
            'the expired proforma is cancelled');

-- 11. …and a proforma inside the window is left alone.
select t.allowed(:requester, 'authenticated',
  $$select place_order('[{"product_id":"00000000-0000-0000-0000-0000000000d9","qty":3}]'::jsonb, 'الخرطوم')$$,
  'a fresh proforma is raised');
select t.eq((select expire_stale_proformas()), 0, 'a fresh proforma is not expired');
select t.eq((select internal_approval::text from orders order by created_at desc limit 1),
            'pending', 'it is still waiting for its owner');

\echo '── strict mode: the two-person rule, opted into ────────────'

-- 12. This is the "add permissions later" switch. Turning it on restores the
--     rule the platform used to impose on everybody.
update companies set requires_internal_approval = true where id = :company;

select t.allowed(:requester, 'authenticated',
  $$select place_order('[{"product_id":"00000000-0000-0000-0000-0000000000d9","qty":4}]'::jsonb, 'الخرطوم')$$,
  'requester places an order under the two-person rule');
select t.denied(:requester, 'authenticated',
  $$select decide_internal_approval((select id from orders order by created_at desc limit 1), true, null)$$,
  'now they cannot confirm their own order', 'مخصّصة لمسؤول حساب الشركة');
select t.allowed(:approver, 'authenticated',
  $$select decide_internal_approval((select id from orders order by created_at desc limit 1), true, 'معتمد')$$,
  'the account owner signs it instead');
select t.eq((select status::text from orders order by created_at desc limit 1), 'confirmed',
            'and that confirms the order');

-- 13. Nobody outside the company reaches any of it.
select t.denied(:sales, 'authenticated',
  $$select decide_internal_approval((select id from orders limit 1), true, null)$$,
  'staff cannot confirm on the customer''s behalf', 'مخصّص لحسابات العملاء');

\echo '── recurring orders are exempt ─────────────────────────────'

-- 14. A recurring order was agreed once, when the schedule was created.
--     Demanding a fresh confirmation every cycle would defeat the feature —
--     the customer set it up precisely so they would not have to act monthly.
update companies set requires_internal_approval = false where id = :company;

insert into recurring_orders (id, company_id, name, frequency, items, created_by)
values ('00000000-0000-0000-0000-0000000000f7', :company, 'توريد شهري', 'monthly',
        '[{"product_id":"00000000-0000-0000-0000-0000000000d9","qty":6}]'::jsonb, :requester);

select t.allowed(:requester, 'authenticated',
  $$select run_recurring_order('00000000-0000-0000-0000-0000000000f7')$$,
  'the recurring schedule runs');
select t.eq((select internal_approval::text from orders where recurring_id is not null),
            'not_required', 'a recurring order needs no confirmation');
select t.eq((select count(*) from orders where recurring_id = '00000000-0000-0000-0000-0000000000f7'),
            1::bigint, 'and it records which schedule produced it');

-- 15. …so the expiry sweep must never touch it either, however old it gets.
update orders set created_at = now() - interval '90 days' where recurring_id is not null;
select t.eq((select expire_stale_proformas()), 0, 'an old recurring order is not expired');
select t.eq((select status::text from orders where recurring_id is not null),
            'pending_approval', 'it is still awaiting the supplier, not cancelled');
