# Como pasar este catalogo a Firebase

No puedo crear la cuenta Firebase por ti porque requiere tu cuenta de Google, aceptar terminos y manejar credenciales. Pero el proyecto ya queda preparado para Firebase.

## 1. Crear proyecto Firebase

1. Entra a `https://console.firebase.google.com/`.
2. Inicia sesion con tu cuenta de Google.
3. Crea un proyecto nuevo.
4. Puedes desactivar Google Analytics si no lo necesitas por ahora.

## 2. Agregar app web

1. Dentro del proyecto Firebase, presiona el icono Web `</>`.
2. Ponle nombre, por ejemplo `catalogo-perfumes`.
3. Firebase te dara un objeto `firebaseConfig`.
4. Copia esos datos en:

`firebase-public/firebase-config.js`

Tambien cambia tu WhatsApp:

```js
window.CATALOGO_CONFIG = {
    whatsappNumero: '521TU_NUMERO',
    moneda: 'MXN'
};
```

## 3. Activar servicios

Activa estos servicios en Firebase:

- Firestore Database
- Authentication con Email/Password
- Storage
- Hosting

## 4. Crear usuario admin

1. En Firebase Console abre Authentication.
2. En Users, crea un usuario con email y contrasena.
3. Ese email sera tu admin.
4. Cambia `TU_EMAIL_ADMIN@gmail.com` por ese email en:
   - `firestore.rules`
   - `storage.rules`

Admin actual:

```txt
arezlebnen_2017_admin@gmail.com
```

## 5. Crear clientes de mayoreo

En Authentication crea usuarios para clientes mayoristas.

Ejemplo:

```txt
cliente1@gmail.com
cliente2@gmail.com
```

Esos clientes podran entrar a:

`mayoreo.html`

No pueden editar productos; solo ver precios de mayoreo y hacer pedido por WhatsApp.

## 6. Importar productos iniciales

Este proyecto incluye:

`firebase-public/seed-products.json`

Despues de configurar Firebase:

1. Entra a `admin.html`.
2. Inicia sesion con tu usuario admin.
3. Presiona `Importar datos iniciales`.

Eso crea productos en:

- `productos_admin`
- `catalogo_menudeo`
- `catalogo_mayoreo`

## 7. Desplegar

Instala Firebase CLI si no lo tienes:

```powershell
npm install -g firebase-tools
```

Inicia sesion:

```powershell
firebase login
```

Conecta el proyecto:

```powershell
firebase use --add
```

Despliega reglas y hosting:

```powershell
firebase deploy
```

## Archivos Firebase principales

- `firebase-public/index.html`: catalogo de menudeo
- `firebase-public/mayoreo.html`: catalogo de mayoreo con login
- `firebase-public/admin.html`: panel admin con login
- `firebase-public/firebase-config.js`: configuracion del proyecto Firebase
- `firebase-public/assets/firebase-catalog.js`: carrito y catalogos
- `firebase-public/assets/firebase-admin.js`: alta/edicion de productos
- `firestore.rules`: seguridad de Firestore
- `storage.rules`: seguridad de fotos
- `firebase.json`: configuracion de hosting
