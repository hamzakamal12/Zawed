-- Zawed Supply — assertion helpers for the SQL suites
--
-- The point of these is that a broken rule FAILS THE BUILD. An exploratory
-- script that prints results and leaves a human to eyeball them is worse than
-- no test at all in CI, because it always exits 0.
--
-- Every helper runs its statement under a chosen identity, the way PostgREST
-- would: `set local role` plus the JWT subject claim. Called at top level in
-- autocommit, the SET LOCAL lasts exactly one helper call and then reverts, so
-- assertions cannot leak an identity into the next one.

create schema if not exists t;

create or replace function t.as_user(p_uid uuid, p_role text)
returns void language plpgsql as $$
begin
  execute format('set local role %I', p_role);
  perform set_config('request.jwt.claim.sub', coalesce(p_uid::text, ''), true);
end $$;

/** A plain boolean assertion. */
create or replace function t.ok(p_cond boolean, p_label text)
returns void language plpgsql as $$
begin
  if p_cond is not true then
    raise exception 'FAIL: %', p_label;
  end if;
  raise notice '  ok    %', p_label;
end $$;

create or replace function t.eq(p_got anyelement, p_want anyelement, p_label text)
returns void language plpgsql as $$
begin
  if p_got is distinct from p_want then
    raise exception 'FAIL: % — got %, want %', p_label, coalesce(p_got::text,'<null>'), coalesce(p_want::text,'<null>');
  end if;
  raise notice '  ok    % (%)', p_label, p_got;
end $$;

/**
 * The statement must be REFUSED for this identity.
 *
 * Only meaningful for refusals that actually raise: a privilege error, a check
 * constraint, an explicit RAISE in an RPC, or an INSERT that no RLS policy
 * admits. An UPDATE or DELETE blocked by RLS matches zero rows instead of
 * raising — assert those with t.rows(), not here, or the test passes for the
 * wrong reason.
 *
 * Pass p_expect to pin WHY it was refused. Without it, a statement that fails
 * for an unrelated reason — a typo, a missing grant on some helper — reads as
 * a passing security test. p_expect is matched case-insensitively against the
 * error message.
 */
create or replace function t.denied(p_uid uuid, p_role text, p_sql text, p_label text,
                                    p_expect text default null)
returns void language plpgsql as $$
declare
  v_allowed boolean := false;
  v_err     text;
begin
  begin
    perform t.as_user(p_uid, p_role);
    execute p_sql;
    v_allowed := true;
  exception when others then
    -- Refused, which is the expected outcome. The subtransaction unwinds and
    -- takes the SET LOCAL with it.
    v_err := SQLERRM;
  end;
  if v_allowed then
    raise exception 'FAIL: % — the statement was ALLOWED but must be refused', p_label;
  end if;
  if p_expect is not null and position(lower(p_expect) in lower(v_err)) = 0 then
    raise exception 'FAIL: % — refused, but for the wrong reason: %', p_label, v_err;
  end if;
  raise notice '  ok    % [%]', p_label, left(v_err, 60);
end $$;

/** The statement must SUCCEED for this identity. */
create or replace function t.allowed(p_uid uuid, p_role text, p_sql text, p_label text)
returns void language plpgsql as $$
begin
  perform t.as_user(p_uid, p_role);
  execute p_sql;
  raise notice '  ok    %', p_label;
exception when others then
  raise exception 'FAIL: % — refused with: %', p_label, SQLERRM;
end $$;

/** How many rows this identity can actually see. Catches silent RLS filtering. */
create or replace function t.rows(p_uid uuid, p_role text, p_query text, p_want bigint, p_label text)
returns void language plpgsql as $$
declare v_got bigint;
begin
  perform t.as_user(p_uid, p_role);
  execute format('select count(*) from (%s) _q', p_query) into v_got;
  if v_got is distinct from p_want then
    raise exception 'FAIL: % — % rows visible, want %', p_label, v_got, p_want;
  end if;
  raise notice '  ok    % (% rows)', p_label, v_got;
end $$;

/** Read one value back as a given identity, for use inside t.eq(). */
create or replace function t.scalar(p_uid uuid, p_role text, p_query text)
returns text language plpgsql as $$
declare v_out text;
begin
  perform t.as_user(p_uid, p_role);
  execute p_query into v_out;
  return v_out;
end $$;
