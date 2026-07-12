# Catalogo de perfumes con menudeo, mayoreo, MySQL y WhatsApp

Este proyecto usa `index.php` como frontend principal. No necesita `index.html`, porque PHP genera el HTML usando los perfumes guardados en MySQL.

Tambien incluye una version preparada para Firebase en `firebase-public/`. Esa version usa archivos `.html`, Firestore, Firebase Authentication, Storage y Firebase Hosting. Lee `FIREBASE_SETUP.md` para publicarla online.

## Requisitos

- PHP 8 o superior
- MySQL / MariaDB
- Apache local con XAMPP, WAMP, Laragon o un hosting con PHP
- Extension PDO MySQL habilitada

## Instalacion local

1. Copia la carpeta `catalogo_perfumes` dentro de `htdocs` o de la carpeta publica de tu servidor local.
   - En esta computadora el XAMPP activo usa: `C:\xampp3\htdocs\catalogo_perfumes`
2. Enciende Apache y MySQL.
3. Abre phpMyAdmin.
4. Importa `database.sql`.
5. Abre `config.php` y revisa:
   - `$db`
   - `$user`
   - `$pass`
   - `$whatsappNumero`
   - `$adminClave`
   - `$mayoreoClave`

## Links

Catalogo para clientes normales:

`http://localhost:8080/catalogo_perfumes/`

Catalogo para clientes de mayoreo:

`http://localhost:8080/catalogo_perfumes/mayoreo.php`

Panel de administracion:

`http://localhost:8080/catalogo_perfumes/admin.php`

## Claves

Las claves se configuran en `config.php`:

```php
$adminClave = 'Perfumes2026!';
$mayoreoClave = 'Mayoreo2026!';
```

Cambia esas claves antes de publicar el catalogo.

## Menudeo y mayoreo

Cada perfume puede tener:

- Precio de menudeo
- Precio de mayoreo
- Minimo de piezas para mayoreo
- Visibilidad independiente para menudeo
- Visibilidad independiente para mayoreo

Ejemplo:

| Perfume | Menudeo | Mayoreo | Minimo |
|---|---:|---:|---:|
| Asad | $650 | $560 | 6 |
| Yara | $720 | $620 | 6 |

El carrito de menudeo y el carrito de mayoreo se guardan por separado en el navegador.

## Actualizar una base ya existente

Si ya tenias la tabla `perfumes`, ejecuta o importa:

`migracion_mayoreo.sql`

Eso agrega:

- `precio_mayoreo`
- `minimo_mayoreo`
- `activo_mayoreo`

## Fotos

Las fotos se guardan en `uploads/`.

Si agregas fotos manualmente:

1. Copialas dentro de `uploads/`.
2. En la columna `foto` guarda solo el nombre del archivo.
   - Ejemplo: `asad.jpg`

El panel admin ya hace esto automaticamente cuando subes una imagen.

## WhatsApp

Usa solamente numeros, sin espacios, guiones ni signo `+`.

Ejemplo para Mexico:

```php
$whatsappNumero = '5218112345678';
```

Los pedidos de mayoreo llegan marcados como `Pedido de mayoreo`.

## Archivos principales

- `index.php`: catalogo de menudeo
- `mayoreo.php`: catalogo de mayoreo con clave
- `admin.php`: panel para administrar perfumes
- `config.php`: conexion MySQL, WhatsApp y claves
- `database.sql`: base de datos inicial
- `migracion_mayoreo.sql`: actualizacion para bases existentes
- `assets/style.css`: estilos
- `assets/app.js`: buscador, carrito y envio por WhatsApp
- `uploads/`: fotos de productos
