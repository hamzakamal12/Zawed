-- =====================================================================
-- Zawed Supply — Migration 2/3 : pricing engine
-- SDG is NEVER stored. It is always computed at read time from
-- cost_usd + margin + the live FX rate, then discounted per tier.
-- =====================================================================

-- Latest active FX rate (SDG per USD).
create or replace function current_fx_rate()
returns numeric language sql stable as $$
  select rate_sdg_per_usd
  from fx_rates
  where effective_from <= now()
  order by effective_from desc
  limit 1
$$;

-- get_price(product, company, qty) -> live price + discount applied.
-- Rules (in order):
--   1. base_usd = cost_usd * (1 + margin_percent/100)   [active price row]
--   2. best price_tier: company-specific beats global; higher min_qty beats lower
--   3. convert to SDG with the latest fx_rate
--   4. round SDG UP to the nearest 100
create or replace function get_price(
  p_product_id uuid,
  p_company_id uuid,
  p_qty        int default 1
)
returns table (
  unit_price_sdg   numeric,
  unit_price_usd   numeric,
  fx_rate_used     numeric,
  discount_applied numeric,
  tier_name        text
)
language plpgsql
stable
security definer            -- lets customers price items without reading cost_usd
set search_path = public
as $$
declare
  v_cost    numeric;
  v_margin  numeric;
  v_base    numeric;
  v_disc    numeric := 0;
  v_tier    text    := 'قائمة';   -- "list price"
  v_fx      numeric;
  v_usd     numeric;
  v_sdg     numeric;
begin
  -- 1) active cost + margin
  select cost_usd, margin_percent
    into v_cost, v_margin
  from product_prices
  where product_id = p_product_id
    and effective_from <= now()
    and (effective_to is null or effective_to > now())
  order by effective_from desc
  limit 1;

  if v_cost is null then
    return query select null::numeric, null::numeric, current_fx_rate(), 0::numeric, 'لا يوجد سعر'::text;
    return;
  end if;

  v_base := round(v_cost * (1 + v_margin / 100.0), 4);

  -- 2) best matching tier
  select pt.discount_percent,
         case
           when pt.company_id is not null then 'سعر تعاقدي'   -- contract price
           else 'خصم كمية'                                     -- volume discount
         end
    into v_disc, v_tier
  from price_tiers pt
  where (pt.product_id = p_product_id or pt.product_id is null)
    and (pt.company_id = p_company_id or pt.company_id is null)
    and pt.min_qty <= coalesce(p_qty, 1)
  order by (pt.company_id is not null) desc,   -- company-specific first
           pt.min_qty desc                     -- then the deepest qty break
  limit 1;

  v_disc := coalesce(v_disc, 0);
  if v_disc = 0 then v_tier := 'قائمة'; end if;

  -- 3) USD after discount, then SDG at the live rate
  v_usd := round(v_base * (1 - v_disc / 100.0), 4);
  v_fx  := current_fx_rate();

  if v_fx is null then
    return query select null::numeric, v_usd, null::numeric, v_disc, v_tier;
    return;
  end if;

  -- 4) round SDG up to the nearest 100
  v_sdg := ceil((v_usd * v_fx) / 100.0) * 100;

  return query select v_sdg, v_usd, v_fx, v_disc, v_tier;
end $$;

comment on function get_price(uuid, uuid, int) is
  'Live unit price. Returns {unit_price_sdg, unit_price_usd, fx_rate_used, discount_applied, tier_name}. SDG is computed, never stored.';
