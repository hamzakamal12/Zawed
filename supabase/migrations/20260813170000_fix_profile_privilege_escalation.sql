-- Zawed Supply — Migration 12 : close a privilege escalation on profiles
--
-- SECURITY FIX.
--
-- `profiles` carries the two columns the entire authorisation model rests on:
-- `role` (which drives is_staff/is_admin) and `company_id` (which drives
-- auth_company_id, and therefore which company's orders, quotations and
-- invoices a user can see).
--
-- The policies were:
--     insert ... with check (id = auth.uid() or is_admin())
--     update ... using      (id = auth.uid() or is_admin())
--
-- Row-level security is exactly that — row level. Neither policy restricted
-- WHICH COLUMNS a user could change on the row they own, so any signed-in
-- user could PATCH their own profile row through PostgREST and set
-- role = 'admin', or move themselves into another company and read that
-- company's entire history. Verified against this schema: a customer_requester
-- issuing `update profiles set role='admin' where id = auth.uid()` came back
-- with is_admin() = true.
--
-- Two doors, both closed here.

-- ---------------------------------------------------------------------
-- 1. UPDATE: users keep their own row, but not the privileged columns
-- ---------------------------------------------------------------------
create or replace function guard_profile_privileges()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  -- No end-user context: the service role, or a migration. RLS already makes
  -- this unreachable for a signed-in user, since the policy requires
  -- id = auth.uid().
  if auth.uid() is null then
    return new;
  end if;

  if is_admin() then
    return new;
  end if;

  if new.role       is distinct from old.role
     or new.company_id is distinct from old.company_id
     or new.is_active  is distinct from old.is_active then
    raise exception 'تغيير الدور أو المؤسسة أو حالة التفعيل مخصّص لمدير النظام'
      using errcode = '42501';
  end if;

  return new;
end $$;

drop trigger if exists trg_profiles_guard on profiles;
create trigger trg_profiles_guard
  before update on profiles
  for each row execute function guard_profile_privileges();

revoke execute on function guard_profile_privileges() from authenticated, anon, public;

-- ---------------------------------------------------------------------
-- 2. INSERT: a user may no longer mint their own profile
-- ---------------------------------------------------------------------
-- The old policy let a signed-in user with no profile create one for
-- themselves with any role at all — the same escalation through a different
-- door. Profiles are provisioned by an admin or by the invite-user edge
-- function (which runs as the service role and bypasses RLS), never by the
-- account holder; the frontend only ever reads this table.
drop policy if exists profiles_insert on profiles;
create policy profiles_insert on profiles for insert to authenticated
  with check (is_admin());
