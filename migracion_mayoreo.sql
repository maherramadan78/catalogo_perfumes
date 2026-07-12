USE catalogo_perfumes;

ALTER TABLE perfumes
    ADD COLUMN IF NOT EXISTS precio_mayoreo DECIMAL(10,2) NOT NULL DEFAULT 0.00 AFTER precio,
    ADD COLUMN IF NOT EXISTS minimo_mayoreo INT UNSIGNED NOT NULL DEFAULT 6 AFTER precio_mayoreo,
    ADD COLUMN IF NOT EXISTS activo_mayoreo TINYINT(1) NOT NULL DEFAULT 1 AFTER activo;

UPDATE perfumes
SET precio_mayoreo = CASE
        WHEN precio_mayoreo IS NULL OR precio_mayoreo <= 0 THEN ROUND(precio * 0.86, 2)
        ELSE precio_mayoreo
    END,
    minimo_mayoreo = CASE
        WHEN minimo_mayoreo IS NULL OR minimo_mayoreo < 1 THEN 6
        ELSE minimo_mayoreo
    END,
    activo_mayoreo = CASE
        WHEN activo_mayoreo IS NULL THEN activo
        ELSE activo_mayoreo
    END;
