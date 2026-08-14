-- Zawed Supply — Migration 14 : refuse to sell on a stale exchange rate
--
-- Every price on this platform is derived: cost_usd × (1 + margin) × fx. The
-- fx term is a number a human types in. In Sudan the parallel-market rate can
-- move several percent in a week, so a rate nobody has updated is not a small
-- inaccuracy — it is selling below cost, on every line, silently, until
-- somebody notices at invoicing time.
--
-- The admin FX screen already WARNED at 24 hours. A warning on a screen the
-- admin is not looking at does not stop an order being placed at last month's
-- rate. This makes the limit real, and makes it a setting rather than a
-- constant so the threshold is a business decision the admin can change
-- without a deployment.
--
-- Two thresholds, because one is too blunt:
--   warn  (default 48h) — the rate is showing its age. Everyone sees a notice;
--                         nothing is blocked.
--   block (default 168h / 7 days) — refuse to create new priced documents.
--
-- Blocking is deliberately the far threshold. Stopping the store because a
-- rate is a day old would be its own kind of outage.

-- ---------------------------------------------------------------------
-- settings
-- ---------------------------------------------------------------------
create table if not exists app_settings (
  id                   boolean primary key default true,
  fx_warn_after_hours  int not null default 48,
  fx_block_after_hours int not null default 168,
  updated_by           uuid references profiles(id) on delete set null,
  updated_at           timestamptz not null default now(),
  -- One row, forever. A settings table that can hold two rows eventually does,
  -- and then which one is the config?
  constraint app_settings_singleton check (id),
  constraint app_settings_thresholds check (
    fx_warn_after_hours between 1 and 8760 and
    fx_block_after_hours between 1 and 8760 and
    fx_block_after_hours >= fx_warn_after_hours
  )
);

insert into app_settings (id) values (true) on conflict (id) do nothing;

alter table app_settings enable row level security;

-- Everyone signed in needs to read it: the catalog and checkout screens show
-- the warning, so they need the threshold that produced it.
drop policy if exists app_settings_select on app_settings;
create policy app_settings_select on app_settings for select to authenticated using (true);

drop policy if exists app_settings_update on app_settings;
create policy app_settings_update on app_settings for update to authenticated
  using (is_admin()) with check (is_admin());

revoke all on app_settings from anon, authenticated;
grant select on app_settings to authenticated;
grant update (fx_warn_after_hours, fx_block_after_hours, updated_by, updated_at)
  on app_settings to authenticated;

drop trigger if exists trg_app_settings_updated on app_settings;
create trigger trg_app_settings_updated before update on app_settings
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------
-- fx_status — one place that answers "how old is the rate, and so what?"
-- ---------------------------------------------------------------------
-- Both the server guards and the UI read this, so a screen can never disagree
-- with the rule that is actually enforced.
create or replace function fx_status()
returns table (
  rate            numeric,
  effective_from  timestamptz,
  age_hours       numeric,
  warn_after      int,
  block_after     int,
  is_stale        boolean,
  is_expired      boolean
)
language sql stable security definer set search_path = public as $$
  select f.rate_sdg_per_usd,
         f.effective_from,
         round(extract(epoch from (now() - f.effective_from)) / 3600.0, 1),
         s.fx_warn_after_hours,
         s.fx_block_after_hours,
         -- No rate at all is the worst case, not the newest one: with
         -- effective_from null both comparisons are null, and a null read as
         -- "fine" would let a brand-new database price at nothing.
         coalesce(now() - f.effective_from > make_interval(hours => s.fx_warn_after_hours), true),
         coalesce(now() - f.effective_from > make_interval(hours => s.fx_block_after_hours), true)
    from app_settings s
    left join lateral (
      select * from fx_rates
       where effective_from <= now()
       order by effective_from desc
       limit 1
    ) f on true
   where s.id;
$$;

/**
 * Raised by anything that mints a priced document.
 *
 * No rate at all is treated as expired rather than as "age zero" — a platform
 * with no exchange rate cannot price anything, and the existing callers
 * already say so in their own words.
 */
create or replace function assert_fx_fresh()
returns void language plpgsql stable security definer set search_path = public as $$
declare v record;
begin
  select * into v from fx_status();
  if v.rate is null then
    raise exception 'لم يتم ضبط سعر الصرف بعد' using errcode = '22023';
  end if;
  if v.is_expired then
    raise exception 'سعر الصرف قديم (% ساعة) — يجب تحديثه قبل إصدار طلبات أو عروض جديدة',
      floor(v.age_hours) using errcode = '22023';
  end if;
end $$;

revoke execute on function fx_status() from public, anon;
revoke execute on function assert_fx_fresh() from public, anon, authenticated;
grant execute on function fx_status() to authenticated;

-- ---------------------------------------------------------------------
-- enforce it where money is committed
-- ---------------------------------------------------------------------
create or replace function place_order_fx_guard()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform assert_fx_fresh();
  return new;
end $$;

-- A trigger rather than an edit to place_order(): every path that creates an
-- order goes through this table — the checkout RPC, the recurring-order run,
-- and anything added later — and a trigger cannot be forgotten by the next one.
drop trigger if exists trg_orders_fx_fresh on orders;
create trigger trg_orders_fx_fresh
  before insert on orders
  for each row execute function place_order_fx_guard();

drop trigger if exists trg_quotations_fx_fresh on quotations;
create trigger trg_quotations_fx_fresh
  before insert on quotations
  for each row execute function place_order_fx_guard();

revoke execute on function place_order_fx_guard() from public, anon, authenticated;
