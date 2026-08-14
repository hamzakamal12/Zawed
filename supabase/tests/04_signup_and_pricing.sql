-- Zawed Supply — company sign-up requests, and repricing
--
-- Two things with sharp edges.
--
-- The sign-up form is the ONE thing an anonymous visitor may call. Everything
-- around it — reading the queue, approving, creating the company — is staff
-- work, and the boundary has to be exact: a public form that can also read
-- back other organizations' applications is a leak, not a feature.
--
-- Repricing has to keep exactly one live price row per product. Prices are
-- time-ranged, so two open rows means get_price() picks arbitrarily and the
-- catalog quietly shows a price the invoice will not match.

\set QUIET on
set client_min_messages = notice;
\o /dev/null

\set sales    '''00000000-0000-0000-0000-0000000000f1'''
\set admin    '''00000000-0000-0000-0000-0000000000f2'''
\set customer '''00000000-0000-0000-0000-0000000000f3'''
\set company  '''00000000-0000-0000-0000-0000000000f9'''
\set product  '''00000000-0000-0000-0000-0000000000d5'''

insert into auth.users (id, email) values
  (:sales, 'sales@zawed.com'), (:admin, 'admin@zawed.com'), (:customer, 'buyer@relief.org');
insert into companies (id, name_ar) values (:company, 'شركة قائمة');
insert into profiles (id, full_name, role, company_id) values
  (:sales,    'مبيعات', 'sales',          null),
  (:admin,    'مدير',   'admin',          null),
  (:customer, 'عميل',   'customer_admin', :company);
insert into categories (id, name_ar) values ('00000000-0000-0000-0000-0000000000e5','ورق');
insert into products (id, sku, name_ar, category_id) values
  (:product, 'ZW-T1', 'ورق اختبار', '00000000-0000-0000-0000-0000000000e5');
insert into fx_rates (rate_sdg_per_usd, source) values (2600, 'parallel_market');

\echo '── sign-up requests ────────────────────────────────────────'
\set QUIET off

-- 1. The public form works without a login. This is the whole point of it:
--    before this existed the landing page invited organizations to apply and
--    then sent them to a login they could not possibly have.
select t.allowed(null, 'anon', $$
  select submit_account_request(
    'منظمة الهلال الأخضر','أحمد محمد','ahmed@greencrescent.org','0912345678',
    'ngo','الخرطوم','500600700','نحتاج توريد شهري')
$$, 'an anonymous visitor can apply');
select t.eq((select status::text from account_requests), 'new', 'it lands in the staff queue');
select t.eq((select email from account_requests), 'ahmed@greencrescent.org', 'email stored lowercased');

-- 2. …and can read nothing back. A public form that doubles as a public
--    reader would expose every other organization that applied.
select t.denied(null, 'anon', 'select 1 from account_requests',
                'anon cannot read the queue', 'permission denied for table account_requests');
select t.eq(has_function_privilege('anon','approve_account_request(uuid,int,boolean,text)','execute'),
            false, 'anon cannot approve');
select t.eq(has_function_privilege('anon','set_product_price(uuid,numeric,numeric)','execute'),
            false, 'anon cannot reprice');
select t.eq(has_function_privilege('anon','submit_account_request(text,text,text,text,company_type,text,text,text)','execute'),
            true, 'anon CAN apply — the one thing it may do');

-- 3. A signed-in customer is not staff either.
select t.rows(:customer, 'authenticated', 'select 1 from account_requests', 0::bigint,
              'a customer sees no applications');

-- 4. One open application per email, case-insensitively — otherwise a refresh
--    or a bot fills the staff queue with the same organization.
select t.denied(null, 'anon', $$
  select submit_account_request('منظمة الهلال الأخضر','أحمد محمد','AHMED@greencrescent.org')
$$, 'a duplicate open application is refused', 'لدينا طلب مفتوح بهذا البريد');

-- 5. Input the RPC must refuse, so rubbish never reaches the queue.
select t.denied(null, 'anon', $$select submit_account_request('','x','not-an-email')$$,
                'an empty company name is refused', 'اسم المؤسسة مطلوب');
