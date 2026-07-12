const fs = require('fs');
const path = require('path');
const os = require('os');

const projectId = process.argv[2] || 'mi-perfumeria';
const root = path.resolve(__dirname, '..');
const seedPath = path.join(root, 'firebase-public', 'seed-products.json');
const authPath = path.join(os.homedir(), '.config', 'configstore', 'firebase-tools.json');

function firestoreValue(value) {
  if (typeof value === 'boolean') return { booleanValue: value };
  if (Number.isInteger(value)) return { integerValue: String(value) };
  if (typeof value === 'number') return { doubleValue: value };
  if (value === null || value === undefined) return { nullValue: null };
  return { stringValue: String(value) };
}

function firestoreFields(data) {
  return Object.fromEntries(
    Object.entries(data).map(([key, value]) => [key, firestoreValue(value)])
  );
}

async function writeDoc(collection, id, data, token) {
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${collection}/${id}`;
  const res = await fetch(url, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ fields: firestoreFields(data) })
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${collection}/${id}: ${res.status} ${text}`);
  }
}

async function main() {
  const auth = JSON.parse(fs.readFileSync(authPath, 'utf8'));
  const token = auth?.tokens?.access_token;

  if (!token) {
    throw new Error('No encontre access_token de Firebase CLI. Ejecuta firebase login.');
  }

  const seed = JSON.parse(fs.readFileSync(seedPath, 'utf8').replace(/^\uFEFF/, ''));

  for (const item of seed) {
    const id = item.id;
    const base = {
      nombre: item.nombre,
      marca: item.marca,
      descripcion: item.descripcion,
      categoria: item.categoria,
      fotoUrl: item.fotoUrl,
      stock: item.stock,
      destacado: item.destacado
    };

    await writeDoc('productos_admin', id, item, token);
    await writeDoc('catalogo_menudeo', id, {
      ...base,
      precio: item.precio,
      activo: item.activo
    }, token);
    await writeDoc('catalogo_mayoreo', id, {
      ...base,
      precio_mayoreo: item.precio_mayoreo,
      minimo_mayoreo: item.minimo_mayoreo,
      activo_mayoreo: item.activo_mayoreo
    }, token);

    console.log(`Importado: ${item.nombre}`);
  }

  console.log(`Listo. Productos importados: ${seed.length}`);
}

main().catch(err => {
  console.error(err.message);
  process.exit(1);
});
