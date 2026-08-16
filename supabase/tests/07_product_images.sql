-- Zawed Supply — product images
--
-- The rules that matter here are about WRITE access. Reading is deliberately
-- open — they are photographs of stationery — but a bucket any signed-in
-- customer can write to is free file hosting attached to your project, and it
-- fills up on someone else's schedule.

\set QUIET on
set client_min_messages = notice;
\o /dev/null

\set admin    '''00000000-0000-0000-0000-00000000aa01'''
\set sales    '''00000000-0000-0000-0000-00000000aa02'''
\set customer '''00000000-0000-0000-0000-00000000aa03'''
\set company  '''00000000-0000-0000-0000-00000000aa91'''
\set paper    '''00000000-0000-0000-0000-00000000aad1'''

insert into auth.users (id, email) values
  (:admin, 'admin@zawed.com'), (:sales, 'sales@zawed.com'), (:customer, 'buyer@relief.org');
insert into companies (id, name_ar) values (:company, 'منظمة ريلف');
insert into profiles (id, full_name, role, company_id) values
  (:admin,    'مدير',   'admin',          null),
  (:sales,    'مبيعات', 'sales',          null),
  (:customer, 'عميل',   'customer_admin', :company);
insert into categories (id, name_ar) values ('00000000-0000-0000-0000-00000000aae1','ورق');
insert into products (id, sku, name_ar, category_id) values
  (:paper, 'ZW-A4', 'ورق A4', '00000000-0000-0000-0000-00000000aae1');

\echo '── product images ──────────────────────────────────────────'
\set QUIET off

-- 1. The bucket exists with the limits the migration intends. The size cap is
--    the thing that stops one uncompressed phone photo from becoming a 6 MB
--    download for every visitor on a 3G connection.
select t.eq((select public from storage.buckets where id = 'product-images'),
            true, 'the bucket is readable without a token');
select t.eq((select file_size_limit from storage.buckets where id = 'product-images'),
            1048576::bigint, 'uploads are capped at 1 MB');
select t.ok((select allowed_mime_types @> array['image/webp']
               from storage.buckets where id = 'product-images'),
            'webp is accepted — the format the client encodes to');
select t.ok((select not (allowed_mime_types @> array['application/pdf'])
               from storage.buckets where id = 'product-images'),
            'non-image types are not accepted');

-- 2. Anyone may read. This is what lets the browser cache the picture instead
--    of re-fetching it behind a token that expires.
select t.allowed(:customer, 'authenticated',
  $$select 1 from storage.objects where bucket_id = 'product-images'$$,
  'a customer can read product images');
select t.allowed(null, 'anon',
  $$select 1 from storage.objects where bucket_id = 'product-images'$$,
  'anon can read product images');

-- 3. But only staff may write. A customer with upload rights would be free
--    file hosting attached to the project.
select t.denied(:customer, 'authenticated',
  $$insert into storage.objects (bucket_id, name) values ('product-images', 'x/800.webp')$$,
  'a customer cannot upload', 'row-level security policy');
select t.allowed(:sales, 'authenticated',
  $$insert into storage.objects (bucket_id, name) values ('product-images', 'a/800.webp')$$,
  'sales can upload');
select t.allowed(:admin, 'authenticated',
  $$insert into storage.objects (bucket_id, name) values ('product-images', 'b/800.webp')$$,
  'an admin can upload');
-- DELETE blocked by RLS matches zero rows rather than raising, so count what
-- the statement actually removed. t.denied() would report this as a failure
-- for the right reason and the wrong evidence.
select t.affected(:customer, 'authenticated',
  $$delete from storage.objects where bucket_id = 'product-images'$$,
  0::bigint, 'a customer cannot delete images');
select t.eq((select count(*) from storage.objects where bucket_id = 'product-images'),
            2::bigint, 'both staff uploads survive the attempt');
select t.affected(:admin, 'authenticated',
  $$delete from storage.objects where bucket_id = 'product-images' and name = 'b/800.webp'$$,
  1::bigint, 'an admin can delete an image');

-- 4. Replacing a photo must not silently leave the old file behind, paid for
--    and unreachable. The path is recorded for a later sweep rather than
--    deleted inline: storage lives outside the transaction, so deleting there
--    and then rolling back would leave a row pointing at nothing.
update products set image_path = 'aad1/800.webp' where id = :paper;
select t.eq((select count(*) from storage_orphans), 0::bigint,
            'setting a first image orphans nothing');

update products set image_path = 'aad1/v2.webp' where id = :paper;
select t.eq((select path from storage_orphans), 'aad1/800.webp',
            'replacing an image records the old file for deletion');

-- 5. Clearing the image is a replacement too — the file still needs sweeping.
update products set image_path = null where id = :paper;
select t.eq((select count(*) from storage_orphans), 2::bigint,
            'removing an image also records its file');

-- 6. …and re-saving the same path is not a replacement, so it must not queue
--    a delete for a file that is still in use.
update products set image_path = 'aad1/v3.webp' where id = :paper;
update products set image_path = 'aad1/v3.webp' where id = :paper;
select t.eq((select count(*) from storage_orphans where path = 'aad1/v3.webp'), 0::bigint,
            'saving the same path twice does not orphan the live file');

-- 7. The orphan list is staff-only: it is a map of files to delete.
select t.rows(:customer, 'authenticated', 'select 1 from storage_orphans', 0::bigint,
              'a customer sees no orphan records');
