-- Zawed Supply — Migration 11 : company sign-up requests, and atomic repricing
--
-- Two gaps.
--
-- 1. The landing page invites an organization to "request an account" and then
--    sends them to a login form they cannot possibly have credentials for.
--    There was no way into the platform at all except a staff member creating
--    the account by hand, with no record of who asked.
--
-- 2. Admins could already write products, prices and stock (the RLS has always
--    allowed it) but repricing means closing the open price row and opening a
--    new one. Done as two statements from a browser that is one dropped 3G
--    packet away from failing, it can leave a product with two open price rows
--    or none. set_product_price() makes it one statement.

-- ---------------------------------------------------------------------
-- 1. Account requests
-- ---------------------------------------------------------------------
do $$ begin
  create type account_request_status as enum ('new','contacted','approved','rejected');
exception when duplicate_object then null; end $$;

create table if not exists account_requests (
  id             uuid primary key default gen_random_uuid(),
  company_name   text not null,
  company_type   company_type not null default 'sme',
  contact_name   text not null,
  email          text not null,
  phone          text,
  city           text,
  tax_id         text,
  notes          text,
  status         account_request_status not null default 'new',
  -- Set when a staff member turns the request into a real company.
  company_id     uuid references companies(id) on delete set null,
  review_note    text,
  reviewed_by    uuid references profiles(id) on delete set null,
  reviewed_at    timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  constraint account_requests_email_shape check (position('@' in email) > 1),
  constraint account_requests_lengths check (
    length(company_name) between 2 and 200 and
    length(contact_name) between 2 and 120 and
    length(email)        between 5 and 160 and
    length(coalesce(phone, ''))  <= 40  and
    length(coalesce(city, ''))   <= 120 and
    length(coalesce(tax_id, '')) <= 60  and
    length(coalesce(notes, ''))  <= 2000
  )
);

-- One open request per email: stops a refresh-happy visitor, or a bot, from
-- filling the staff queue with the same organization over and over.
create unique index if not exists uq_account_requests_open_email
  on account_requests (lower(email))
  where status in ('new','contacted');

create index if not exists idx_account_requests_status
  on account_requests(status, created_at desc);

drop trigger if exists trg_account_requests_updated on account_requests;
create trigger trg_account_requests_updated before update on account_requests
  for each row execute function set_updated_at();

alter table account_requests enable row level security;

-- Nobody reads these but staff. In particular the anonymous role must never be
-- able to read back what other organizations submitted.
drop policy if exists account_requests_select on account_requests;
create policy account_requests_select on account_requests for select to authenticated
  using (is_staff());

drop policy if exists account_requests_update on account_requests;
create policy account_requests_update on account_requests for update to authenticated
  using (is_staff()) with check (is_staff());

drop policy if exists account_requests_delete on account_requests;
create policy account_requests_delete on account_requests for delete to authenticated
  using (is_admin());

-- No INSERT policy at all: the RPC below is the only way in, so the row always
-- carries server-validated values and a 'new' status.

revoke all on account_requests from anon, authenticated;
grant select, update on account_requests to authenticated;

-- ---------------------------------------------------------------------
-- submit_account_request — the ONLY thing an anonymous visitor may call
-- ---------------------------------------------------------------------
create or replace function submit_account_request(
  p_company_name text,
  p_contact_name text,
  p_email        text,
  p_phone        text default null,
  p_company_type company_type default 'sme',
  p_city         text default null,
  p_tax_id       text default null,
  p_notes        text default null
)
returns table (request_id uuid)
language plpgsql security definer set search_path = public as $$
declare
  v_email text := lower(btrim(coalesce(p_email, '')));
  v_id    uuid;
begin
  if length(btrim(coalesce(p_company_name,''))) < 2 then
    raise exception 'اسم المؤسسة مطلوب' using errcode = '22023';
  end if;
  if length(btrim(coalesce(p_contact_name,''))) < 2 then
    raise exception 'اسم مسؤول التواصل مطلوب' using errcode = '22023';
  end if;
  if position('@' in v_email) < 2 or length(v_email) < 5 then
    raise exception 'بريد إلكتروني غير صالح' using errcode = '22023';
  end if;

  begin
    insert into account_requests
      (company_name, company_type, contact_name, email, phone, city, tax_id, notes)
    values (btrim(p_company_name), coalesce(p_company_type, 'sme'), btrim(p_contact_name),
            v_email, nullif(btrim(coalesce(p_phone,'')), ''),
            nullif(btrim(coalesce(p_city,'')), ''), nullif(btrim(coalesce(p_tax_id,'')), ''),
            nullif(btrim(coalesce(p_notes,'')), ''))
    returning id into v_id;
  exception when unique_violation then
    -- Deliberately not an error the visitor has to act on: their request is
    -- already with us, and saying so leaks nothing about other accounts.
    raise exception 'لدينا طلب مفتوح بهذا البريد بالفعل — سنتواصل معكم قريباً'
      using errcode = '22023';
  end;

  return query select v_id;
