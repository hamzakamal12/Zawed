-- Zawed Supply — test bootstrap
--
-- The migrations assume the pieces Supabase supplies before any of our SQL
-- runs: the `auth` schema with a users table and auth.uid(), and the three
-- roles PostgREST switches into. A plain Postgres has none of that, so CI
-- stands up the minimum here — enough for the migrations to apply and for RLS
-- to behave exactly as it does in production.
--
-- Deliberately minimal. This is NOT a reimplementation of GoTrue: it holds the
-- identity surface our schema actually references, nothing more.

-- ── roles PostgREST assumes into ─────────────────────────────────────
do $$ begin
  create role anon nologin noinherit;
exception when duplicate_object then null; end $$;

do $$ begin
  create role authenticated nologin noinherit;
exception when duplicate_object then null; end $$;

do $$ begin
  create role service_role nologin noinherit bypassrls;
exception when duplicate_object then null; end $$;

grant usage on schema public to anon, authenticated, service_role;

-- Supabase grants new objects in `public` to anon and authenticated by
-- default. Several migrations rely on that default being present in order for
-- their explicit `revoke ... from anon` to mean anything — without it a test
-- would pass for the wrong reason.
alter default privileges in schema public
  grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public
  grant all on functions to anon, authenticated, service_role;
alter default privileges in schema public
  grant all on sequences to anon, authenticated, service_role;

-- ── the auth surface our schema references ───────────────────────────
create schema if not exists auth;
grant usage on schema auth to anon, authenticated, service_role;

create table if not exists auth.users (
  id         uuid primary key,
  email      text unique,
  created_at timestamptz not null default now()
);

/**
 * The signed-in user id, read from the request JWT claims exactly the way
 * Supabase does it. `set local request.jwt.claim.sub` is how a test says
 * "this statement is that user".
 */
create or replace function auth.uid() returns uuid
language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;

grant execute on function auth.uid() to anon, authenticated, service_role;

-- ── the storage surface migration 16 writes to ───────────────────────
-- Again minimal: enough for the bucket row and the RLS policies to be created
-- and tested, not a reimplementation of the storage API.
create schema if not exists storage;
grant usage on schema storage to anon, authenticated, service_role;

create table if not exists storage.buckets (
  id                 text primary key,
  name               text not null,
  public             boolean not null default false,
  file_size_limit    bigint,
  allowed_mime_types text[],
  created_at         timestamptz not null default now()
);

create table if not exists storage.objects (
  id         uuid primary key default gen_random_uuid(),
  bucket_id  text references storage.buckets(id),
  name       text,
  owner      uuid,
  created_at timestamptz not null default now()
);

alter table storage.objects enable row level security;
grant select, insert, update, delete on storage.objects to authenticated;
grant select on storage.objects to anon;
grant select on storage.buckets to anon, authenticated;
