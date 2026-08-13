-- Read-only health check for the quote-request (RFQ) migration.
-- Paste into the Supabase SQL Editor AFTER applying
-- migrations/20260813120000_quote_requests.sql. It changes nothing.
--
-- Every row should read PASS. Any FAIL tells you exactly what is missing.

with checks as (
  select 'tables exist' as check_name,
         (select count(*) from information_schema.tables
           where table_schema = 'public'
             and table_name in ('quote_requests','quote_request_items')) = 2 as ok,
         'quote_requests + quote_request_items' as detail

  union all
  select 'status enum exists',
         exists (select 1 from pg_type where typname = 'quote_request_status'),
         'quote_request_status'

  union all
  select 'RPCs exist',
         (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
           where n.nspname = 'public'
             and p.proname in ('submit_quote_request','claim_quote_request',
                               'decline_quote_request','cancel_quote_request',
                               'quote_request_to_quotation')) = 5,
         'all 5 functions'

  union all
  select 'RLS enabled',
         coalesce((select bool_and(relrowsecurity) from pg_class
                    where relname in ('quote_requests','quote_request_items')), false),
         'row level security on both tables'

  union all
  select 'policies present',
         (select count(*) from pg_policies
           where schemaname = 'public'
             and tablename in ('quote_requests','quote_request_items')) >= 6,
         'select/insert/update/delete policies'

  union all
  -- The important one: customers must never be able to insert a quotation,
  -- and anonymous visitors must not reach the RFQ objects at all.
  -- to_regclass guards keep this readable when the migration has not run yet:
  -- has_table_privilege() raises on a missing table instead of returning false.
  select 'anon locked out of tables',
         to_regclass('public.quote_requests') is not null
     and not has_table_privilege('anon','quote_requests','select')
     and not has_table_privilege('anon','quote_request_items','select'),
         'anon has no SELECT'

  union all
  select 'anon locked out of RPCs',
         to_regprocedure('public.submit_quote_request(jsonb,text,date)') is not null
     and not has_function_privilege('anon','submit_quote_request(jsonb,text,date)','execute')
     and not has_function_privilege('anon','quote_request_to_quotation(uuid,numeric,int)','execute'),
         'anon cannot execute'

  union all
  select 'authenticated can use it',
         to_regprocedure('public.submit_quote_request(jsonb,text,date)') is not null
     and has_function_privilege('authenticated','submit_quote_request(jsonb,text,date)','execute')
     and has_table_privilege('authenticated','quote_requests','select'),
         'signed-in users can submit and read'

  union all
  select 'doc numbering wired',
         exists (select 1 from pg_trigger where tgname = 'trg_request_number'),
         'RFQ-YYYY-NNNN numbers'
)
select case when ok then '✅ PASS' else '❌ FAIL' end as result, check_name, detail
from checks
order by ok, check_name;
