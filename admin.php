<?php
declare(strict_types=1);

session_start();
require __DIR__ . '/config.php';

const FOTO_MAX_BYTES = 5242880;

$uploadDir = __DIR__ . '/uploads';

if (!isset($_SESSION['csrf_token'])) {
    $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
}

function csrfToken(): string
{
    return (string)$_SESSION['csrf_token'];
}

function adminAutenticado(): bool
{
    return ($_SESSION['admin_autenticado'] ?? false) === true;
}

function redirigirAdmin(): void
{
    header('Location: admin.php');
    exit;
}

function guardarFlash(string $tipo, string $mensaje): void
{
    $_SESSION['flash'] = [
        'tipo' => $tipo,
        'mensaje' => $mensaje,
    ];
}

function tomarFlash(): ?array
{
    $flash = $_SESSION['flash'] ?? null;
    unset($_SESSION['flash']);

    return is_array($flash) ? $flash : null;
}

function validarCsrf(): void
{
    $token = (string)($_POST['csrf'] ?? '');

    if (!hash_equals(csrfToken(), $token)) {
        guardarFlash('danger', 'La sesion expiro. Intenta de nuevo.');
        redirigirAdmin();
    }
}

function textoPost(string $campo, int $maximo): string
{
    $valor = trim((string)($_POST[$campo] ?? ''));

    if (strlen($valor) > $maximo) {
        return substr($valor, 0, $maximo);
    }

    return $valor;
}

function numeroPost(string $campo): float
{
    $valor = str_replace(',', '.', (string)($_POST[$campo] ?? '0'));
    return max(0, (float)$valor);
}

function enteroPost(string $campo): int
{
    return max(0, (int)($_POST[$campo] ?? 0));
}

function datosProductoDesdePost(): array
{
    $nombre = textoPost('nombre', 150);
    $marca = textoPost('marca', 100);
    $descripcion = textoPost('descripcion', 500);
    $categoria = textoPost('categoria', 80) ?: 'Unisex';
    $precio = numeroPost('precio');
    $precioMayoreo = numeroPost('precio_mayoreo');
    $minimoMayoreo = max(1, enteroPost('minimo_mayoreo'));
    $activoMayoreo = isset($_POST['activo_mayoreo']) ? 1 : 0;

    if ($nombre === '') {
        throw new RuntimeException('Escribe el nombre del perfume.');
    }

    if ($marca === '') {
        throw new RuntimeException('Escribe la marca del perfume.');
    }

    if ($precio <= 0) {
        throw new RuntimeException('El precio de menudeo debe ser mayor a cero.');
    }

    if ($activoMayoreo === 1 && $precioMayoreo <= 0) {
        throw new RuntimeException('El precio de mayoreo debe ser mayor a cero si el producto aparece en mayoreo.');
    }

    return [
        'nombre' => $nombre,
        'marca' => $marca,
        'descripcion' => $descripcion,
        'categoria' => $categoria,
        'precio' => $precio,
        'precio_mayoreo' => $precioMayoreo,
        'minimo_mayoreo' => $minimoMayoreo,
        'stock' => enteroPost('stock'),
        'destacado' => isset($_POST['destacado']) ? 1 : 0,
        'activo' => isset($_POST['activo']) ? 1 : 0,
        'activo_mayoreo' => $activoMayoreo,
    ];
}

function detectarMimeImagen(string $temporal): string
{
    if (class_exists('finfo')) {
        $finfo = new finfo(FILEINFO_MIME_TYPE);
        return (string)$finfo->file($temporal);
    }

    $info = getimagesize($temporal);

    return is_array($info) ? (string)($info['mime'] ?? '') : '';
}

