-- Zawed Supply — Migration 7 : customer-initiated requests for quotation
--
-- Until now a quotation could only start with sales: a customer who needed a
-- price had to phone. This lets the customer open the conversation.
--
-- Deliberately a SEPARATE table rather than a new `quotation_status`:
--   * an RFQ has no prices, no VAT, no FX snapshot and no validity window, so
--     folding it into `quotations` would mean a row that is mostly null and a
--     status enum covering two different lifecycles;
--   * more importantly it preserves the security property that customers can
--     never insert into `quotations`. Prices stay server-computed and
--     staff-issued; a customer states demand, not price.
--
-- Items may be free text. Procurement in practice asks for things that are not
-- in the catalog yet ("30 gallons of oil"), and refusing to record that would
-- just push the request back to WhatsApp.

do $$ begin
  create type quote_request_status as enum
    ('submitted','in_review','quoted','declined','cancelled');
exception when duplicate_object then null; end $$;

create table if not exists quote_requests (
  id             uuid primary key default gen_random_uuid(),
  request_number text unique,
  company_id     uuid not null references companies(id) on delete restrict,
  created_by     uuid references profiles(id) on delete set null,
  status         quote_request_status not null default 'submitted',
  notes          text,
  needed_by      date,
  -- Set when sales turns the request into a real quotation.
  quotation_id   uuid references quotations(id) on delete set null,
  decline_reason text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index if not exists idx_quote_requests_company
  on quote_requests(company_id, status);
create index if not exists idx_quote_requests_open
  on quote_requests(status) where status in ('submitted','in_review');

create table if not exists quote_request_items (
  id          uuid primary key default gen_random_uuid(),
  request_id  uuid not null references quote_requests(id) on delete cascade,
  product_id  uuid references products(id) on delete set null,
  -- Free-text fallback for anything not in the catalog.
  description text,
  qty         int not null check (qty > 0),
  note        text,
  constraint quote_request_items_named
    check (product_id is not null or nullif(btrim(coalesce(description,'')), '') is not null)
);
create index if not exists idx_quote_request_items_request
  on quote_request_items(request_id);

create or replace function assign_request_number()
returns trigger language plpgsql as $$
begin
  if new.request_number is null then new.request_number := next_doc_number('RFQ'); end if;
  return new;
end $$;

drop trigger if exists trg_request_number on quote_requests;
create trigger trg_request_number before insert on quote_requests
  for each row execute function assign_request_number();

drop trigger if exists trg_quote_requests_updated on quote_requests;
create trigger trg_quote_requests_updated before update on quote_requests
  for each row execute function set_updated_at();

drop trigger if exists trg_quote_requests_audit on quote_requests;
create trigger trg_quote_requests_audit after insert or update or delete on quote_requests
  for each row execute function write_audit();

-- ---------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------
alter table quote_requests      enable row level security;
alter table quote_request_items enable row level security;

drop policy if exists quote_requests_select on quote_requests;
create policy quote_requests_select on quote_requests for select to authenticated
  using (is_staff() or company_id = auth_company_id());

-- Customers do not INSERT directly; submit_quote_request() is the only door,
-- so the row always carries the caller's real company and author.
drop policy if exists quote_requests_insert on quote_requests;
create policy quote_requests_insert on quote_requests for insert to authenticated
  with check (is_staff());

-- A customer may cancel their own company's open request; everything else
-- (moving to in_review/quoted/declined) is staff-only and goes through RPCs.
drop policy if exists quote_requests_update on quote_requests;
create policy quote_requests_update on quote_requests for update to authenticated
  using (is_staff() or company_id = auth_company_id())
  with check (is_staff() or (company_id = auth_company_id() and status = 'cancelled'));

drop policy if exists quote_requests_delete on quote_requests;
create policy quote_requests_delete on quote_requests for delete to authenticated
  using (is_admin());

drop policy if exists quote_request_items_select on quote_request_items;
create policy quote_request_items_select on quote_request_items for select to authenticated
  using (exists (select 1 from quote_requests r where r.id = request_id
                 and (is_staff() or r.company_id = auth_company_id())));

drop policy if exists quote_request_items_write on quote_request_items;
create policy quote_request_items_write on quote_request_items for all to authenticated
  using (is_staff()) with check (is_staff());

grant select on quote_requests, quote_request_items to authenticated;
grant insert, update on quote_requests to authenticated;
grant insert, update, delete on quote_request_items to authenticated;

-- ---------------------------------------------------------------------
-- submit_quote_request — the customer's entry point
-- ---------------------------------------------------------------------
create or replace function submit_quote_request(
  p_items     jsonb,          -- [{product_id?, description?, qty, note?}]
  p_notes     text default null,
  p_needed_by date default null
)
returns table (request_id uuid, request_number text)
language plpgsql security definer set search_path = public as $$
declare
  v_company uuid := auth_company_id();
  v_req     uuid;
  v_num     text;
  v_count   int := 0;
  it        jsonb;
  v_pid     uuid;
  v_desc    text;
  v_qty     int;
begin
  if v_company is null then
    raise exception 'هذا الحساب غير مرتبط بمؤسسة' using errcode = '42501';
  end if;
  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'أضف صنفاً واحداً على الأقل' using errcode = '22023';
  end if;
  if p_needed_by is not null and p_needed_by < current_date then
    raise exception 'تاريخ الحاجة يجب أن يكون في المستقبل' using errcode = '22023';
  end if;

  insert into quote_requests (company_id, created_by, status, notes, needed_by)
  values (v_company, auth.uid(), 'submitted', nullif(btrim(coalesce(p_notes,'')), ''), p_needed_by)
  returning id, quote_requests.request_number into v_req, v_num;

  for it in select * from jsonb_array_elements(p_items) loop
    v_pid  := nullif(it->>'product_id', '')::uuid;
    v_desc := nullif(btrim(coalesce(it->>'description', '')), '');
    v_qty  := coalesce((it->>'qty')::int, 0);

    if v_qty <= 0 then continue; end if;
    if v_pid is null and v_desc is null then continue; end if;

    -- A catalog reference must point at something real and sellable.
    if v_pid is not null and not exists (select 1 from products
                                          where id = v_pid and is_active) then
      raise exception 'منتج غير متوفر' using errcode = '22023';
    end if;

    insert into quote_request_items (request_id, product_id, description, qty, note)
    values (v_req, v_pid, v_desc, v_qty, nullif(btrim(coalesce(it->>'note','')), ''));
    v_count := v_count + 1;
  end loop;

  if v_count = 0 then
    raise exception 'أضف صنفاً واحداً على الأقل' using errcode = '22023';
  end if;

  return query select v_req, v_num;
end $$;

-- ---------------------------------------------------------------------
-- Staff-side transitions
-- ---------------------------------------------------------------------
create or replace function claim_quote_request(p_request_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not is_staff() then
    raise exception 'غير مصرّح' using errcode = '42501';
  end if;
  update quote_requests set status = 'in_review'
   where id = p_request_id and status = 'submitted';
end $$;

create or replace function decline_quote_request(p_request_id uuid, p_reason text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not is_staff() then
    raise exception 'غير مصرّح' using errcode = '42501';
  end if;
  if nullif(btrim(coalesce(p_reason,'')), '') is null then
    raise exception 'اذكر سبب الاعتذار' using errcode = '22023';
  end if;
  update quote_requests
     set status = 'declined', decline_reason = btrim(p_reason)
   where id = p_request_id and status in ('submitted','in_review');
end $$;

-- Cancel: the customer withdrawing their own open request.
create or replace function cancel_quote_request(p_request_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_company uuid;
begin
  select company_id into v_company from quote_requests where id = p_request_id;
  if v_company is null then
    raise exception 'الطلب غير موجود' using errcode = '22023';
  end if;
  if not (is_staff() or v_company = auth_company_id()) then
    raise exception 'غير مصرّح' using errcode = '42501';
  end if;
  update quote_requests set status = 'cancelled'
   where id = p_request_id and status in ('submitted','in_review');
end $$;

-- ---------------------------------------------------------------------
-- quote_request_to_quotation — price an RFQ and link the two
--
-- Reuses create_quotation() so pricing stays in exactly one place; free-text
-- lines are skipped (there is nothing to price) and reported back so sales
-- can see they still have to be handled by hand.
-- ---------------------------------------------------------------------
create or replace function quote_request_to_quotation(
  p_request_id    uuid,
  p_vat_percent   numeric default 0,
  p_validity_days int default 7
)
returns table (quotation_id uuid, quote_number text, total numeric, skipped_lines int)
language plpgsql security definer set search_path = public as $$
declare
  v_req     quote_requests%rowtype;
  v_items   jsonb;
  v_skipped int;
  v_res     record;
begin
  if not is_staff() then
    raise exception 'غير مصرّح' using errcode = '42501';
  end if;

  select * into v_req from quote_requests where id = p_request_id;
  if v_req.id is null then
    raise exception 'الطلب غير موجود' using errcode = '22023';
  end if;
  if v_req.status not in ('submitted','in_review') then
    raise exception 'هذا الطلب مغلق' using errcode = '22023';
  end if;

  select coalesce(jsonb_agg(jsonb_build_object('product_id', product_id, 'qty', qty)), '[]'::jsonb)
    into v_items
    from quote_request_items where request_id = p_request_id and product_id is not null;

  select count(*) into v_skipped
    from quote_request_items where request_id = p_request_id and product_id is null;

  if jsonb_array_length(v_items) = 0 then
    raise exception 'لا يوجد صنف من الكتالوج في هذا الطلب — أنشئ العرض يدوياً'
      using errcode = '22023';
  end if;

  select * into v_res from create_quotation(
    v_req.company_id, v_items, v_req.notes, null, p_vat_percent, p_validity_days);

  update quote_requests
     set status = 'quoted', quotation_id = v_res.quotation_id
   where id = p_request_id;

  return query select v_res.quotation_id, v_res.quote_number, v_res.total, v_skipped;
end $$;

-- Supabase's default privileges on `public` grant every new table and function
-- to `anon` at creation time, so revoking from PUBLIC alone leaves the
-- anonymous role holding them. RLS and the in-function role checks already
-- refuse anonymous callers, but an unauthenticated visitor should not be able
-- to reach these objects at all — the same hole that once exposed
-- current_cost_usd(). Revoke explicitly.
revoke all on quote_requests, quote_request_items from anon;

revoke execute on function submit_quote_request(jsonb, text, date) from public, anon;
revoke execute on function claim_quote_request(uuid) from public, anon;
revoke execute on function decline_quote_request(uuid, text) from public, anon;
revoke execute on function cancel_quote_request(uuid) from public, anon;
revoke execute on function quote_request_to_quotation(uuid, numeric, int) from public, anon;

grant execute on function submit_quote_request(jsonb, text, date),
                         claim_quote_request(uuid),
                         decline_quote_request(uuid, text),
                         cancel_quote_request(uuid),
                         quote_request_to_quotation(uuid, numeric, int)
  to authenticated;
