-- Zawed Supply — Migration 16 : product images
--
-- A procurement officer choosing between two reams of paper is looking at two
-- lines of Arabic text and a SKU. A photo is the difference between "I think
-- that's the right one" and knowing.
--
-- Two decisions worth stating.
--
-- 1. The PATH is stored, not a URL. A full URL bakes the project reference
--    into every row, so moving projects, putting a CDN in front, or switching
--    the bucket to private would mean rewriting the table. The path is
--    stable; the client composes the URL.
--
-- 2. The bucket is PUBLIC for reading. Signed URLs would be the careful
--    choice, but these are photographs of office supplies, not documents —
--    and a signed URL expires, which breaks the browser cache on exactly the
--    connections that most need it. Writing stays staff-only.

alter table products add column if not exists image_path text;

comment on column products.image_path is
  'Path inside the product-images bucket, e.g. "<uuid>/800.webp". Not a URL — see migration 16.';

-- The original schema carried an `image_url` column that nothing ever read or
-- wrote — verified empty across all 44 products before dropping. Leaving it
-- would put two image columns on the table, and the next person to add a
-- picture would have to guess which one is real.
alter table products drop column if exists image_url;

-- ---------------------------------------------------------------------
-- the bucket
-- ---------------------------------------------------------------------
-- 1 MB is a deliberate ceiling, not a formality: the client downscales and
-- re-encodes before uploading, so anything approaching this limit means the
-- compression step was skipped or bypassed, and the catalog is about to get
-- slow for people on a phone connection.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'product-images', 'product-images', true, 1048576,
  array['image/webp','image/jpeg','image/png']
)
on conflict (id) do update
  set public            = excluded.public,
      file_size_limit   = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- ---------------------------------------------------------------------
-- who may do what
-- ---------------------------------------------------------------------
-- Anyone may look. The catalog is behind a login, but the bucket being public
-- means the image also loads from cache without a round trip for a token.
drop policy if exists product_images_read on storage.objects;
create policy product_images_read on storage.objects for select
  using (bucket_id = 'product-images');

-- Only staff may put a picture on a product. Without this, any signed-in
-- customer could upload arbitrary files to the project's storage.
drop policy if exists product_images_insert on storage.objects;
create policy product_images_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'product-images' and is_staff());

drop policy if exists product_images_update on storage.objects;
create policy product_images_update on storage.objects for update to authenticated
  using (bucket_id = 'product-images' and is_staff())
  with check (bucket_id = 'product-images' and is_staff());

drop policy if exists product_images_delete on storage.objects;
create policy product_images_delete on storage.objects for delete to authenticated
  using (bucket_id = 'product-images' and is_staff());

-- ---------------------------------------------------------------------
-- keep the bucket from filling with orphans
-- ---------------------------------------------------------------------
-- Replacing a product's photo writes a new object and repoints image_path.
-- The old file stays behind, invisible and paid for. Recording it for deletion
-- is cheaper and safer than deleting inside the trigger: storage lives outside
-- the transaction, so a rollback would leave a row pointing at a file that no
-- longer exists.
create table if not exists storage_orphans (
  path       text primary key,
  bucket     text not null default 'product-images',
  noticed_at timestamptz not null default now()
);

alter table storage_orphans enable row level security;

drop policy if exists storage_orphans_staff on storage_orphans;
create policy storage_orphans_staff on storage_orphans for all to authenticated
  using (is_staff()) with check (is_staff());

revoke all on storage_orphans from anon, authenticated;
grant select, delete on storage_orphans to authenticated;

create or replace function note_replaced_product_image()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if old.image_path is not null and old.image_path is distinct from new.image_path then
    insert into storage_orphans (path) values (old.image_path)
      on conflict (path) do nothing;
  end if;
  return new;
end $$;

drop trigger if exists trg_products_image_orphan on products;
create trigger trg_products_image_orphan
  after update of image_path on products
  for each row execute function note_replaced_product_image();

revoke execute on function note_replaced_product_image() from public, anon, authenticated;
