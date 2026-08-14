-- Zawed Supply — the exchange-rate age limit
--
-- Every price here is cost × margin × fx, and fx is a number a human types in.
-- A rate nobody has refreshed does not make prices slightly wrong — in a
-- fast-moving market it sells below cost on every line until somebody notices
-- at invoicing time.
--
-- The suite is mostly about the boundary being enforced where money is
-- committed, not merely displayed on the screen the admin is not looking at.

\set QUIET on
set client_min_messages = notice;
\o /dev/null

\set buyer   '''00000000-0000-0000-0000-0000000009a1'''
\set admin   '''00000000-0000-0000-0000-0000000009a2'''
\set sales   '''00000000-0000-0000-0000-0000000009a3'''
\set company '''00000000-0000-0000-0000-0000000009c1'''
\set product '''00000000-0000-0000-0000-0000000009d1'''

insert into auth.users (id, email) values
  (:buyer, 'buyer@relief.org'), (:admin, 'admin@zawed.com'), (:sales, 'sales@zawed.com');
insert into companies (id, name_ar) values (:company, 'منظمة ريلف');
insert into profiles (id, full_name, role, company_id) values
  (:buyer, 'مسؤول الحساب', 'customer_admin', :company),
  (:admin, 'مدير',         'admin',          null),
  (:sales, 'مبيعات',       'sales',          null);
insert into categories (id, name_ar) values ('00000000-0000-0000-0000-0000000009e1','ورق');
insert into products (id, sku, name_ar, category_id, min_order_qty) values
  (:product, 'ZW-A4', 'ورق A4', '00000000-0000-0000-0000-0000000009e1', 1);
insert into product_prices (product_id, cost_usd, margin_percent) values (:product, 3.50, 25);
insert into inventory (product_id, qty_on_hand, qty_reserved) values (:product, 500, 0);

\echo '── fx age limit ────────────────────────────────────────────'
\set QUIET off

-- 1. The defaults are the shipped policy: notice at two days, stop at seven.
select t.eq((select fx_warn_after_hours from app_settings), 48, 'warns after 48 hours by default');
select t.eq((select fx_block_after_hours from app_settings), 168, 'blocks after 7 days by default');
select t.eq((select count(*) from app_settings), 1::bigint, 'settings is a single row');

-- 2. With no rate at all nothing can be priced, and that must not read as
--    "age zero" — a brand-new database would otherwise happily sell at null.
select t.ok((select rate is null from fx_status()), 'no rate yet');
select t.ok((select is_expired from fx_status()), 'no rate counts as expired');
select t.denied(:buyer, 'authenticated',
  format($$select place_order('[{"product_id":"%s","qty":5}]'::jsonb, 'الخرطوم')$$, :product),
  'no rate blocks ordering', 'لم يتم ضبط سعر الصرف');

-- 3. A fresh rate: no warning, no block.
insert into fx_rates (rate_sdg_per_usd, source, effective_from)
  values (2600, 'parallel_market', now());
select t.ok((select not is_stale from fx_status()), 'a rate set now is not stale');
select t.ok((select not is_expired from fx_status()), 'a rate set now is not expired');
select t.allowed(:buyer, 'authenticated',
  format($$select place_order('[{"product_id":"%s","qty":5}]'::jsonb, 'الخرطوم')$$, :product),
  'ordering works on a fresh rate');

-- 4. Three days old: past the warning line, still sellable. This is the case
--    the two thresholds exist for — an admin away for a long weekend must not
--    take the whole store down with them.
delete from fx_rates;
insert into fx_rates (rate_sdg_per_usd, source, effective_from)
  values (2600, 'parallel_market', now() - interval '72 hours');
select t.ok((select is_stale from fx_status()), 'three days old is stale');
select t.ok((select not is_expired from fx_status()), 'three days old is not yet blocked');
select t.eq((select round(age_hours) from fx_status()), 72::numeric, 'the age is reported in hours');
select t.allowed(:buyer, 'authenticated',
  format($$select place_order('[{"product_id":"%s","qty":5}]'::jsonb, 'الخرطوم')$$, :product),
  'a stale-but-not-expired rate still sells');