function guardarFotoSubida(?array $archivo, string $uploadDir): ?string
{
    if (!$archivo || !isset($archivo['error']) || $archivo['error'] === UPLOAD_ERR_NO_FILE) {
        return null;
    }

    if ($archivo['error'] !== UPLOAD_ERR_OK) {
        throw new RuntimeException('No se pudo subir la foto. Intenta con otra imagen.');
    }

    if ((int)$archivo['size'] > FOTO_MAX_BYTES) {
        throw new RuntimeException('La foto no debe pasar de 5 MB.');
    }

    $permitidos = [
        'image/jpeg' => 'jpg',
        'image/png' => 'png',
        'image/webp' => 'webp',
    ];

    $mime = detectarMimeImagen((string)$archivo['tmp_name']);

    if (!isset($permitidos[$mime])) {
        throw new RuntimeException('La foto debe ser JPG, PNG o WebP.');
    }

    if (!is_dir($uploadDir) && !mkdir($uploadDir, 0755, true)) {
        throw new RuntimeException('No se pudo crear la carpeta uploads.');
    }

    $nombre = date('YmdHis') . '-' . bin2hex(random_bytes(4)) . '.' . $permitidos[$mime];
    $destino = $uploadDir . DIRECTORY_SEPARATOR . $nombre;

    if (!move_uploaded_file((string)$archivo['tmp_name'], $destino)) {
        throw new RuntimeException('No se pudo guardar la foto en uploads.');
    }

    return $nombre;
}

if (isset($_GET['salir'])) {
    unset($_SESSION['admin_autenticado']);
    guardarFlash('success', 'Sesion cerrada.');
    redirigirAdmin();
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    validarCsrf();

    $accion = (string)($_POST['accion'] ?? '');

    if ($accion === 'login') {
        $clave = (string)($_POST['clave'] ?? '');

        if (hash_equals($adminClave, $clave)) {
            session_regenerate_id(true);
            $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
            $_SESSION['admin_autenticado'] = true;
            guardarFlash('success', 'Listo, ya puedes administrar menudeo y mayoreo.');
        } else {
            guardarFlash('danger', 'Clave incorrecta.');
        }

        redirigirAdmin();
    }

    if (!adminAutenticado()) {
        guardarFlash('danger', 'Inicia sesion para continuar.');
        redirigirAdmin();
    }

    try {
        if ($accion === 'crear') {
            $datos = datosProductoDesdePost();
            $foto = guardarFotoSubida($_FILES['foto'] ?? null, $uploadDir) ?? '';

            $stmt = $pdo->prepare(
                "INSERT INTO perfumes
                (nombre, marca, descripcion, categoria, precio, precio_mayoreo, minimo_mayoreo, foto, stock, destacado, activo, activo_mayoreo)
                VALUES
                (:nombre, :marca, :descripcion, :categoria, :precio, :precio_mayoreo, :minimo_mayoreo, :foto, :stock, :destacado, :activo, :activo_mayoreo)"
            );

            $stmt->execute($datos + ['foto' => $foto]);
            guardarFlash('success', 'Perfume agregado al catalogo.');
        } elseif ($accion === 'actualizar') {
            $id = enteroPost('id');
            $datos = datosProductoDesdePost();
            $foto = guardarFotoSubida($_FILES['foto'] ?? null, $uploadDir);

            if ($foto !== null) {
                $stmt = $pdo->prepare(
                    "UPDATE perfumes
                     SET nombre = :nombre,
                         marca = :marca,
                         descripcion = :descripcion,
                         categoria = :categoria,
                         precio = :precio,
                         precio_mayoreo = :precio_mayoreo,
                         minimo_mayoreo = :minimo_mayoreo,
                         foto = :foto,
                         stock = :stock,
                         destacado = :destacado,
                         activo = :activo,
                         activo_mayoreo = :activo_mayoreo
                     WHERE id = :id"
                );

                $stmt->execute($datos + ['foto' => $foto, 'id' => $id]);
            } else {
                $stmt = $pdo->prepare(
                    "UPDATE perfumes
                     SET nombre = :nombre,
                         marca = :marca,
                         descripcion = :descripcion,
                         categoria = :categoria,
                         precio = :precio,
                         precio_mayoreo = :precio_mayoreo,
                         minimo_mayoreo = :minimo_mayoreo,
                         stock = :stock,
                         destacado = :destacado,
                         activo = :activo,
                         activo_mayoreo = :activo_mayoreo
                     WHERE id = :id"
                );

                $stmt->execute($datos + ['id' => $id]);
            }

            guardarFlash('success', 'Perfume actualizado.');
        } elseif ($accion === 'ocultar') {
            $stmt = $pdo->prepare('UPDATE perfumes SET activo = 0, activo_mayoreo = 0 WHERE id = :id');
            $stmt->execute(['id' => enteroPost('id')]);
            guardarFlash('success', 'Perfume ocultado de menudeo y mayoreo.');
        } elseif ($accion === 'activar') {
            $stmt = $pdo->prepare('UPDATE perfumes SET activo = 1, activo_mayoreo = 1 WHERE id = :id');
            $stmt->execute(['id' => enteroPost('id')]);
            guardarFlash('success', 'Perfume activado en menudeo y mayoreo.');
        }
    } catch (Throwable $e) {
        guardarFlash('danger', $e->getMessage());
    }

    redirigirAdmin();
}

