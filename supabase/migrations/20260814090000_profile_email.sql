-- Zawed Supply — Migration 13 : surface the login address on the profile
--
-- `profiles` never carried the email. The address lives in auth.users, which
-- PostgREST does not expose, so a staff member looking at the user list could
-- see a name and a role but had no way to tell WHICH login that was — and
-- names are not unique. Managing users without that is guesswork.
--
-- Kept in sync by the invite-user edge function, which writes it at creation
-- time. Backfilled here for the accounts that already exist.

alter table profiles add column if not exists email text;

-- One-time backfill. Runs as the migration owner, which can read auth.users.
update profiles p
   set email = u.email
  from auth.users u
 where u.id = p.id
   and p.email is distinct from u.email;

create index if not exists idx_profiles_email on profiles(lower(email));

-- A user must not be able to rewrite the address their account is identified
-- by, for the same reason they cannot rewrite their role: it is an identity
-- column, not a preference. Folded into the existing guard.
create or replace function guard_profile_privileges()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then
    return new;
  end if;

  if is_admin() then
    return new;
  end if;

  if new.role       is distinct from old.role
     or new.company_id is distinct from old.company_id
     or new.is_active  is distinct from old.is_active
     or new.email      is distinct from old.email then
    raise exception 'تغيير الدور أو المؤسسة أو البريد أو حالة التفعيل مخصّص لمدير النظام'
      using errcode = '42501';
  end if;

  return new;
end $$;
