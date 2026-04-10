-- ============================================================
--  KITCHEN MANAGER v2 – Script de creación de base de datos
--  Motor: MySQL 8.x / MariaDB 10.x
--  Base de datos: kitchen_db2 (PARALELA, no altera kitchen_db)
--  Destinos iniciales: Sala (1), Tienda (2), Marley (3)
-- ============================================================

CREATE DATABASE IF NOT EXISTS kitchen_db2
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE kitchen_db2;

-- ─────────────────────────────────────────────────────────────
-- TABLA: cocineros
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cocineros (
  id     INT          NOT NULL AUTO_INCREMENT,
  nombre VARCHAR(100) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_cocinero_nombre (nombre)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO cocineros (nombre) VALUES
  -- Equipo real de trabajo (extraído de Envases.xlsx)
  ('Carolina Naranjo'),
  ('María Angelica Pinuer'),
  ('Silbia Bahamonde'),
  ('Jessica Alvarez'),
  ('Ricardo Flores'),
  ('Matias Perez'),
  ('Nazarena Sarabia'),
  ('Veronica Valdebenito'),
  ('Jean Paul Game');


-- ─────────────────────────────────────────────────────────────
-- TABLA: productos
--   Agrega columna 'envase' que no existía en la BD original.
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS productos (
  id      INT                       NOT NULL AUTO_INCREMENT,
  plu     VARCHAR(20)               NOT NULL,
  nombre  VARCHAR(150)              NOT NULL,
  cuarto  ENUM('Frío','Caliente')   NOT NULL,
  envase  VARCHAR(100)              NULL DEFAULT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_plu (plu)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ─────────────────────────────────────────────────────────────
-- TABLA: destinos
--   Centros de distribución (Sala, Tienda, Marley, etc.).
--   'activo = 0' permite desactivar sin borrar histórico.
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS destinos (
  id     INT          NOT NULL AUTO_INCREMENT,
  nombre VARCHAR(100) NOT NULL,
  activo TINYINT(1)   NOT NULL DEFAULT 1,
  PRIMARY KEY (id),
  UNIQUE KEY uq_destino_nombre (nombre)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Destinos iniciales (mapean 1:1 con las columnas antiguas)
INSERT IGNORE INTO destinos (nombre) VALUES
  ('Sala'),    -- id = 1  (era cant_sala)
  ('Tienda'),  -- id = 2  (era cant_tienda)
  ('Marley');  -- id = 3  (era cant_marley)


-- ─────────────────────────────────────────────────────────────
-- TABLA: planificacion_diaria  (cabecera)
--   Una fila por producto+fecha planificado.
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS planificacion_diaria (
  id          INT       NOT NULL AUTO_INCREMENT,
  fecha       DATE      NOT NULL,
  producto_id INT       NOT NULL,
  creado_en   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_plan_fecha_producto (fecha, producto_id),
  CONSTRAINT fk_plan_producto
    FOREIGN KEY (producto_id) REFERENCES productos (id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ─────────────────────────────────────────────────────────────
-- TABLA: planificacion_destinos  (detalle por destino)
--   Cuánto se planifica producir para cada centro de distribución.
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS planificacion_destinos (
  id               INT NOT NULL AUTO_INCREMENT,
  planificacion_id INT NOT NULL,
  destino_id       INT NOT NULL,
  cantidad         INT NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  UNIQUE KEY uq_plan_dest (planificacion_id, destino_id),
  CONSTRAINT fk_pland_plan
    FOREIGN KEY (planificacion_id) REFERENCES planificacion_diaria (id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_pland_dest
    FOREIGN KEY (destino_id) REFERENCES destinos (id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ─────────────────────────────────────────────────────────────
-- TABLA: produccion_real  (cabecera de producción)
--   Limpia: sin columnas de destinos.
--   fecha es DATE (corrige el bug de DATETIME de la BD original).
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS produccion_real (
  id            INT           NOT NULL AUTO_INCREMENT,
  fecha         DATE          NOT NULL,
  producto_id   INT           NOT NULL,
  cantidad_real INT           NOT NULL DEFAULT 0,
  no_producido  INT           NOT NULL DEFAULT 0,
  comentarios   TEXT          NULL,
  cocinero_id   INT           NULL DEFAULT NULL,
  hora_inicio   TIME          NULL,
  hora_fin      TIME          NULL,
  registrado_en TIMESTAMP     DEFAULT CURRENT_TIMESTAMP
                              ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_prod_fecha_producto (fecha, producto_id),
  CONSTRAINT fk_prod_producto
    FOREIGN KEY (producto_id) REFERENCES productos (id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_prod_cocinero
    FOREIGN KEY (cocinero_id) REFERENCES cocineros (id)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ─────────────────────────────────────────────────────────────
-- TABLA: produccion_destinos  (detalle de producción por destino)
--   Cuánto se produjo y envió a cada centro de distribución.
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS produccion_destinos (
  id            INT NOT NULL AUTO_INCREMENT,
  produccion_id INT NOT NULL,
  destino_id    INT NOT NULL,
  cantidad      INT NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  UNIQUE KEY uq_prodd_prod_dest (produccion_id, destino_id),
  CONSTRAINT fk_prodd_prod
    FOREIGN KEY (produccion_id) REFERENCES produccion_real (id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_prodd_dest
    FOREIGN KEY (destino_id) REFERENCES destinos (id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
--  FIN: kitchen_db2 lista para usar
--  Ejecutar migracion_v2.sql para copiar datos históricos
-- ============================================================
