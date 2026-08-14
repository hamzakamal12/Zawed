-- Zawed Supply — customer-initiated quote requests (RFQ)
--
-- What this suite is really guarding: a customer may ASK for a price but must
-- never be able to SET one, see another company's requests, or move a request
-- through the workflow themselves.

\set QUIET on
set client_min_messages = notice;
-- Assertions report through NOTICE (stderr); the result table of every
-- `select t.…()` is just an empty column and would bury them.
\o /dev/null

\set buyer   '''00000000-0000-0000-0000-0000000000a1'''
\set other   '''00000000-0000-0000-0000-0000000000a2'''
\set sales   '''00000000-0000-0000-0000-0000000000a3'''
\set co_ours '''00000000-0000-0000-0000-0000000000c1'''
\set co_them '''00000000-0000-0000-0000-0000000000c2'''
\set paper   '''00000000-0000-0000-0000-0000000000d1'''
\set pen     '''00000000-0000-0000-0000-0000000000d2'''
\set halted  '''00000000-0000-0000-0000-0000000000d3'''

-- ── seed ─────────────────────────────────────────────────────────────
insert into auth.users (id, email) values
  (:buyer, 'buyer@relief.org'), (:other, 'other@nile.com'), (:sales, 'sales@zawed.com');

insert into companies (id, name_ar, payment_terms_days) values
  (:co_ours, 'منظمة ريلف الدولية', 30),
  (:co_them, 'شركة النيل الأزرق', 15);

insert into profiles (id, full_name, role, company_id) values
  (:buyer, 'مشترٍ',     'customer_requester', :co_ours),
  (:other, 'مشترٍ آخر', 'customer_admin',     :co_them),
  (:sales, 'مبيعات',    'sales',              null);

insert into categories (id, name_ar) values ('00000000-0000-0000-0000-0000000000e1','ورق');
insert into products (id, sku, name_ar, category_id, min_order_qty, is_active) values
  (:paper,  'ZW-PAP-A4','ورق A4',     '00000000-0000-0000-0000-0000000000e1', 5,  true),
  (:pen,    'ZW-PEN',   'قلم',        '00000000-0000-0000-0000-0000000000e1', 10, true),
  (:halted, 'ZW-OLD',   'صنف موقوف',  '00000000-0000-0000-0000-0000000000e1', 1,  false);
insert into product_prices (product_id, cost_usd, margin_percent) values
  (:paper, 3.50, 25), (:pen, 0.40, 30);
insert into fx_rates (rate_sdg_per_usd, source) values (2600, 'parallel_market');

\echo '── RFQ ─────────────────────────────────────────────────────'
\set QUIET off

-- 1. A customer submits a request: two catalog lines and one free-text line.
select t.allowed(:buyer, 'authenticated', $$
  select submit_quote_request(
    '[{"product_id":"00000000-0000-0000-0000-0000000000d1","qty":50},
      {"product_id":"00000000-0000-0000-0000-0000000000d2","qty":200},
      {"description":"30 جالون زيت","qty":30,"note":"سعة 20 لتر"}]'::jsonb,
    'مطلوب لمشروع الخرطوم', current_date + 14)
$$, 'customer submits an RFQ');

-- 2. The row carries the company from the PROFILE, not from anything the
--    client sent — that is what makes the company un-spoofable.
select t.eq((select company_id from quote_requests), :co_ours::uuid,
            'company taken from the caller profile');
select t.eq((select count(*) from quote_request_items), 3::bigint, 'all three lines stored');
select t.eq((select request_number from quote_requests), 'RFQ-2026-0001', 'document number issued');
select t.eq((select status::text from quote_requests), 'submitted', 'starts as submitted');

-- 3. Prices are staff territory. A customer writing a quotation directly would
--    make the whole pricing engine decorative.
--
--    Both of these are stopped by the document-number trigger before RLS is
--    even consulted — next_doc_number() is revoked from `authenticated`, so
--    the row cannot be built at all. Pinning the message keeps that honest: if
--    the grant were ever loosened these would start failing for the RLS
--    reason instead, and someone would have to look.
select t.denied(:buyer, 'authenticated',
  format('insert into quotations (company_id, total) values (%L, 999)', :co_ours),
  'customer cannot insert a quotation', 'permission denied for function next_doc_number');

select t.denied(:buyer, 'authenticated',
  format('insert into quote_requests (company_id) values (%L)', :co_ours),
  'customer cannot insert an RFQ row directly', 'permission denied for function next_doc_number');

-- 4. And behind that trigger there is no INSERT policy for them either, so the
--    RPC really is the only door in.
select t.eq(
  (select count(*) from pg_policies
    where tablename = 'quote_requests' and cmd = 'INSERT'
      and coalesce(with_check, '') !~ 'is_staff'),
  0::bigint, 'every INSERT policy on quote_requests requires staff');

-- 5. RLS isolation, in both directions.
select t.rows(:other, 'authenticated', 'select 1 from quote_requests', 0::bigint,
              'another company sees no requests');
