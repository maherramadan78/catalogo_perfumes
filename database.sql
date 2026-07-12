CREATE DATABASE IF NOT EXISTS catalogo_perfumes
CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;

USE catalogo_perfumes;

CREATE TABLE IF NOT EXISTS perfumes (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(150) NOT NULL,
    marca VARCHAR(100) NOT NULL,
    descripcion VARCHAR(500) NOT NULL DEFAULT '',
    categoria VARCHAR(80) NOT NULL DEFAULT 'Unisex',
    precio DECIMAL(10,2) NOT NULL,
    precio_mayoreo DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    minimo_mayoreo INT UNSIGNED NOT NULL DEFAULT 6,
    foto VARCHAR(255) NOT NULL DEFAULT '',
    stock INT UNSIGNED NOT NULL DEFAULT 0,
    destacado TINYINT(1) NOT NULL DEFAULT 0,
    activo TINYINT(1) NOT NULL DEFAULT 1,
    activo_mayoreo TINYINT(1) NOT NULL DEFAULT 1,
    fecha_creacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

INSERT INTO perfumes
(nombre, marca, descripcion, categoria, precio, precio_mayoreo, minimo_mayoreo, foto, stock, destacado, activo, activo_mayoreo)
VALUES
('Asad', 'Lattafa', 'Fragancia intensa, especiada y elegante.', 'Hombre', 650.00, 560.00, 6, '', 12, 1, 1, 1),
('9 PM', 'Afnan', 'Aroma dulce y nocturno, ideal para ocasiones especiales.', 'Hombre', 850.00, 730.00, 6, '', 8, 1, 1, 1),
('Yara', 'Lattafa', 'Fragancia femenina, cremosa y dulce.', 'Mujer', 720.00, 620.00, 6, '', 15, 0, 1, 1),
('Club de Nuit Intense', 'Armaf', 'Fragancia fresca, citrica y amaderada.', 'Hombre', 980.00, 850.00, 6, '', 5, 0, 1, 1);
