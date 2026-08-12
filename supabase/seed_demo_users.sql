-- =====================================================================
-- Zawed Supply — demo users + one sample order (needs the auth schema)
-- Run in the Supabase SQL editor, or include after seed.sql locally.
-- All demo accounts use password: password123
--   admin@zawed.com   → admin
--   buyer@relief.org  → customer_admin (International Relief Org, NGO)
-- =====================================================================

-- Fixed ids so the rows can reference each other
-- admin  a1..., buyer b1..., company c1...
insert into auth.users
  (instance_id, id, aud, role, email, encrypted_password,
   email_confirmed_at, created_at, updated_at,
   raw_app_meta_data, raw_user_meta_data,
   confirmation_token, recovery_token, email_change_token_new, email_change)
values
  ('00000000-0000-0000-0000-000000000000',
   '00000000-0000-0000-0000-0000000000a1','authenticated','authenticated',
   'admin@zawed.com', crypt('password123', gen_salt('bf')),
   now(), now(), now(),
   '{"provider":"email","providers":["email"]}', '{"full_name":"مدير النظام"}',
   '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000',
   '00000000-0000-0000-0000-0000000000b1','authenticated','authenticated',
   'buyer@relief.org', crypt('password123', gen_salt('bf')),
   now(), now(), now(),
   '{"provider":"email","providers":["email"]}', '{"full_name":"مسؤول المشتريات"}',
   '', '', '', '')
on conflict (id) do nothing;

-- NGO customer company
insert into companies (id, name_ar, name_en, type, tax_id, billing_address,
                       default_currency, payment_terms_days, credit_limit, requires_po_number)
values ('00000000-0000-0000-0000-0000000000c1',
        'منظمة الإغاثة الدولية', 'International Relief Organization', 'ngo',
        'NGO-SD-4471', 'الخرطوم - المعمورة، مربع 12', 'USD', 30, 50000, true)
on conflict (id) do nothing;

-- Profiles
insert into profiles (id, full_name, phone, role, company_id) values
  ('00000000-0000-0000-0000-0000000000a1','مدير النظام','+249900000001','admin', null),
  ('00000000-0000-0000-0000-0000000000b1','مسؤول المشتريات','+249900000002','customer_admin',
   '00000000-0000-0000-0000-0000000000c1')
on conflict (id) do nothing;

-- Negotiated contract discount for this NGO: 8% off A4 80gsm paper
insert into price_tiers (company_id, product_id, min_qty, discount_percent)
select '00000000-0000-0000-0000-0000000000c1', p.id, 1, 8.00
from products p where p.sku = 'PAP-A4-80';

-- ---------------------------------------------------------------------
-- One sample order + invoice + partial payment, priced via get_price()
-- ---------------------------------------------------------------------
do $$
declare
  v_company uuid := '00000000-0000-0000-0000-0000000000c1';
  v_buyer   uuid := '00000000-0000-0000-0000-0000000000b1';
  v_admin   uuid := '00000000-0000-0000-0000-0000000000a1';
  v_fx      numeric := current_fx_rate();
  v_order   uuid;
  v_invoice uuid;
  v_sub     numeric := 0;
  r         record;
  v_line    numeric;
  -- items to order: sku, qty
  items     text[][] := array[['PAP-A4-80','20'],['PEN-BL-50','5'],['TONER-HP85','2']];
  it        text[];
  v_pid     uuid;
  v_qty     int;
  v_unit    numeric;
begin
  insert into orders (company_id, quotation_id, po_number, status, currency,
                      fx_rate_snapshot, subtotal, vat_amount, total,
                      delivery_address, requested_delivery_date, created_by, approved_by)
  values (v_company, null, 'PO-RELIEF-2026-018', 'confirmed', 'SDG',
          v_fx, 0, 0, 0,
          'الخرطوم - المعمورة، مربع 12', current_date + 3, v_buyer, v_admin)
  returning id into v_order;

  foreach it slice 1 in array items loop
    select p.id into v_pid from products p where p.sku = it[1];
    v_qty := it[2]::int;
    select unit_price_sdg into v_unit from get_price(v_pid, v_company, v_qty);
    v_line := v_unit * v_qty;
    v_sub  := v_sub + v_line;
    insert into order_items (order_id, product_id, qty, unit_price_snapshot, line_total)
    values (v_order, v_pid, v_qty, v_unit, v_line);
  end loop;

  update orders set subtotal = v_sub, total = v_sub where id = v_order;

  insert into invoices (order_id, company_id, issue_date, due_date, currency,
                        total, amount_paid, status)
  values (v_order, v_company, current_date, current_date + 30, 'SDG',
          v_sub, 0, 'unpaid')
  returning id into v_invoice;

  -- record a partial payment (half up front by bank transfer)
  insert into payments (invoice_id, amount, currency, method, reference_number, recorded_by)
  values (v_invoice, round(v_sub/2, 2), 'SDG', 'bank_transfer', 'TRF-99120', v_admin);

  update invoices set amount_paid = round(v_sub/2, 2), status = 'partially_paid'
  where id = v_invoice;
end $$;
