<?php
declare(strict_types=1);

session_start();
require __DIR__ . '/config.php';

if (!isset($_SESSION['mayoreo_csrf'])) {
    $_SESSION['mayoreo_csrf'] = bin2hex(random_bytes(32));
}

function mayoreoAutenticado(): bool
{
    return ($_SESSION['mayoreo_autenticado'] ?? false) === true;
}

function mayoreoCsrf(): string
{
    return (string)$_SESSION['mayoreo_csrf'];
}

function redirigirMayoreo(): void
{
    header('Location: mayoreo.php');
    exit;
}

if (isset($_GET['salir'])) {
    unset($_SESSION['mayoreo_autenticado']);
    redirigirMayoreo();
}

$error = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $token = (string)($_POST['csrf'] ?? '');
    $clave = (string)($_POST['clave'] ?? '');

    if (!hash_equals(mayoreoCsrf(), $token)) {
        $error = 'La sesion expiro. Intenta de nuevo.';
    } elseif (hash_equals($mayoreoClave, $clave)) {
        session_regenerate_id(true);
        $_SESSION['mayoreo_csrf'] = bin2hex(random_bytes(32));
        $_SESSION['mayoreo_autenticado'] = true;
        redirigirMayoreo();
    } else {
        $error = 'Clave de mayoreo incorrecta.';
    }
}

$perfumes = [];

