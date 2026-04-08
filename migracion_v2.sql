-- ============================================================
--  KITCHEN MANAGER v2.0 - Migraciones
--  Ejecutar este script para agregar las nuevas columnas
-- ============================================================

USE kitchen_db;

-- ────────────────────────────────────────────────────────────
-- 1. Agregar columna 'envase' a la tabla productos
-- ────────────────────────────────────────────────────────────
ALTER TABLE productos
ADD COLUMN envase VARCHAR(50) NULL AFTER tipo_cuarto;

-- Ejemplo de actualización para algunos productos:
-- UPDATE productos SET envase = 'halopak' WHERE plu_id = '30414';
-- UPDATE productos SET envase = 'bn20' WHERE plu_id = '6996';
-- UPDATE productos SET envase = 'c10' WHERE plu_id = '...';
-- UPDATE productos SET envase = 'Kraft 26 onzas' WHERE plu_id = '...';

-- ────────────────────────────────────────────────────────────
-- 2. Agregar columnas de tiempo a produccion_real
-- ────────────────────────────────────────────────────────────
ALTER TABLE produccion_real
ADD COLUMN hora_inicio DATETIME NULL AFTER cocinero_id,
ADD COLUMN hora_fin DATETIME NULL AFTER hora_inicio;

-- Nota: La columna 'comentarios' ya existe en tu esquema actual
-- Si por alguna razón NO existe, descomenta la siguiente línea:
-- ALTER TABLE produccion_real ADD COLUMN comentarios TEXT NULL AFTER hora_fin;

-- ────────────────────────────────────────────────────────────
-- 2.1 Eliminar columna antigua registrado_en (si existe)
-- ────────────────────────────────────────────────────────────
-- Ahora nos guiamos exclusivamente por hora_inicio y hora_fin
ALTER TABLE produccion_real DROP COLUMN IF EXISTS registrado_en;
ALTER TABLE produccion_real DROP COLUMN IF EXISTS fecha_registro;

-- ────────────────────────────────────────────────────────────
-- 3. Verificar cambios
-- ────────────────────────────────────────────────────────────
DESCRIBE productos;
DESCRIBE produccion_real;

-- ────────────────────────────────────────────────────────────
-- OPCIONAL: Actualizar envases de productos existentes
-- ────────────────────────────────────────────────────────────
-- Ejemplos (personaliza según tus necesidades):
UPDATE productos SET envase = 'halopak' WHERE plu_id IN ('30414', '30412', '30514', '30492', '30385', '30705', '30708', '7903', '30395', '30702', '30706', '30372', '30371', '7040', '30704', '6974');
UPDATE productos SET envase = 'bn20' WHERE plu_id IN ('6996', '6946', '7902', '6947', '7898', '30404', '30504');
UPDATE productos SET envase = 'individual' WHERE plu_id IN ('6968', '30429', '6955', '30369');
UPDATE productos SET envase = 'familiar' WHERE plu_id IN ('30427', '1065', '30389', '9979');


-- Cambiar hora_inicio de DATETIME/TIMESTAMP a TIME
ALTER TABLE produccion_real 
MODIFY COLUMN hora_inicio TIME NULL;
-- Cambiar hora_fin de DATETIME/TIMESTAMP a TIME
ALTER TABLE produccion_real 
MODIFY COLUMN hora_fin TIME NULL;