$flash = tomarFlash();
$perfumes = [];

if (adminAutenticado()) {
    try {
        $perfumes = $pdo
            ->query(
                "SELECT id, nombre, marca, descripcion, precio, precio_mayoreo, minimo_mayoreo, foto, stock, categoria, destacado, activo, activo_mayoreo
                 FROM perfumes
                 ORDER BY activo DESC, activo_mayoreo DESC, destacado DESC, nombre ASC"
            )
            ->fetchAll();
    } catch (PDOException $e) {
        http_response_code(500);
        renderSetupError(
            'Falta actualizar la base de datos',
            'El panel admin necesita los campos nuevos de mayoreo.',
            [
                'Importa o ejecuta <code>migracion_mayoreo.sql</code> en phpMyAdmin.',
                'Despues entra de nuevo a <code>http://localhost:8080/catalogo_perfumes/admin.php</code>.',
            ]
        );
    }
}
?>
<!doctype html>
<html lang="es">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Admin | Catalogo de Perfumes</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="assets/style.css">
</head>
<body class="admin-body">
<nav class="navbar bg-body border-bottom shadow-sm">
    <div class="container py-2 gap-2">
        <a class="navbar-brand fw-bold" href="index.php">Mi Perfumeria</a>
        <div class="d-flex gap-2">
            <a class="btn btn-outline-dark" href="index.php">Menudeo</a>
            <a class="btn btn-outline-success" href="mayoreo.php">Mayoreo</a>
            <?php if (adminAutenticado()): ?>
                <a class="btn btn-dark" href="admin.php?salir=1">Salir</a>
            <?php endif; ?>
        </div>
    </div>
</nav>

