import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
test('RLS isola lojas, autoria, perfis, contas inativas e catálogo global', async () => {
 const pg = new PGlite();
 try {
 await pg.exec(`
 create role anon; create role authenticated; create role service_role bypassrls;
 create schema auth; create table auth.users(id uuid primary key);
 create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true),'')::uuid $$;
 grant usage on schema auth to authenticated; grant execute on function auth.uid() to authenticated;
 create schema storage;
 create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
 create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text,owner_id text);
 alter table storage.objects enable row level security;
 grant usage on schema storage to authenticated; grant select,insert,delete on storage.objects to authenticated;
 create function storage.foldername(text) returns text[] language sql as $$ select string_to_array($1,'/') $$;
 `);
 await pg.exec(await readFile(new URL('../supabase/migrations/202610230001_initial.sql', import.meta.url), 'utf8'));
 const id = (n: number) => `00000000-0000-0000-0000-${String(n).padStart(12,'0')}`;
 await pg.exec(`insert into auth.users values ('${id(1)}'),('${id(2)}'),('${id(3)}'),('${id(4)}'),('${id(5)}'),('${id(6)}');
 insert into public.stores(id,name) values ('${id(11)}','Loja A'),('${id(12)}','Loja B');
 insert into public.profiles(id,name,role,store_id,active) values
 ('${id(1)}','Master','master',null,true),('${id(2)}','Admin A','admin','${id(11)}',true),
 ('${id(3)}','Funcionário A','employee','${id(11)}',true),('${id(4)}','Outro A','employee','${id(11)}',true),
 ('${id(5)}','Admin B','admin','${id(12)}',true),('${id(6)}','Inativo','employee','${id(11)}',false);
 insert into public.products(id,barcode,name,created_by) values ('${id(21)}','0012345678901','Produto','${id(3)}');
 insert into public.batches(store_id,product_id,expires_on,quantity,created_by) values
 ('${id(11)}','${id(21)}','2026-11-01',1,'${id(3)}'),('${id(11)}','${id(21)}','2026-11-01',1,'${id(4)}'),('${id(12)}','${id(21)}','2026-11-01',1,'${id(5)}');`);
 const asUser = async (n: number) => { await pg.exec(`reset role; set request.jwt.claim.sub = '${id(n)}'; set role authenticated;`); };
 const count = async (table: string) => Number((await pg.query<{ n: number }>(`select count(*)::int n from public.${table}`)).rows[0].n);
 await asUser(1); assert.equal(await count('batches'),3); assert.equal(await count('stores'),2); assert.equal(await count('profiles'),6);
 await asUser(2); assert.equal(await count('batches'),2); assert.equal(await count('stores'),1); assert.equal(await count('profiles'),4);
 await asUser(3); assert.equal(await count('batches'),1); assert.equal(await count('profiles'),1); assert.equal(await count('products'),1);
 await assert.rejects(pg.exec(`insert into public.batches(store_id,product_id,expires_on,quantity,created_by) values ('${id(12)}','${id(21)}','2026-12-01',1,'${id(3)}')`));
 await assert.rejects(pg.exec(`insert into public.batches(store_id,product_id,expires_on,quantity,created_by) values ('${id(11)}','${id(21)}','2026-12-01',1,'${id(4)}')`));
 await assert.rejects(pg.exec(`update public.profiles set role='master', store_id=null where id='${id(3)}'`));
 await assert.rejects(pg.exec(`insert into public.stores(name) values ('Invasão')`));
 await pg.exec(`insert into public.batches(store_id,product_id,expires_on,quantity,created_by) values ('${id(11)}','${id(21)}','2026-12-01',1,'${id(3)}')`);
 await asUser(5); assert.equal(await count('batches'),1); assert.equal(await count('products'),1);
 await asUser(6); assert.equal(await count('batches'),0); assert.equal(await count('products'),0); assert.equal(await count('stores'),0);
 await pg.exec('reset role; set role anon;'); await assert.rejects(pg.exec('select * from public.products'));
 } finally { await pg.close(); }
});
