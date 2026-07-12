<?php
declare(strict_types=1);

$host = 'localhost';
$db   = 'catalogo_perfumes';
$user = 'root';
$pass = '';
$charset = 'utf8mb4';

/*
 | Numero de WhatsApp con codigo de pais, sin +, espacios ni guiones.
 | Ejemplo Mexico: 5218112345678
 */
$whatsappNumero = '5210000000000';

/*
 | Clave para entrar al panel de administracion.
 | Cambiala en tu config.php local.
 */
$adminClave = 'cambia-esta-clave';

/*
 | Clave para que tus clientes mayoristas entren al catalogo de mayoreo.
 | Cambiala en tu config.php local.
 */
$mayoreoClave = 'cambia-esta-clave-mayoreo';

function e(mixed $value): string
{
    return htmlspecialchars((string)$value, ENT_QUOTES, 'UTF-8');
}

function renderSetupError(string $titulo, string $mensaje, array $pasos = []): void
{
    ?>
    <!doctype html>
    <html lang="es">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title><?= e($titulo) ?></title>
        <style>
            body {
                margin: 0;
                min-height: 100vh;
                display: grid;
                place-items: center;
                padding: 24px;
                color: #201a16;
                background: #f7f5f1;
                font-family: Arial, Helvetica, sans-serif;
            }

            .setup-error {
                width: min(680px, 100%);
                padding: 28px;
                background: #fff;
                border: 1px solid #eadfd2;
                border-radius: 12px;
                box-shadow: 0 18px 45px rgba(32, 26, 22, .12);
            }

            h1 {
                margin: 0 0 10px;
                font-size: clamp(1.7rem, 4vw, 2.4rem);
            }

            p {
                margin: 0 0 18px;
                color: #5e534a;
                line-height: 1.5;
            }

            ol {
                margin: 0;
                padding-left: 1.25rem;
                line-height: 1.65;
            }

            code {
                padding: 2px 6px;
                border-radius: 6px;
                background: #f2ebe3;
            }
        </style>
    </head>
    <body>
        <main class="setup-error">
            <h1><?= e($titulo) ?></h1>
            <p><?= e($mensaje) ?></p>

            <?php if ($pasos): ?>
                <ol>
                    <?php foreach ($pasos as $paso): ?>
                        <li><?= strip_tags($paso, '<code>') ?></li>
                    <?php endforeach; ?>
                </ol>
            <?php endif; ?>
        </main>
    </body>
    </html>
    <?php
    exit;
}

$dsn = "mysql:host={$host};dbname={$db};charset={$charset}";

$options = [
    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    PDO::ATTR_EMULATE_PREPARES   => false,
];

try {
    $pdo = new PDO($dsn, $user, $pass, $options);
} catch (PDOException $e) {
    http_response_code(500);
    renderSetupError(
        'No se pudo conectar con MySQL',
        'El catalogo esta bien armado, pero PHP no pudo abrir la base de datos. Revisa estos puntos y vuelve a cargar la pagina.',
        [
            'Enciende Apache y MySQL desde XAMPP, WAMP o Laragon.',
            'Importa <code>database.sql</code> en phpMyAdmin.',
            'Copia <code>config.example.php</code> como <code>config.php</code> y ajusta tus datos.',
            'Abre el proyecto desde <code>http://localhost/catalogo_perfumes/</code>, no como archivo directo.',
        ]
    );
}