-- 5. Eight days old: refuse. Both for orders and for quotations — a quotation
--    on a dead rate becomes an order at a price that cannot be honoured.
delete from fx_rates;
insert into fx_rates (rate_sdg_per_usd, source, effective_from)
  values (2600, 'parallel_market', now() - interval '8 days');
select t.ok((select is_expired from fx_status()), 'eight days old is expired');
select t.denied(:buyer, 'authenticated',
  format($$select place_order('[{"product_id":"%s","qty":5}]'::jsonb, 'الخرطوم')$$, :product),
  'an expired rate blocks new orders', 'سعر الصرف قديم');
select t.denied(:sales, 'authenticated',
  format($$select create_quotation(%L, '[{"product_id":"%s","qty":5}]'::jsonb)$$, :company, :product),
  'an expired rate blocks new quotations', 'سعر الصرف قديم');

-- 6. Nothing is stopped that should not be. Existing orders stay readable and
--    workable; the limit is about creating new priced documents, not about
--    freezing the business.
select t.rows(:sales, 'authenticated', 'select 1 from orders', 2::bigint,
              'orders placed earlier are still there');
select t.allowed(:sales, 'authenticated',
  $$update orders set status = 'picking' where status = 'pending_approval'$$,
  'staff can still work existing orders on an expired rate');

-- 7. Updating the rate clears it immediately — the way out is obvious and
--    is the action the error message asks for.
insert into fx_rates (rate_sdg_per_usd, source) values (2750, 'parallel_market');
select t.ok((select not is_expired from fx_status()), 'a new rate unblocks the platform');
select t.allowed(:buyer, 'authenticated',
  format($$select place_order('[{"product_id":"%s","qty":5}]'::jsonb, 'الخرطوم')$$, :product),
  'ordering resumes at once');

-- 8. The thresholds are the admin's to set, and nobody else's — otherwise the
--    limit is advisory, since anyone blocked could raise it.
select t.allowed(:admin, 'authenticated',
  $$update app_settings set fx_warn_after_hours = 12, fx_block_after_hours = 24$$,
  'an admin can change the thresholds');
select t.eq((select fx_block_after_hours from app_settings), 24, 'the new threshold is stored');
-- RLS filters a non-admin UPDATE to zero rows rather than raising, so assert
-- on what the statement actually changed.
select t.affected(:buyer, 'authenticated',
  $$update app_settings set fx_block_after_hours = 8760$$,
  0::bigint, 'a customer cannot raise the limit');
select t.affected(:sales, 'authenticated',
  $$update app_settings set fx_block_after_hours = 8760$$,
  0::bigint, 'sales cannot raise the limit either');
select t.eq((select fx_block_after_hours from app_settings), 24, 'the threshold is unchanged');

-- 9. A block threshold below the warn threshold would mean the platform stops
--    before it ever warns.
select t.denied(:admin, 'authenticated',
  $$update app_settings set fx_warn_after_hours = 100, fx_block_after_hours = 10$$,
  'blocking cannot come before warning', 'app_settings_thresholds');

-- 10. …and the new, tighter threshold takes effect on the rate already set.
select t.allowed(:admin, 'authenticated',
  $$update app_settings set fx_warn_after_hours = 1, fx_block_after_hours = 2$$,
  'admin tightens the limit to two hours');
delete from fx_rates;
insert into fx_rates (rate_sdg_per_usd, source, effective_from)
  values (2750, 'parallel_market', now() - interval '3 hours');
select t.ok((select is_expired from fx_status()), 'a three-hour-old rate now counts as expired');
select t.denied(:buyer, 'authenticated',
  format($$select place_order('[{"product_id":"%s","qty":5}]'::jsonb, 'الخرطوم')$$, :product),
  'the tightened limit is enforced', 'سعر الصرف قديم');

-- 11. anon has no business reading the platform's configuration.
select t.denied(null, 'anon', 'select 1 from app_settings',
                'anon cannot read settings', 'permission denied for table app_settings');
select t.eq(has_function_privilege('anon','fx_status()','execute'), false,
            'anon cannot call fx_status');