select t.rows(:other, 'authenticated', 'select 1 from quote_request_items', 0::bigint,
              'another company sees no request lines');
select t.rows(:buyer, 'authenticated', 'select 1 from quote_requests', 1::bigint,
              'the owning company sees its own request');

-- 6. Input the RPC must refuse.
select t.denied(:buyer, 'authenticated',
  $$select submit_quote_request('[{"product_id":"00000000-0000-0000-0000-0000000000d3","qty":5}]'::jsonb)$$,
  'an inactive product is refused');
select t.denied(:buyer, 'authenticated',
  $$select submit_quote_request('[]'::jsonb)$$,
  'an empty basket is refused');
select t.denied(:buyer, 'authenticated',
  $$select submit_quote_request('[{"description":"شيء","qty":1}]'::jsonb, null, current_date - 1)$$,
  'a needed-by date in the past is refused');
select t.denied(:buyer, 'authenticated',
  $$select submit_quote_request('[{"description":"شيء","qty":0}]'::jsonb)$$,
  'a zero quantity leaves nothing to price');

-- 7. Status is the workflow, so the customer must not be able to drive it.
--    The USING clause lets them reach their own row — cancelling is theirs to
--    do — and the WITH CHECK is what refuses any status other than
--    'cancelled', so this raises rather than filtering to zero rows.
select t.denied(:buyer, 'authenticated',
  $$update quote_requests set status = 'quoted'$$,
  'customer cannot self-promote the request', 'row-level security policy');
select t.eq((select status::text from quote_requests), 'submitted', 'status is unchanged');

-- 8. Staff claim it, then price it.
select t.allowed(:sales, 'authenticated',
  $$select claim_quote_request(id) from quote_requests where request_number = 'RFQ-2026-0001'$$,
  'sales claims the request');
select t.eq((select status::text from quote_requests), 'in_review', 'claiming moves it to in_review');

select t.allowed(:sales, 'authenticated', $$
  select quote_request_to_quotation(
    (select id from quote_requests where request_number = 'RFQ-2026-0001'), 0, 7)
$$, 'sales converts it into a quotation');

select t.eq((select status::text from quote_requests), 'quoted', 'request is now quoted');
select t.ok((select quotation_id is not null from quote_requests), 'request links to the quotation');

-- 9. Only the two catalog lines can carry a price; the free-text line is
--    reported back to the sales rep, never silently priced at zero.
select t.eq((select count(*) from quotation_items), 2::bigint, 'only catalog lines are priced');

-- 10. The price is the live engine's, not a stored number:
--     3.50 × 1.25 × 2600 = 11 375 → rounded UP to 11 400.
select t.eq(
  (select qi.unit_price_snapshot from quotation_items qi
    join products p on p.id = qi.product_id where p.sku = 'ZW-PAP-A4'),
  11400::numeric, 'unit price = cost × margin × fx, rounded up to 100');
select t.eq(
  (select qi.line_total from quotation_items qi
    join products p on p.id = qi.product_id where p.sku = 'ZW-PAP-A4'),
  570000::numeric, 'line total = 50 × 11 400');

-- 11. Pricing the same request twice would issue two quotations for one ask.
select t.denied(:sales, 'authenticated',
  $$select quote_request_to_quotation((select id from quote_requests where request_number = 'RFQ-2026-0001'))$$,
  're-pricing an already-quoted request is refused');

-- 12. A customer may withdraw an OPEN request, and only their own.
select t.allowed(:buyer, 'authenticated',
  $$select submit_quote_request('[{"product_id":"00000000-0000-0000-0000-0000000000d1","qty":5}]'::jsonb)$$,
  'customer submits a second request');
select t.allowed(:buyer, 'authenticated',
  $$select cancel_quote_request(id) from quote_requests where status = 'submitted'$$,
  'customer cancels their open request');
select t.eq((select status::text from quote_requests where request_number = 'RFQ-2026-0002'),
            'cancelled', 'the open request is cancelled');
select t.eq((select status::text from quote_requests where request_number = 'RFQ-2026-0001'),
            'quoted', 'the quoted request is untouched');
select t.denied(:other, 'authenticated',
  $$select cancel_quote_request((select id from quote_requests where request_number = 'RFQ-2026-0001'))$$,
  'another company cannot cancel ours');

-- 13. Anonymous visitors have no business here at all.
-- Not "sees zero rows" — anon holds no grant on the table at all, which is a
-- stronger statement and the one the migration's explicit REVOKE makes.
select t.denied(null, 'anon', 'select 1 from quote_requests',
                'anon has no grant on quote_requests', 'permission denied for table quote_requests');
select t.denied(null, 'anon', 'select 1 from quote_request_items',
                'anon has no grant on quote_request_items', 'permission denied for table quote_request_items');
select t.denied(null, 'anon',
  $$select submit_quote_request('[{"description":"x","qty":1}]'::jsonb)$$,
  'anon cannot submit a request');