end $$;

-- ---------------------------------------------------------------------
-- approve_account_request — creates the company from the request
--
-- Stops short of creating the login user: that needs the auth admin API and a
-- service-role key, which must never reach a browser. Staff invite the user
-- from Supabase once the company exists.
-- ---------------------------------------------------------------------
create or replace function approve_account_request(
  p_request_id         uuid,
  p_payment_terms_days int default 30,
  p_requires_po        boolean default false,
  p_note               text default null
)
returns table (company_id uuid, company_name text)
language plpgsql security definer set search_path = public as $$
declare
  v_req account_requests%rowtype;
  v_cid uuid;
begin
  if not is_staff() then
    raise exception 'غير مصرّح' using errcode = '42501';
  end if;

  select * into v_req from account_requests where id = p_request_id;
  if v_req.id is null then
    raise exception 'الطلب غير موجود' using errcode = '22023';
  end if;
  if v_req.status = 'approved' then
    raise exception 'تمت الموافقة على هذا الطلب من قبل' using errcode = '22023';
  end if;

  insert into companies (name_ar, type, tax_id, billing_address,
                         payment_terms_days, requires_po_number, is_active)
  values (v_req.company_name, v_req.company_type, v_req.tax_id, v_req.city,
          greatest(coalesce(p_payment_terms_days, 30), 0),
          coalesce(p_requires_po, false), true)
  returning id into v_cid;

  update account_requests
     set status = 'approved', company_id = v_cid, review_note = p_note,
         reviewed_by = auth.uid(), reviewed_at = now()
   where id = p_request_id;

  return query select v_cid, v_req.company_name;
end $$;

create or replace function decide_account_request(
  p_request_id uuid,
  p_status     account_request_status,
  p_note       text default null
)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not is_staff() then
    raise exception 'غير مصرّح' using errcode = '42501';
  end if;
  if p_status = 'approved' then
    raise exception 'استخدم approve_account_request لإنشاء المؤسسة' using errcode = '22023';
  end if;
  update account_requests
     set status = p_status, review_note = p_note,
         reviewed_by = auth.uid(), reviewed_at = now()
   where id = p_request_id;
end $$;

-- ---------------------------------------------------------------------
-- 2. set_product_price — close the open row and open a new one, atomically
-- ---------------------------------------------------------------------
create or replace function set_product_price(
  p_product_id     uuid,
  p_cost_usd       numeric,
  p_margin_percent numeric
)
returns table (price_id uuid)
language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  if not is_admin() then
    raise exception 'تعديل الأسعار مخصّص لمدير النظام' using errcode = '42501';
  end if;
  if p_cost_usd is null or p_cost_usd <= 0 then
    raise exception 'التكلفة بالدولار يجب أن تكون أكبر من صفر' using errcode = '22023';
  end if;
  if p_margin_percent is null or p_margin_percent < 0 then
    raise exception 'هامش الربح لا يمكن أن يكون سالباً' using errcode = '22023';
  end if;
  if not exists (select 1 from products where id = p_product_id) then
    raise exception 'المنتج غير موجود' using errcode = '22023';
  end if;

  -- Close whatever is currently open, so exactly one row is ever live.
  update product_prices
     set effective_to = now()
   where product_id = p_product_id
     and effective_from <= now()
     and (effective_to is null or effective_to > now());

  insert into product_prices (product_id, cost_usd, margin_percent, created_by)
  values (p_product_id, p_cost_usd, p_margin_percent, auth.uid())
  returning id into v_id;

  return query select v_id;
end $$;

revoke execute on function submit_account_request(text, text, text, text, company_type, text, text, text)
  from public;
revoke execute on function approve_account_request(uuid, int, boolean, text) from public, anon;
revoke execute on function decide_account_request(uuid, account_request_status, text) from public, anon;
revoke execute on function set_product_price(uuid, numeric, numeric) from public, anon;

-- The sign-up form is public by necessity; everything else is staff-only.
grant execute on function submit_account_request(text, text, text, text, company_type, text, text, text)
  to anon, authenticated;
grant execute on function approve_account_request(uuid, int, boolean, text) to authenticated;
grant execute on function decide_account_request(uuid, account_request_status, text) to authenticated;
grant execute on function set_product_price(uuid, numeric, numeric) to authenticated;
