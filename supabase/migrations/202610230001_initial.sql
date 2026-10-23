create type public.app_role as enum ('master', 'admin', 'employee');
create table public.stores (
 id uuid primary key default gen_random_uuid(), name text not null check(length(name) between 2 and 120), created_at timestamptz not null default now()
);
create table public.profiles (
 id uuid primary key references auth.users(id) on delete cascade,
 name text not null check(length(name) between 2 and 120),
 role public.app_role not null default 'employee',
 store_id uuid references public.stores(id), active boolean not null default true,
 check ((role = 'master' and store_id is null) or (role <> 'master' and store_id is not null))
);
create index profiles_store_idx on public.profiles(store_id);
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;
create function private.is_master() returns boolean language sql stable security definer set search_path = '' as $$
 select exists(select 1 from public.profiles where id = auth.uid() and active and role = 'master');
$$;
create function private.my_store() returns uuid language sql stable security definer set search_path = '' as $$
 select store_id from public.profiles where id = auth.uid() and active;
$$;
create function private.is_admin() returns boolean language sql stable security definer set search_path = '' as $$
 select exists(select 1 from public.profiles where id = auth.uid() and active and role = 'admin');
$$;
create function private.is_active() returns boolean language sql stable security definer set search_path = '' as $$
 select exists(select 1 from public.profiles where id = auth.uid() and active);
$$;
revoke all on all functions in schema private from public;
grant execute on all functions in schema private to authenticated;
alter table public.stores enable row level security;
alter table public.profiles enable row level security;
create policy stores_read on public.stores for select to authenticated using (private.is_master() or id = private.my_store());
create policy stores_create on public.stores for insert to authenticated with check (private.is_master());
create policy profiles_read on public.profiles for select to authenticated using (
 private.is_master() or (private.is_active() and (id = auth.uid() or (private.is_admin() and store_id = private.my_store())))
);
-- Profile writes only through the authorized server administration flow. No self-promotion policy.
revoke all on public.stores, public.profiles from anon, authenticated;
grant select, insert on public.stores to authenticated;
grant select on public.profiles to authenticated;
grant all on public.stores, public.profiles to service_role;

create table public.products (
 id uuid primary key default gen_random_uuid(), barcode text not null unique check(barcode ~ '^[0-9]{8,14}$'),
 name text not null check(length(name) between 2 and 180), created_by uuid not null default auth.uid() references public.profiles(id), created_at timestamptz not null default now()
);
create table public.batches (
 id uuid primary key default gen_random_uuid(), store_id uuid not null references public.stores(id),
 product_id uuid not null references public.products(id), expires_on date not null,
 quantity integer not null check(quantity > 0), created_by uuid not null references public.profiles(id), created_at timestamptz not null default now()
);
create index batches_store_expiry_idx on public.batches(store_id, expires_on);
create index batches_creator_idx on public.batches(created_by);
alter table public.products enable row level security;
alter table public.batches enable row level security;
create policy products_read on public.products for select to authenticated using (private.is_active());
create policy products_create on public.products for insert to authenticated with check (private.is_active() and created_by = auth.uid());
create policy batches_read on public.batches for select to authenticated using (
 private.is_master() or (private.is_active() and store_id = private.my_store() and (private.is_admin() or created_by = auth.uid()))
);
create policy batches_create on public.batches for insert to authenticated with check (
 created_by = auth.uid() and (private.is_master() or (private.is_active() and store_id = private.my_store()))
);
revoke all on public.products, public.batches from anon, authenticated;
grant select, insert on public.products, public.batches to authenticated;
grant all on public.products, public.batches to service_role;

-- Shared images contain product photography only; no store-specific evidence.
insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values ('product-photos', 'product-photos', false, 5242880, array['image/jpeg','image/png','image/webp']);
create table public.product_photos (
 id uuid primary key default gen_random_uuid(), product_id uuid not null references public.products(id),
 object_path text not null unique, created_by uuid not null default auth.uid() references public.profiles(id), created_at timestamptz not null default now()
);
alter table public.product_photos enable row level security;
create policy photos_read on public.product_photos for select to authenticated using(private.is_active());
create policy photos_create on public.product_photos for insert to authenticated with check(
 private.is_active() and created_by = auth.uid() and object_path like auth.uid()::text || '/' || product_id::text || '/%'
 and exists(select 1 from storage.objects o where o.bucket_id = 'product-photos' and o.name = object_path and o.owner_id = auth.uid()::text)
);
revoke all on public.product_photos from anon, authenticated;
grant select, insert on public.product_photos to authenticated;
grant all on public.product_photos to service_role;
create policy storage_read on storage.objects for select to authenticated using(bucket_id = 'product-photos' and private.is_active());
create policy storage_insert on storage.objects for insert to authenticated with check(
 bucket_id = 'product-photos' and private.is_active() and (storage.foldername(name))[1] = auth.uid()::text
);
create policy storage_cleanup on storage.objects for delete to authenticated using(
 bucket_id = 'product-photos' and owner_id = auth.uid()::text and private.is_active()
 and not exists(select 1 from public.product_photos where object_path = name)
);
