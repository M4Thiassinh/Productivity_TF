-- ============================================================
--  MIGRACIÓN HISTÓRICA: kitchen_db → kitchen_db2
--  Sistema de Gestión de Cocina – Modelo Relacional Dinámico
--
--  REQUISITO: Ejecutar database2.sql ANTES que este script.
--
--  MAPEO DE DESTINOS:
--    cant_sala    → destino_id = 1 (Sala)
--    cant_tienda  → destino_id = 2 (Tienda)
--    cant_marley  → destino_id = 3 (Marley)
--
--  NOTA: La tabla produccion_real original no tiene desglose
--  por destino, por lo que se asigna toda la cantidad_real
--  al destino "Sala" como registro de compatibilidad.
-- ============================================================

USE kitchen_db2;

-- ─────────────────────────────────────────────────────────────
-- PASO 1: Copiar productos
--   kitchen_db.productos NO tiene columna 'envase'.
--   Los envases reales se cargan desde seed_v2.sql.
--   Este paso copia PLU y nombre de los productos que aún
--   no existan en kitchen_db2 (INSERT IGNORE).
-- ─────────────────────────────────────────────────────────────
-- Si kitchen_db.productos TIENE columna 'envase', usa esto:
-- INSERT IGNORE INTO kitchen_db2.productos (plu, nombre, cuarto, envase)
-- SELECT plu_id, nombre, tipo_cuarto, envase
-- FROM kitchen_db.productos;

-- kitchen_db.productos NO tiene 'envase' → usar esta query:
INSERT IGNORE INTO kitchen_db2.productos (plu, nombre, cuarto)
SELECT plu_id, nombre, tipo_cuarto
FROM kitchen_db.productos;


-- ─────────────────────────────────────────────────────────────
-- PASO 2: Copiar cocineros
-- ─────────────────────────────────────────────────────────────
INSERT IGNORE INTO kitchen_db2.cocineros (nombre)
SELECT nombre FROM kitchen_db.cocineros;


-- ─────────────────────────────────────────────────────────────
-- PASO 3: Copiar cabeceras de planificacion_diaria
--   Solo copia filas donde cantidad_planificada > 0
-- ─────────────────────────────────────────────────────────────
INSERT IGNORE INTO kitchen_db2.planificacion_diaria (fecha, producto_id)
SELECT
  pd.fecha,
  p2.id
FROM kitchen_db.planificacion_diaria pd
JOIN kitchen_db2.productos p2 ON p2.plu = pd.plu_id
WHERE pd.cantidad_planificada > 0;


-- ─────────────────────────────────────────────────────────────
-- PASO 4: Copiar planificacion_destinos
--   Cada columna original se convierte en una fila de destino
-- ─────────────────────────────────────────────────────────────

-- Sala (destino_id = 1)
INSERT IGNORE INTO kitchen_db2.planificacion_destinos (planificacion_id, destino_id, cantidad)
SELECT
  pd2.id,
  1,
  pd1.cant_sala
FROM kitchen_db.planificacion_diaria pd1
JOIN kitchen_db2.productos p2
  ON p2.plu = pd1.plu_id
JOIN kitchen_db2.planificacion_diaria pd2
  ON pd2.fecha = pd1.fecha AND pd2.producto_id = p2.id
WHERE pd1.cant_sala > 0;

-- Tienda (destino_id = 2)
INSERT IGNORE INTO kitchen_db2.planificacion_destinos (planificacion_id, destino_id, cantidad)
SELECT
  pd2.id,
  2,
  pd1.cant_tienda
FROM kitchen_db.planificacion_diaria pd1
JOIN kitchen_db2.productos p2
  ON p2.plu = pd1.plu_id
JOIN kitchen_db2.planificacion_diaria pd2
  ON pd2.fecha = pd1.fecha AND pd2.producto_id = p2.id
WHERE pd1.cant_tienda > 0;

-- Marley (destino_id = 3)
INSERT IGNORE INTO kitchen_db2.planificacion_destinos (planificacion_id, destino_id, cantidad)
SELECT
  pd2.id,
  3,
  pd1.cant_marley
FROM kitchen_db.planificacion_diaria pd1
JOIN kitchen_db2.productos p2
  ON p2.plu = pd1.plu_id
JOIN kitchen_db2.planificacion_diaria pd2
  ON pd2.fecha = pd1.fecha AND pd2.producto_id = p2.id
WHERE pd1.cant_marley > 0;


-- ─────────────────────────────────────────────────────────────
-- PASO 5: Copiar produccion_real
--   fecha DATETIME → DATE via CAST para corregir bug de timezone
-- ─────────────────────────────────────────────────────────────
INSERT IGNORE INTO kitchen_db2.produccion_real
  (fecha, producto_id, cantidad_real, no_producido, comentarios,
   cocinero_id, hora_inicio, hora_fin)
SELECT
  CAST(pr1.fecha AS DATE),
  p2.id,
  pr1.cantidad_real,
  pr1.no_producido,
  pr1.comentarios,
  c2.id,
  pr1.hora_inicio,
  pr1.hora_fin
FROM kitchen_db.produccion_real pr1
JOIN kitchen_db2.productos p2 ON p2.plu = pr1.plu_id
LEFT JOIN kitchen_db.cocineros c1 ON c1.id = pr1.cocinero_id
LEFT JOIN kitchen_db2.cocineros c2 ON c2.nombre = c1.nombre;


-- ─────────────────────────────────────────────────────────────
-- PASO 6: Generar produccion_destinos (registro de compatibilidad)
--   La BD original no tenia desglose; se toma la cantidad_real
--   total y se asigna a "Sala" (id=1) como compatibilidad.
-- ─────────────────────────────────────────────────────────────
INSERT IGNORE INTO kitchen_db2.produccion_destinos (produccion_id, destino_id, cantidad)
SELECT
  pr2.id,
  1,
  pr2.cantidad_real
FROM kitchen_db2.produccion_real pr2
WHERE pr2.cantidad_real > 0;


-- ─────────────────────────────────────────────────────────────
-- VERIFICACION: Ejecuta estas queries para comprobar resultado
-- ─────────────────────────────────────────────────────────────
-- SELECT 'productos'       AS tabla, COUNT(*) AS total FROM kitchen_db2.productos
-- UNION ALL
-- SELECT 'destinos'        AS tabla, COUNT(*) AS total FROM kitchen_db2.destinos
-- UNION ALL
-- SELECT 'planificacion'   AS tabla, COUNT(*) AS total FROM kitchen_db2.planificacion_diaria
-- UNION ALL
-- SELECT 'plan_destinos'   AS tabla, COUNT(*) AS total FROM kitchen_db2.planificacion_destinos
-- UNION ALL
-- SELECT 'produccion_real' AS tabla, COUNT(*) AS total FROM kitchen_db2.produccion_real
-- UNION ALL
-- SELECT 'prod_destinos'   AS tabla, COUNT(*) AS total FROM kitchen_db2.produccion_destinos;