select t.denied(null, 'anon', $$select submit_account_request('مؤسسة','مسؤول','no-at-sign.example')$$,
                'an address with no @ is refused', 'بريد إلكتروني غير صالح');

-- 6. Staff see the queue and turn an application into a real company.
select t.rows(:sales, 'authenticated', 'select 1 from account_requests', 1::bigint,
              'staff see the queue');
select t.allowed(:sales, 'authenticated',
  $$select approve_account_request((select id from account_requests), 45, true, 'تم التحقق')$$,
  'staff approve the application');
select t.eq((select status::text from account_requests), 'approved', 'the application is approved');
select t.eq((select c.payment_terms_days from account_requests r join companies c on c.id = r.company_id),
            45, 'the payment terms from the approval are carried onto the company');
select t.eq((select c.requires_po_number from account_requests r join companies c on c.id = r.company_id),
            true, 'the PO requirement is carried onto the company');
select t.eq((select c.type::text from account_requests r join companies c on c.id = r.company_id),
            'ngo', 'the organization type the applicant chose is kept');

-- 7. Approving twice would create a second company for one application.
select t.denied(:sales, 'authenticated',
  $$select approve_account_request((select id from account_requests), 30, false, null)$$,
  'approving twice is refused', 'تمت الموافقة على هذا الطلب من قبل');

-- 8. The uniqueness rule covers OPEN applications only, so a branch office can
--    apply later under the same contact address.
select t.allowed(null, 'anon', $$
  select submit_account_request('منظمة الهلال الأخضر - فرع بورتسودان','أحمد','ahmed@greencrescent.org')
$$, 'once closed, the email is free to apply again');

\echo '── repricing ───────────────────────────────────────────────'

-- 9. Sales may quote, but only an admin sets what a thing costs.
select t.denied(:sales, 'authenticated',
  format('select set_product_price(%L, 3.50, 25)', :product),
  'sales cannot reprice', 'تعديل الأسعار مخصّص لمدير النظام');

-- 10. One live row after the first price…
select t.allowed(:admin, 'authenticated',
  format('select set_product_price(%L, 3.50, 25)', :product), 'admin sets a price');
select t.eq((select count(*) from product_prices
              where product_id = :product and (effective_to is null or effective_to > now())),
            1::bigint, 'exactly one live price row');
select t.eq((select unit_price_sdg from get_price(:product, null, 1)), 11400::numeric,
            'the live price is 3.50 × 1.25 × 2600, rounded up to 100');

-- 11. …and still exactly one after repricing, with the old row kept for
--     history rather than overwritten — a past invoice must stay explicable.
select t.allowed(:admin, 'authenticated',
  format('select set_product_price(%L, 4.00, 30)', :product), 'admin reprices');
select t.eq((select count(*) from product_prices where product_id = :product), 2::bigint,
            'the old price row is kept as history');
select t.eq((select count(*) from product_prices
              where product_id = :product and (effective_to is null or effective_to > now())),
            1::bigint, 'still exactly one live price row');
select t.eq((select unit_price_sdg from get_price(:product, null, 1)), 13600::numeric,
            'the new price is live: 4.00 × 1.30 × 2600 → 13 600');

-- 12. Nonsense that would silently produce a free or negative product.
select t.denied(:admin, 'authenticated', format('select set_product_price(%L, 0, 25)', :product),
                'a zero cost is refused', 'التكلفة بالدولار يجب أن تكون أكبر من صفر');
select t.denied(:admin, 'authenticated', format('select set_product_price(%L, 3.5, -5)', :product),
                'a negative margin is refused', 'هامش الربح لا يمكن أن يكون سالباً');

-- 13. And the thing the whole pricing design exists to protect: a customer can
--     see the price but never the cost or the margin behind it.
select t.rows(:customer, 'authenticated', 'select 1 from product_prices', 0::bigint,
              'a customer sees no cost or margin rows');
select t.eq((select unit_price_sdg from get_price(:product, null, 1)), 13600::numeric,
            'yet the price itself is readable');
