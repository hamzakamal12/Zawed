-- Zawed Supply — the profiles privilege guard
--
-- This is the regression suite for a real escalation that shipped and was
-- fixed in migration 12. `profiles` carries the two columns the whole
-- authorisation model rests on: `role`, which drives is_staff/is_admin, and
-- `company_id`, which drives which organization's orders, quotations and
-- invoices you can read.
--
-- The old policies were row-level only — `id = auth.uid()` — and said nothing
-- about WHICH COLUMNS you could change on your own row. Any signed-in user
-- could PATCH their own profile through PostgREST and become an admin, or move
-- themselves into another company and read its entire history.
--
-- Every assertion below is one of the doors that used to be open.

\set QUIET on
set client_min_messages = notice;
\o /dev/null

\set customer '''00000000-0000-0000-0000-00000000ff01'''
\set admin    '''00000000-0000-0000-0000-00000000ff02'''
\set orphan   '''00000000-0000-0000-0000-00000000ff03'''
\set ours     '''00000000-0000-0000-0000-00000000ff91'''
\set theirs   '''00000000-0000-0000-0000-00000000ff92'''

insert into auth.users (id, email) values
  (:customer, 'buyer@relief.org'), (:admin, 'admin@zawed.com'), (:orphan, 'nobody@example.com');
insert into companies (id, name_ar) values (:ours, 'منظمة ريلف'), (:theirs, 'شركة النيل');
insert into profiles (id, full_name, role, company_id, email) values
  (:customer, 'عميل', 'customer_requester', :ours, 'buyer@relief.org'),
  (:admin,    'مدير', 'admin',              null,   'admin@zawed.com');
-- :orphan deliberately has an auth.users row and NO profile — that is the
-- state the old INSERT policy let a user exploit to mint their own.

\echo '── profiles privilege guard ────────────────────────────────'
\set QUIET off

-- 1. The escalation itself.
select t.denied(:customer, 'authenticated',
  $$update profiles set role = 'admin' where id = auth.uid()$$,
  'a user cannot promote themselves to admin', 'مخصّص لمدير النظام');
select t.eq((select role::text from profiles where id = :customer), 'customer_requester',
            'the role is unchanged');

-- 2. The quieter half of the same hole: moving into another company reads that
--    company's entire order and invoice history without touching `role`.
select t.denied(:customer, 'authenticated',
  format('update profiles set company_id = %L where id = auth.uid()', :theirs),
  'a user cannot move themselves into another company', 'مخصّص لمدير النظام');
select t.eq((select company_id from profiles where id = :customer), :ours::uuid,
            'the company is unchanged');

-- 3. Reactivating a disabled account would undo the only lever staff have to
--    cut someone off.
select t.denied(:customer, 'authenticated',
  $$update profiles set is_active = false where id = auth.uid()$$,
  'a user cannot change their own active flag', 'مخصّص لمدير النظام');

-- 4. The email is the address the account is identified by — an identity
--    column, not a preference (migration 13).
select t.denied(:customer, 'authenticated',
  $$update profiles set email = 'someone.else@zawed.com' where id = auth.uid()$$,
  'a user cannot rewrite their own login address', 'مخصّص لمدير النظام');
select t.eq((select email from profiles where id = :customer), 'buyer@relief.org',
            'the email is unchanged');

-- 5. What a user MAY still do with their own row. A guard that locks the whole
--    row would be a different bug.
select t.allowed(:customer, 'authenticated',
  $$update profiles set full_name = 'الاسم الجديد', phone = '0999888777' where id = auth.uid()$$,
  'a user can still edit their own name and phone');
select t.eq((select full_name from profiles where id = :customer), 'الاسم الجديد',
            'the name change went through');

-- 6. The second door: minting a profile. Before the fix, a signed-in user with
--    no profile row could create one for themselves with any role at all.
select t.denied(:orphan, 'authenticated',
  format($$insert into profiles (id, full_name, role) values (%L, 'دخيل', 'admin')$$, :orphan),
  'a user without a profile cannot mint one', 'row-level security policy');
select t.eq((select count(*) from profiles where id = :orphan), 0::bigint, 'no profile was created');

-- 7. Nor one for somebody else.
select t.denied(:customer, 'authenticated',
  format($$insert into profiles (id, full_name, role) values (%L, 'دخيل', 'admin')$$, :orphan),
  'a user cannot create a profile for another account', 'row-level security policy');

-- 8. An admin is the one identity that can do all of it — otherwise the users
--    screen could not work at all.
select t.allowed(:admin, 'authenticated',
  format($$update profiles set role = 'customer_admin', company_id = %L where id = %L$$, :theirs, :customer),
  'an admin can change a role and a company');
select t.eq((select role::text from profiles where id = :customer), 'customer_admin',
            'the admin change went through');
select t.allowed(:admin, 'authenticated',
  format($$update profiles set is_active = false where id = %L$$, :customer),
  'an admin can disable an account');
select t.allowed(:admin, 'authenticated',
  format($$insert into profiles (id, full_name, role, company_id, email)
           values (%L, 'مستخدم جديد', 'customer_requester', %L, 'nobody@example.com')$$, :orphan, :ours),
  'an admin can provision a profile');

-- 9. The guard is a trigger, so it must not be callable directly — being able
--    to run it by hand is not an escalation, but the revoke is part of the fix
--    and a loosened grant is worth catching.
select t.eq(has_function_privilege('authenticated','guard_profile_privileges()','execute'), false,
            'authenticated cannot execute the guard function');
select t.eq(has_function_privilege('anon','guard_profile_privileges()','execute'), false,
            'anon cannot execute the guard function');

-- 10. The trigger has to actually be attached. A guard function nobody calls
--     is the failure mode that looks fine in a code review.
select t.eq((select count(*) from pg_trigger
              where tgrelid = 'profiles'::regclass and tgname = 'trg_profiles_guard'
                and not tgisinternal),
            1::bigint, 'the guard trigger is attached to profiles');
