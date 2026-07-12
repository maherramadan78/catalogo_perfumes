# Supabase Setup

## 1. Crear la base y reglas

1. Entra a tu proyecto de Supabase.
2. Abre **SQL Editor**.
3. Click en **New query**.
4. Copia todo el contenido de `supabase/schema.sql`.
5. Pegalo en Supabase.
6. Click en **Run**.

Esto crea:

- Tabla `productos`.
- Reglas RLS para menudeo publico.
- Reglas RLS para mayoreo con login.
- Reglas RLS para que solo `arezlebnen_2017_admin@gmail.com` pueda editar.
- Bucket publico `productos` para fotos.
- Productos iniciales.

## 2. Crear usuarios

En Supabase ve a **Authentication > Users**.

Admin:

- Email: `arezlebnen_2017_admin@gmail.com`
- Password: la que tu decidas.

Clientes mayoreo:

- Crea un usuario por cliente con su email.
- Esos usuarios solo pueden ver mayoreo y hacer pedido.

Admin de productos:

- Crea el usuario en **Authentication > Users**.
- No lo agregues como miembro del proyecto Supabase.
- Luego autoriza su correo con SQL:

```sql
insert into public.catalog_admins (email, role, activo)
values ('correo-del-admin@ejemplo.com', 'product_admin', true)
on conflict (email) do update set
    role = excluded.role,
    activo = excluded.activo,
    updated_at = now();
```

El rol `product_admin` puede entrar al panel del catalogo para agregar y editar productos, precios de menudeo, precios de mayoreo, stock y fotos. No necesita acceso al dashboard de Supabase.

## 3. Configurar el catalogo

En Supabase ve a **Project Settings > API**.

Copia:

- Project URL
- anon public key

Luego edita `supabase-public/supabase-config.js`:

```js
window.SUPABASE_CONFIG = {
    url: 'TU_PROJECT_URL',
    anonKey: 'TU_ANON_PUBLIC_KEY'
};
```

No uses ni publiques la `service_role key`.

## 4. Rutas

- Menudeo: `supabase-public/index.html`
- Mayoreo: `supabase-public/mayoreo.html`
- Admin: `supabase-public/admin.html`

## 5. Netlify

El archivo `netlify.toml` ya apunta a `supabase-public`, asi que Netlify puede publicar esa carpeta directamente desde GitHub.
