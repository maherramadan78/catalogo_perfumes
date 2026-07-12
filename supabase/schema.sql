begin;

create table if not exists public.catalog_admins (
    email text primary key,
    role text not null default 'product_admin' check (role in ('owner', 'product_admin')),
    activo boolean not null default true,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create or replace function public.is_catalog_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
    select exists (
        select 1
        from public.catalog_admins
        where lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
          and activo = true
          and role in ('owner', 'product_admin')
    );
$$;

create or replace function public.is_catalog_owner()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
    select exists (
        select 1
        from public.catalog_admins
        where lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
          and activo = true
          and role = 'owner'
    );
$$;

create or replace function public.current_catalog_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
    select role
    from public.catalog_admins
    where lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
      and activo = true
    limit 1;
$$;

alter table public.catalog_admins enable row level security;

drop policy if exists "Owners can read catalog admins" on public.catalog_admins;
drop policy if exists "Owners can manage catalog admins" on public.catalog_admins;

create policy "Owners can read catalog admins"
on public.catalog_admins
for select
to authenticated
using (public.is_catalog_owner());

create policy "Owners can manage catalog admins"
on public.catalog_admins
for all
to authenticated
using (public.is_catalog_owner())
with check (public.is_catalog_owner());

insert into public.catalog_admins (email, role, activo)
values ('arezlebnen_2017_admin@gmail.com', 'owner', true)
on conflict (email) do update set
    role = excluded.role,
    activo = excluded.activo,
    updated_at = now();

grant execute on function public.current_catalog_role() to authenticated;

create table if not exists public.productos (
    id text primary key,
    nombre text not null,
    marca text not null,
    descripcion text not null default '',
    categoria text not null default 'Unisex',
    precio numeric(10,2) not null default 0 check (precio >= 0),
    precio_mayoreo numeric(10,2) not null default 0 check (precio_mayoreo >= 0),
    minimo_mayoreo integer not null default 1 check (minimo_mayoreo >= 1),
    foto_url text not null default 'assets/sin-foto.svg',
    stock integer not null default 0 check (stock >= 0),
    destacado boolean not null default false,
    activo boolean not null default true,
    activo_mayoreo boolean not null default true,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

alter table public.productos enable row level security;

grant select on public.productos to anon, authenticated;
grant insert, update on public.productos to authenticated;

drop policy if exists "Public can read menudeo active products" on public.productos;
drop policy if exists "Wholesale users can read active wholesale products" on public.productos;
drop policy if exists "Admin can manage products" on public.productos;
drop policy if exists "Admins can read all products" on public.productos;
drop policy if exists "Admins can insert products" on public.productos;
drop policy if exists "Admins can update products" on public.productos;

create policy "Public can read menudeo active products"
on public.productos
for select
to anon, authenticated
using (activo = true);

create policy "Wholesale users can read active wholesale products"
on public.productos
for select
to authenticated
using (activo_mayoreo = true);

create policy "Admins can read all products"
on public.productos
for select
to authenticated
using (public.is_catalog_admin());

create policy "Admins can insert products"
on public.productos
for insert
to authenticated
with check (public.is_catalog_admin());

create policy "Admins can update products"
on public.productos
for update
to authenticated
using (public.is_catalog_admin())
with check (public.is_catalog_admin());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
    'productos',
    'productos',
    true,
    5242880,
    array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
    public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Anyone can read product images" on storage.objects;
drop policy if exists "Admin can upload product images" on storage.objects;
drop policy if exists "Admin can update product images" on storage.objects;
drop policy if exists "Admin can delete product images" on storage.objects;

create policy "Anyone can read product images"
on storage.objects
for select
to anon, authenticated
using (bucket_id = 'productos');

create policy "Admin can upload product images"
on storage.objects
for insert
to authenticated
with check (bucket_id = 'productos' and public.is_catalog_admin());

create policy "Admin can update product images"
on storage.objects
for update
to authenticated
using (bucket_id = 'productos' and public.is_catalog_admin())
with check (bucket_id = 'productos' and public.is_catalog_admin());

insert into public.productos (
    id,
    nombre,
    marca,
    descripcion,
    categoria,
    precio,
    precio_mayoreo,
    minimo_mayoreo,
    foto_url,
    stock,
    destacado,
    activo,
    activo_mayoreo
) values
    ('producto_1', 'Asad', 'Lattafa', 'Fragancia intensa, especiada y elegante.', 'Hombre', 650, 559, 6, 'uploads/20260712024136-5c80de67.jpg', 12, true, true, true),
    ('producto_2', '9 PM', 'Afnan', 'Aroma dulce y nocturno, ideal para ocasiones especiales.', 'Hombre', 850, 731, 6, 'uploads/20260712022426-e440b30d.jpg', 8, true, true, true),
    ('producto_3', 'Yara roza', 'Lattafa', 'Fragancia femenina, cremosa y dulce.', 'Mujer', 720, 619.20, 6, 'uploads/20260712022522-41dc0539.jpg', 15, false, true, true),
    ('producto_4', 'Club de Nuit Intense', 'Armaf', 'Fragancia fresca, citrica y amaderada.', 'Hombre', 980, 842.80, 6, 'uploads/20260712022452-48de617b.jpg', 5, false, true, true),
    ('producto_5', 'yara roja', 'lattafa', '', 'mujer', 600, 516, 6, 'uploads/20260712022612-00af05b2.jpg', 1, false, true, true),
    ('producto_6', 'CLUB DE NUIT ICONIC', 'ARMAF', '', 'CABALLERO', 750, 645, 6, 'uploads/20260712024529-de289061.jpg', 1, false, true, true)
on conflict (id) do update set
    nombre = excluded.nombre,
    marca = excluded.marca,
    descripcion = excluded.descripcion,
    categoria = excluded.categoria,
    precio = excluded.precio,
    precio_mayoreo = excluded.precio_mayoreo,
    minimo_mayoreo = excluded.minimo_mayoreo,
    foto_url = excluded.foto_url,
    stock = excluded.stock,
    destacado = excluded.destacado,
    activo = excluded.activo,
    activo_mayoreo = excluded.activo_mayoreo,
    updated_at = now();

commit;
