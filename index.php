<?php
declare(strict_types=1);
require __DIR__ . '/config.php';

try {
    $stmt = $pdo->query(
        "SELECT id, nombre, marca, descripcion, precio, foto, stock, categoria
         FROM perfumes
         WHERE activo = 1
         ORDER BY destacado DESC, nombre ASC"
    );
    $perfumes = $stmt->fetchAll();
} catch (PDOException $e) {
    http_response_code(500);
    renderSetupError(
        'Falta preparar la base de datos',
        'PHP ya pudo conectarse a MySQL, pero no encontro la tabla de perfumes.',
        [
            'Abre phpMyAdmin.',
            'Importa el archivo <code>database.sql</code> que viene en este proyecto.',
            'Vuelve a cargar <code>http://localhost:8080/catalogo_perfumes/</code>.',
        ]
    );
}
?>
<!doctype html>
<html lang="es">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Catalogo menudeo | Perfumes</title>
    <meta name="description" content="Catalogo de perfumes de menudeo con carrito y pedido por WhatsApp">
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="assets/style.css">
</head>
<body>
<header class="hero py-5">
    <div class="container text-center">
        <span class="badge rounded-pill text-bg-warning mb-3">Catalogo menudeo</span>
        <h1 class="display-5 fw-bold">Perfumes que dejan huella</h1>
        <p class="lead mb-0">Elige tus favoritos y envia tu pedido por WhatsApp.</p>
    </div>
</header>

<nav class="navbar sticky-top bg-body border-bottom shadow-sm">
    <div class="container py-2 gap-2">
        <a class="navbar-brand fw-bold" href="index.php">Mi Perfumeria</a>
        <div class="d-flex flex-grow-1 justify-content-end gap-2">
            <input id="buscador" class="form-control buscador" type="search" placeholder="Buscar perfume o marca">
            <a class="btn btn-outline-success d-none d-md-inline-flex" href="mayoreo.php">Mayoreo</a>
            <a class="btn btn-outline-dark d-none d-md-inline-flex" href="admin.php">Admin</a>
            <button class="btn btn-dark position-relative" type="button" data-bs-toggle="offcanvas" data-bs-target="#carritoCanvas">
                Carrito
                <span id="contadorCarrito" class="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger">0</span>
            </button>
        </div>
    </div>
</nav>

<main class="container py-5">
    <?php if (!$perfumes): ?>
        <div class="alert alert-info">Todavia no hay perfumes publicados.</div>
    <?php else: ?>
        <div id="listaPerfumes" class="row g-4">
            <?php foreach ($perfumes as $p): ?>
                <?php
                    $fotoNombre = trim((string)$p['foto']);
                    $foto = $fotoNombre !== '' ? 'uploads/' . basename($fotoNombre) : 'assets/sin-foto.svg';
                    $agotado = (int)$p['stock'] <= 0;
                ?>
                <div class="col-12 col-sm-6 col-lg-4 col-xl-3 perfume-item"
                     data-busqueda="<?= e(strtolower((string)($p['nombre'] . ' ' . $p['marca'] . ' ' . $p['categoria']))) ?>">
                    <article class="card h-100 perfume-card border-0 shadow-sm">
                        <div class="foto-wrap">
                            <img src="<?= e($foto) ?>" class="card-img-top perfume-foto" alt="<?= e($p['nombre']) ?>"
                                 onerror="this.src='assets/sin-foto.svg'">
                            <?php if ($agotado): ?>
                                <span class="badge text-bg-secondary etiqueta-stock">Agotado</span>
                            <?php elseif ((int)$p['stock'] <= 5): ?>
                                <span class="badge text-bg-danger etiqueta-stock">Ultimas unidades</span>
                            <?php endif; ?>
                        </div>

                        <div class="card-body d-flex flex-column">
                            <div class="small text-uppercase text-secondary fw-semibold"><?= e($p['marca']) ?></div>
                            <h2 class="h5 mt-1"><?= e($p['nombre']) ?></h2>
                            <p class="small text-secondary flex-grow-1"><?= e($p['descripcion']) ?></p>
                            <div class="d-flex justify-content-between align-items-center mb-3">
                                <span class="precio">$<?= number_format((float)$p['precio'], 2) ?></span>
                                <span class="small text-secondary">Stock: <?= (int)$p['stock'] ?></span>
                            </div>

                            <div class="input-group mb-2">
                                <button class="btn btn-outline-secondary btn-restar" type="button">-</button>
                                <input class="form-control text-center cantidad" type="number" min="1"
                                       max="<?= max(1, (int)$p['stock']) ?>" value="1" <?= $agotado ? 'disabled' : '' ?>>
                                <button class="btn btn-outline-secondary btn-sumar" type="button">+</button>
                            </div>

                            <button
                                class="btn btn-warning fw-semibold btn-agregar"
                                type="button"
                                <?= $agotado ? 'disabled' : '' ?>
                                data-id="<?= (int)$p['id'] ?>"
                                data-nombre="<?= e($p['nombre']) ?>"
                                data-marca="<?= e($p['marca']) ?>"
                                data-precio="<?= (float)$p['precio'] ?>"
                                data-foto="<?= e($foto) ?>"
                                data-stock="<?= (int)$p['stock'] ?>"
                                data-minimo="1">
                                Agregar al carrito
                            </button>
                        </div>
                    </article>
                </div>
            <?php endforeach; ?>
        </div>
    <?php endif; ?>
</main>

<div class="offcanvas offcanvas-end" tabindex="-1" id="carritoCanvas">
    <div class="offcanvas-header border-bottom">
        <h3 class="offcanvas-title h5 mb-0">Tu pedido</h3>
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

<script>
window.CATALOGO_CONFIG = {
    whatsappNumero: <?= json_encode($whatsappNumero, JSON_UNESCAPED_UNICODE) ?>,
    tipoPedido: 'menudeo',
    tituloPedido: 'Pedido de menudeo'
};
</script>
<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"></script>
<script src="assets/app.js"></script>
</body>
</html>
