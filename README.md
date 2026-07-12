# Catalogo de perfumes online

Catalogo digital para vender perfumes en menudeo y mayoreo. La version publicada usa Netlify para hosting, Supabase para base de datos, Supabase Auth para acceso privado y WhatsApp para recibir pedidos.

## Sitio publicado

- Menudeo publico: `https://mi-perfumeria.netlify.app/`
- Mayoreo con login: `https://mi-perfumeria.netlify.app/mayoreo`
- Admin: `https://mi-perfumeria.netlify.app/admin`

## Tecnologia actual

- Frontend estatico en `supabase-public/`
- Supabase Database para productos
- Supabase Auth para admin y clientes de mayoreo
- Supabase Storage para fotos de productos
- Netlify para publicar el sitio
- GitHub para historial y despliegues automaticos

## Seguridad

- Los clientes de menudeo pueden ver productos y mandar pedido sin cuenta.
- Los clientes de mayoreo necesitan email y contrasena.
- Solo los correos en `catalog_admins` pueden entrar al admin.
- Las reglas RLS de Supabase estan en `supabase/schema.sql`.
- No se usa `service_role` en el navegador.

## Configuracion principal

La app publicada toma su configuracion de:

`supabase-public/supabase-config.js`

Ahi se define:

- URL publica de Supabase
- `anonKey` publica de Supabase
- numero de WhatsApp
- email admin principal

## Base de datos

Ejecuta el SQL de `supabase/schema.sql` en Supabase SQL Editor para crear:

- `productos`
- `catalog_admins`
- funciones de permisos
- politicas RLS
- bucket `productos`
- productos iniciales

## Archivos principales

- `supabase-public/index.html`: catalogo de menudeo
- `supabase-public/mayoreo.html`: catalogo de mayoreo
- `supabase-public/admin.html`: panel admin
- `supabase-public/assets/supabase-catalog.js`: carrito y pedidos
- `supabase-public/assets/supabase-admin.js`: administracion de productos
- `supabase-public/assets/style.css`: diseno visual
- `supabase/schema.sql`: base de datos y seguridad
- `netlify.toml`: configuracion de Netlify

## Version anterior PHP

Los archivos PHP y MySQL originales siguen en el repo como referencia local:

- `index.php`
- `mayoreo.php`
- `admin.php`
- `database.sql`
- `migracion_mayoreo.sql`

La version online actual no depende de esos archivos.