<main class="container py-5">
    <?php if ($flash): ?>
        <div class="alert alert-<?= e($flash['tipo']) ?>"><?= e($flash['mensaje']) ?></div>
    <?php endif; ?>

    <?php if (!adminAutenticado()): ?>
        <section class="admin-login mx-auto">
            <h1 class="h3 mb-3">Entrar al panel</h1>
            <p class="text-secondary">Usa la clave configurada en <code>config.php</code>.</p>

            <form method="post" class="vstack gap-3">
                <input type="hidden" name="csrf" value="<?= e(csrfToken()) ?>">
                <input type="hidden" name="accion" value="login">

                <div>
                    <label class="form-label" for="clave">Clave</label>
                    <input class="form-control form-control-lg" type="password" id="clave" name="clave" required autofocus>
                </div>

                <button class="btn btn-warning btn-lg fw-semibold" type="submit">Entrar</button>
            </form>
        </section>
    <?php else: ?>
        <div class="d-flex flex-column flex-lg-row justify-content-between gap-3 mb-4">
            <div>
                <h1 class="h2 mb-1">Administrar menudeo y mayoreo</h1>
                <p class="text-secondary mb-0">Controla precios, minimos, stock, fotos y visibilidad por canal.</p>
            </div>

            <div class="admin-key-list">
                <div>Admin: <code><?= e($adminClave) ?></code></div>
                <div>Mayoreo: <code><?= e($mayoreoClave) ?></code></div>
            </div>
        </div>

        <section class="admin-section mb-5">
            <h2 class="h4 mb-3">Nuevo perfume</h2>
            <form method="post" enctype="multipart/form-data" class="row g-3">
                <input type="hidden" name="csrf" value="<?= e(csrfToken()) ?>">

                <div class="col-md-6 col-xl-3">
                    <label class="form-label" for="nombre">Nombre</label>
                    <input class="form-control" type="text" id="nombre" name="nombre" maxlength="150" required>
                </div>
                <div class="col-md-6 col-xl-3">
                    <label class="form-label" for="marca">Marca</label>
                    <input class="form-control" type="text" id="marca" name="marca" maxlength="100" required>
                </div>
                <div class="col-md-6 col-xl-2">
                    <label class="form-label" for="categoria">Categoria</label>
                    <input class="form-control" type="text" id="categoria" name="categoria" maxlength="80" value="Unisex">
                </div>
                <div class="col-6 col-md-3 col-xl-2">
                    <label class="form-label" for="precio">Precio menudeo</label>
                    <input class="form-control" type="number" id="precio" name="precio" min="0" step="0.01" required>
                </div>
                <div class="col-6 col-md-3 col-xl-2">
                    <label class="form-label" for="precio_mayoreo">Precio mayoreo</label>
                    <input class="form-control" type="number" id="precio_mayoreo" name="precio_mayoreo" min="0" step="0.01" required>
                </div>
                <div class="col-6 col-md-3 col-xl-2">
                    <label class="form-label" for="minimo_mayoreo">Min. mayoreo</label>
                    <input class="form-control" type="number" id="minimo_mayoreo" name="minimo_mayoreo" min="1" step="1" value="6">
                </div>
                <div class="col-6 col-md-3 col-xl-2">
                    <label class="form-label" for="stock">Stock</label>
                    <input class="form-control" type="number" id="stock" name="stock" min="0" step="1" value="1">
                </div>
                <div class="col-lg-8">
                    <label class="form-label" for="descripcion">Descripcion</label>
                    <textarea class="form-control" id="descripcion" name="descripcion" rows="2" maxlength="500"></textarea>
                </div>
                <div class="col-lg-4">
                    <label class="form-label" for="foto">Foto</label>
                    <input class="form-control" type="file" id="foto" name="foto" accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp">
                </div>
                <div class="col-md-8 d-flex flex-wrap align-items-center gap-4">
                    <div class="form-check">
                        <input class="form-check-input" type="checkbox" id="destacado" name="destacado">
                        <label class="form-check-label" for="destacado">Destacado</label>
                    </div>
                    <div class="form-check">
                        <input class="form-check-input" type="checkbox" id="activo" name="activo" checked>
                        <label class="form-check-label" for="activo">Visible menudeo</label>
                    </div>
                    <div class="form-check">
                        <input class="form-check-input" type="checkbox" id="activo_mayoreo" name="activo_mayoreo" checked>
                        <label class="form-check-label" for="activo_mayoreo">Visible mayoreo</label>
                    </div>
                </div>
                <div class="col-md-4 text-md-end">
                    <button class="btn btn-warning fw-semibold px-4" type="submit" name="accion" value="crear">Agregar perfume</button>
                </div>
            </form>
        </section>

        <section>
            <h2 class="h4 mb-3">Productos</h2>

            <?php if (!$perfumes): ?>
                <div class="alert alert-info">Aun no hay perfumes registrados.</div>
            <?php else: ?>
                <div class="admin-products">
                    <?php foreach ($perfumes as $p): ?>
                        <?php
                            $fotoNombre = trim((string)$p['foto']);
                            $foto = $fotoNombre !== '' ? 'uploads/' . basename($fotoNombre) : 'assets/sin-foto.svg';
                            $activo = (int)$p['activo'] === 1;
                            $activoMayoreo = (int)$p['activo_mayoreo'] === 1;
                            $visible = $activo || $activoMayoreo;
                        ?>
                        <form method="post" enctype="multipart/form-data" class="admin-product <?= $visible ? '' : 'is-disabled' ?>">
                            <input type="hidden" name="csrf" value="<?= e(csrfToken()) ?>">
                            <input type="hidden" name="id" value="<?= (int)$p['id'] ?>">

                            <div class="admin-product-photo">
                                <img src="<?= e($foto) ?>" alt="<?= e($p['nombre']) ?>" onerror="this.src='assets/sin-foto.svg'">
                            </div>

                            <div class="admin-product-fields">
                                <div class="row g-2">
                                    <div class="col-md-6 col-xl-3">
                                        <label class="form-label">Nombre</label>
                                        <input class="form-control" type="text" name="nombre" maxlength="150" value="<?= e($p['nombre']) ?>" required>
                                    </div>
                                    <div class="col-md-6 col-xl-3">
                                        <label class="form-label">Marca</label>
                                        <input class="form-control" type="text" name="marca" maxlength="100" value="<?= e($p['marca']) ?>" required>
                                    </div>
                                    <div class="col-md-6 col-xl-2">
                                        <label class="form-label">Categoria</label>
                                        <input class="form-control" type="text" name="categoria" maxlength="80" value="<?= e($p['categoria']) ?>">
                                    </div>
                                    <div class="col-6 col-md-3 col-xl-2">
                                        <label class="form-label">Menudeo</label>
                                        <input class="form-control" type="number" name="precio" min="0" step="0.01" value="<?= e(number_format((float)$p['precio'], 2, '.', '')) ?>" required>
                                    </div>
                                    <div class="col-6 col-md-3 col-xl-2">
                                        <label class="form-label">Mayoreo</label>
                                        <input class="form-control" type="number" name="precio_mayoreo" min="0" step="0.01" value="<?= e(number_format((float)$p['precio_mayoreo'], 2, '.', '')) ?>" required>
                                    </div>
                                    <div class="col-6 col-md-3 col-xl-2">
                                        <label class="form-label">Min. mayoreo</label>
                                        <input class="form-control" type="number" name="minimo_mayoreo" min="1" step="1" value="<?= max(1, (int)$p['minimo_mayoreo']) ?>">
                                    </div>
                                    <div class="col-6 col-md-3 col-xl-2">
                                        <label class="form-label">Stock</label>
                                        <input class="form-control" type="number" name="stock" min="0" step="1" value="<?= (int)$p['stock'] ?>">
                                    </div>
                                    <div class="col-xl-8">
                                        <label class="form-label">Descripcion</label>
                                        <textarea class="form-control" name="descripcion" rows="2" maxlength="500"><?= e($p['descripcion']) ?></textarea>
                                    </div>
                                    <div class="col-xl-4">
                                        <label class="form-label">Cambiar foto</label>
                                        <input class="form-control" type="file" name="foto" accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp">
                                    </div>
                                </div>
                            </div>

                            <div class="admin-product-actions">
                                <div class="form-check">
                                    <input class="form-check-input" type="checkbox" id="destacado-<?= (int)$p['id'] ?>" name="destacado" <?= (int)$p['destacado'] === 1 ? 'checked' : '' ?>>
                                    <label class="form-check-label" for="destacado-<?= (int)$p['id'] ?>">Destacado</label>
                                </div>
                                <div class="form-check">
                                    <input class="form-check-input" type="checkbox" id="activo-<?= (int)$p['id'] ?>" name="activo" <?= $activo ? 'checked' : '' ?>>
                                    <label class="form-check-label" for="activo-<?= (int)$p['id'] ?>">Menudeo</label>
                                </div>
                                <div class="form-check">
                                    <input class="form-check-input" type="checkbox" id="activo-mayoreo-<?= (int)$p['id'] ?>" name="activo_mayoreo" <?= $activoMayoreo ? 'checked' : '' ?>>
                                    <label class="form-check-label" for="activo-mayoreo-<?= (int)$p['id'] ?>">Mayoreo</label>
                                </div>

                                <button class="btn btn-dark w-100" type="submit" name="accion" value="actualizar">Guardar</button>

                                <?php if ($visible): ?>
                                    <button class="btn btn-outline-danger w-100" type="submit" name="accion" value="ocultar">Ocultar todo</button>
                                <?php else: ?>
                                    <button class="btn btn-outline-success w-100" type="submit" name="accion" value="activar">Activar todo</button>
                                <?php endif; ?>
                            </div>
                        </form>
                    <?php endforeach; ?>
                </div>
            <?php endif; ?>
        </section>
    <?php endif; ?>
</main>

<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"></script>
</body>
</html>