if (mayoreoAutenticado()) {
    try {
        $stmt = $pdo->query(
            "SELECT id, nombre, marca, descripcion, precio_mayoreo, minimo_mayoreo, foto, stock, categoria
             FROM perfumes
             WHERE activo_mayoreo = 1
             ORDER BY destacado DESC, nombre ASC"
        );
        $perfumes = $stmt->fetchAll();
    } catch (PDOException $e) {
        http_response_code(500);
        renderSetupError(
            'Falta actualizar la base de datos',
            'La pagina de mayoreo necesita los campos nuevos de precios mayoristas.',
            [
                'Importa o ejecuta <code>migracion_mayoreo.sql</code> en phpMyAdmin.',
                'Vuelve a cargar <code>http://localhost:8080/catalogo_perfumes/mayoreo.php</code>.',
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
    <title>Catalogo mayoreo | Perfumes</title>
    <meta name="description" content="Catalogo de perfumes de mayoreo con pedido por WhatsApp">
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="assets/style.css">
</head>
<body class="mayoreo-body">
<header class="hero hero-mayoreo py-5">
    <div class="container text-center">
        <span class="badge rounded-pill text-bg-success mb-3">Catalogo mayoreo</span>
        <h1 class="display-5 fw-bold">Precios especiales para clientes mayoristas</h1>
        <p class="lead mb-0">Compra por minimo de piezas y envia tu pedido por WhatsApp.</p>
    </div>
</header>

<nav class="navbar sticky-top bg-body border-bottom shadow-sm">
    <div class="container py-2 gap-2">
        <a class="navbar-brand fw-bold" href="index.php">Mi Perfumeria</a>
        <div class="d-flex flex-grow-1 justify-content-end gap-2">
            <?php if (mayoreoAutenticado()): ?>
                <input id="buscador" class="form-control buscador" type="search" placeholder="Buscar perfume o marca">
            <?php endif; ?>
            <a class="btn btn-outline-dark d-none d-md-inline-flex" href="index.php">Menudeo</a>
            <?php if (mayoreoAutenticado()): ?>
                <a class="btn btn-outline-secondary d-none d-md-inline-flex" href="mayoreo.php?salir=1">Salir</a>
                <button class="btn btn-success position-relative" type="button" data-bs-toggle="offcanvas" data-bs-target="#carritoCanvas">
                    Carrito
                    <span id="contadorCarrito" class="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger">0</span>
                </button>
            <?php endif; ?>
        </div>
    </div>
</nav>

<main class="container py-5">
    <?php if (!mayoreoAutenticado()): ?>
        <section class="admin-login mx-auto">
            <h1 class="h3 mb-3">Entrar a mayoreo</h1>
            <p class="text-secondary">Este catalogo es solo para clientes mayoristas.</p>

            <?php if ($error !== ''): ?>
                <div class="alert alert-danger"><?= e($error) ?></div>
            <?php endif; ?>

            <form method="post" class="vstack gap-3">
                <input type="hidden" name="csrf" value="<?= e(mayoreoCsrf()) ?>">

                <div>
                    <label class="form-label" for="clave">Clave de mayoreo</label>
                    <input class="form-control form-control-lg" type="password" id="clave" name="clave" required autofocus>
                </div>

                <button class="btn btn-success btn-lg fw-semibold" type="submit">Entrar</button>
            </form>
        </section>
    <?php elseif (!$perfumes): ?>
        <div class="alert alert-info">Todavia no hay perfumes publicados para mayoreo.</div>
    <?php else: ?>
        <div class="alert alert-success d-flex flex-column flex-md-row justify-content-between gap-2">
            <span>Estas viendo precios de mayoreo. Cada producto puede tener minimo de piezas diferente.</span>
            <a class="alert-link" href="index.php">Cambiar a menudeo</a>
        </div>

        <div id="listaPerfumes" class="row g-4">
            <?php foreach ($perfumes as $p): ?>
                <?php
                    $fotoNombre = trim((string)$p['foto']);
                    $foto = $fotoNombre !== '' ? 'uploads/' . basename($fotoNombre) : 'assets/sin-foto.svg';
                    $stock = (int)$p['stock'];
                    $minimo = max(1, (int)$p['minimo_mayoreo']);
                    $precioMayoreo = (float)$p['precio_mayoreo'];
                    $agotado = $stock <= 0 || $stock < $minimo || $precioMayoreo <= 0;
                ?>
                <div class="col-12 col-sm-6 col-lg-4 col-xl-3 perfume-item"
                     data-busqueda="<?= e(strtolower((string)($p['nombre'] . ' ' . $p['marca'] . ' ' . $p['categoria']))) ?>">
                    <article class="card h-100 perfume-card border-0 shadow-sm">
                        <div class="foto-wrap">
                            <img src="<?= e($foto) ?>" class="card-img-top perfume-foto" alt="<?= e($p['nombre']) ?>"
                                 onerror="this.src='assets/sin-foto.svg'">
                            <span class="badge text-bg-success etiqueta-stock">Min. <?= $minimo ?> pzas</span>
                        </div>

                        <div class="card-body d-flex flex-column">
                            <div class="small text-uppercase text-secondary fw-semibold"><?= e($p['marca']) ?></div>
                            <h2 class="h5 mt-1"><?= e($p['nombre']) ?></h2>
                            <p class="small text-secondary flex-grow-1"><?= e($p['descripcion']) ?></p>
                            <div class="mb-3">
                                <span class="precio text-success">$<?= number_format($precioMayoreo, 2) ?></span>
                                <div class="small text-secondary">Stock: <?= $stock ?> | Minimo: <?= $minimo ?></div>
                            </div>

                            <div class="input-group mb-2">
                                <button class="btn btn-outline-secondary btn-restar" type="button">-</button>
                                <input class="form-control text-center cantidad" type="number"
                                       min="<?= $minimo ?>" max="<?= max($minimo, $stock) ?>" value="<?= $minimo ?>" <?= $agotado ? 'disabled' : '' ?>>
                                <button class="btn btn-outline-secondary btn-sumar" type="button">+</button>
                            </div>

                            <button
                                class="btn btn-success fw-semibold btn-agregar"
                                type="button"
                                <?= $agotado ? 'disabled' : '' ?>
                                data-id="<?= (int)$p['id'] ?>"
                                data-nombre="<?= e($p['nombre']) ?>"
                                data-marca="<?= e($p['marca']) ?>"
                                data-precio="<?= $precioMayoreo ?>"
                                data-foto="<?= e($foto) ?>"
                                data-stock="<?= $stock ?>"
                                data-minimo="<?= $minimo ?>">
                                Agregar mayoreo
                            </button>
                        </div>
                    </article>
                </div>
            <?php endforeach; ?>
        </div>
    <?php endif; ?>
</main>

<?php if (mayoreoAutenticado()): ?>
    <div class="offcanvas offcanvas-end" tabindex="-1" id="carritoCanvas">
        <div class="offcanvas-header border-bottom">
            <h3 class="offcanvas-title h5 mb-0">Pedido de mayoreo</h3>
            <button type="button" class="btn-close" data-bs-dismiss="offcanvas"></button>
        </div>
        <div class="offcanvas-body d-flex flex-column">
            <div id="carritoVacio" class="text-center text-secondary py-5">
                Tu carrito esta vacio.
            </div>

            <div id="itemsCarrito" class="vstack gap-3"></div>

            <div class="mt-auto pt-3 border-top">
                <div class="d-flex justify-content-between fs-5 fw-bold mb-3">
                    <span>Total</span>
                    <span id="totalCarrito">$0.00</span>
                </div>
                <button id="btnWhatsApp" class="btn btn-success w-100 btn-lg" type="button" disabled>
                    Enviar pedido por WhatsApp
                </button>
                <button id="btnVaciar" class="btn btn-link text-danger w-100 mt-2" type="button" disabled>
                    Vaciar carrito
                </button>
            </div>
        </div>
    </div>
<?php endif; ?>

<script>
window.CATALOGO_CONFIG = {
    whatsappNumero: <?= json_encode($whatsappNumero, JSON_UNESCAPED_UNICODE) ?>,
    tipoPedido: 'mayoreo',
    tituloPedido: 'Pedido de mayoreo'
};
</script>
<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"></script>
<script src="assets/app.js"></script>
</body>
</html>
