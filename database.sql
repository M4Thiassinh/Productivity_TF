-- ============================================================
--  KITCHEN MANAGER – Script de creacion de base de datos
--  Motor: MySQL 8.x / MariaDB 10.x
--  Codificacion: UTF-8
-- ============================================================

CREATE DATABASE IF NOT EXISTS kitchen_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE kitchen_db;

-- ─────────────────────────────────────────────────────────────
-- TABLA 1: productos
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS productos (
  plu_id      VARCHAR(20)               NOT NULL,
  nombre      VARCHAR(150)              NOT NULL,
  tipo_cuarto ENUM('Frío','Caliente')   NOT NULL,
  PRIMARY KEY (plu_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ─────────────────────────────────────────────────────────────
-- TABLA 2: planificacion_diaria
--   cant_sala    → Unidades planificadas para el salon
--   cant_tienda  → Unidades planificadas para tienda/take-away
--   cant_marley  → Unidades planificadas para Marley
--   cantidad_planificada → Suma automatica (cant_sala + cant_tienda + cant_marley)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS planificacion_diaria (
  id                   INT           NOT NULL AUTO_INCREMENT,
  fecha                DATE          NOT NULL,
  plu_id               VARCHAR(20)   NOT NULL,
  cant_sala            INT           NOT NULL DEFAULT 0,
  cant_tienda          INT           NOT NULL DEFAULT 0,
  cant_marley          INT           NOT NULL DEFAULT 0,
  cantidad_planificada INT           NOT NULL DEFAULT 0,
  creado_en            TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_plan_fecha_plu (fecha, plu_id),
  CONSTRAINT fk_plan_producto
    FOREIGN KEY (plu_id) REFERENCES productos (plu_id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ─────────────────────────────────────────────────────────────
-- TABLA 3: cocineros
--   Catálogo de cocineros del restaurante.
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cocineros (
  id     INT          NOT NULL AUTO_INCREMENT,
  nombre VARCHAR(100) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_cocinero_nombre (nombre)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO cocineros (nombre) VALUES
  ('Carlos'),
  ('Luis'),
  ('Javier'),
  ('Diego'),
  ('Andrés'),
  ('Miguel'),
  ('Felipe'),
  ('Sebastián');


-- ─────────────────────────────────────────────────────────────
-- TABLA 4: produccion_real
--   Registra lo que los cocineros produjeron:
--   cantidad_real, mermas, comentarios y referencia al cocinero.
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS produccion_real (
  id            INT           NOT NULL AUTO_INCREMENT,
  fecha         DATE          NOT NULL,
  plu_id        VARCHAR(20)   NOT NULL,
  cantidad_real INT           NOT NULL DEFAULT 0,
  mermas        INT           NOT NULL DEFAULT 0,
  comentarios   TEXT          NULL,
  cocinero_id   INT           NULL DEFAULT NULL,
  registrado_en TIMESTAMP     DEFAULT CURRENT_TIMESTAMP
                              ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_prod_fecha_plu (fecha, plu_id),
  CONSTRAINT fk_prod_producto
    FOREIGN KEY (plu_id) REFERENCES productos (plu_id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_prod_cocinero
    FOREIGN KEY (cocinero_id) REFERENCES cocineros (id)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;



-- ─────────────────────────────────────────────────────────────
-- PRODUCTOS REALES DEL RESTAURANTE
-- ─────────────────────────────────────────────────────────────
INSERT IGNORE INTO productos (plu_id, nombre, tipo_cuarto) VALUES
  -- ── CUARTO FRIO ──────────────────────────────────────────
  ('6993',  'ENSALADA DE POLLO',                      'Frío'),
  ('1010',  'ENSALADA CESAR POLLO',                   'Frío'),
  ('6957',  'ENSALADA SERRANO',                       'Frío'),
  ('6959',  'ENSALADA DEL MAR',                       'Frío'),
  ('30396', 'CEVICHE SALMON',                         'Frío'),
  ('30417', 'CEVICHE COCHAYUYO',                      'Frío'),
  ('180',   'PIZZA SALAME PEPERONNI',                 'Frío'),
  ('254',   'PIZZA POLLO BBQ',                        'Frío'),
  ('6945',  'PIZZA CUATRO QUESOS',                    'Frío'),
  ('6944',  'PIZZA HAWAIANA',                         'Frío'),
  ('182',   'PIZZA VEGETARIANA',                      'Frío'),
  ('13490', 'PIZZA CAMARON QUESO',                    'Frío'),
  ('6968',  'PIZZA INDIVIDUAL POLLO BBQ',             'Frío'),
  ('30429', 'PIZZA INDIVIDUAL SALAME PEPERONNI',      'Frío'),
  ('6955',  'PIZZA INDIVIDUAL VEGETARIANA',           'Frío'),
  ('30369', 'PIZZA INDIVIDUAL HAWAIANA',              'Frío'),
  ('30710', 'WRAP FALAFEL Y HUMMUS',                  'Frío'),
  ('30450', 'WRAP SALUDABLE',                         'Frío'),
  ('30337', 'POKE ATUN',                              'Frío'),
  ('30384', 'POKE SALMON',                            'Frío'),
  ('30486', 'GOHAN ACEVICHADO',                       'Frío'),
  ('30428', 'GOHAN POLLO TERIYAKI',                   'Frío'),
  ('30488', 'GOHAN CAMARON',                          'Frío'),
  ('30434', 'GOHAM SALMON',                           'Frío'),
  ('30480', 'GOHAN CHAMPINON TERIYAKI',               'Frío'),
  ('6963',  'SEMOLA CON SALSA DE FRAMBUESA',          'Frío'),
  ('6964',  'SEMOLA CON SALSA DE VINO TINTO',         'Frío'),
  ('71236', 'TRILOGIA SEMOLA',                        'Frío'),
  ('30435', 'PANNA COTTA FRAMBUESA',                  'Frío'),
  ('30381', 'PANNA COTTA COCO MANGO',                 'Frío'),
  ('30419', 'SEMOLA CON SALSA MARACUYA',              'Frío'),
  ('30380', 'ARROZ CON LECHE',                        'Frío'),
  ('30422', 'HAMBURGUESA DOBLE CHEDDAR',              'Frío'),
  ('30394', 'SANDWICH PAN DE CERVEZA JAMON SERRANO',  'Frío'),
  ('30339', 'SANDWICH PAN DE CERVEZA PULLED PORK',    'Frío'),
  ('30438', 'SANDWICH PAN DE CERVEZA SALMON AHUMADO', 'Frío'),
  ('30690', 'VASO PINA',                              'Frío'),
  ('80813', 'VASO MELON',                             'Frío'),
  ('80816', 'VASO SANDIA',                            'Frío'),
  ('80808', 'VASO FRUTILLA',                          'Frío'),
  ('30707', 'VASO KIWI',                              'Frío'),
  ('30490', 'MIX DE FRUTA',                           'Frío'),
  ('30498', 'MOTE CON HUESILLO',                      'Frío'),
  ('30413', 'QUICHE DE SALMON',                       'Frío'),
  ('30451', 'QUICHE LORRAINE',                        'Frío'),
  ('30411', 'QUICHE DE POLLO CON CHOCLO',             'Frío'),
  -- ── CUARTO CALIENTE ──────────────────────────────────────
  ('30373', 'PASTEL DE CHOCLO',                                          'Caliente'),
  ('30449', 'PASTEL DE CHOCLO MEDIANO',                                  'Caliente'),
  ('30414', 'PASTEL DE CHOCLO HALOPACK',                                 'Caliente'),
  ('6996',  'PASTEL DE CHOCLO BN20',                                     'Caliente'),
  ('30427', 'PASTEL DE CHOCLO FAMILIAR',                                 'Caliente'),
  ('30431', 'PASTEL DE CHOCLO VEGETARIANO',                              'Caliente'),
  ('30340', 'LASANA BOLONESA',                                           'Caliente'),
  ('30412', 'LASANA BOLONESA HALOPACK',                                  'Caliente'),
  ('6946',  'LASANA BOLONESA BN20',                                      'Caliente'),
  ('1065',  'LASANA BOLONESA FAMILIAR',                                  'Caliente'),
  ('30703', 'LASANA VEGETARIANA',                                        'Caliente'),
  ('7902',  'LASANA VEGETARIANA BN20',                                   'Caliente'),
  ('6947',  'LASANA SALMON Y ESPINACA BN20',                             'Caliente'),
  ('30335', 'PASTEL DE PAPA',                                            'Caliente'),
  ('7898',  'PASTEL DE PAPA BN20',                                       'Caliente'),
  ('30389', 'PASTEL DE PAPA FAMILIAR',                                   'Caliente'),
  ('30342', 'NOQUIS CON SALSA BOLONESA',                                 'Caliente'),
  ('9979',  'NOQUIS CON SALSA BOLONESA FAMILIAR',                        'Caliente'),
  ('30406', 'RAVIOLES CON SALSA BOLONESA',                               'Caliente'),
  ('30440', 'FIDEOS THAI CON POLLO',                                     'Caliente'),
  ('30405', 'FIDEOS THAI CON CAMARONES',                                 'Caliente'),
  ('30403', 'SPAGUETTI ALFREDO',                                         'Caliente'),
  ('30407', 'SPAGUETTI ALFREDO CON POLLO',                               'Caliente'),
  ('30464', 'QUESO DE PATA',                                             'Caliente'),
  ('30514', 'GUATITAS A LA JARDINERA CON ARROZ HALOPACK',                'Caliente'),
  ('30492', 'LENGUA NOGADA CON PURE DE PAPAS HALOPACK',                  'Caliente'),
  ('30385', 'RINONES AL JEREZ CON ARROZ HALOPACK',                       'Caliente'),
  ('30705', 'SALMON CON RISOTTO DE CHAMPINONES HALOPACK',                'Caliente'),
  ('30708', 'SALMON CON RISOTTO AL PESTO HALOPACK',                      'Caliente'),
  ('7903',  'MERLUZA CANCATO CON QUINOA VERDE HALOPACK',                 'Caliente'),
  ('30395', 'CARNE MECHADA CON PASTELERA DE CHOCLO HALOPACK',            'Caliente'),
  ('30702', 'NOQUIS AL PESTO HALOPACK',                                  'Caliente'),
  ('30706', 'BUTTER CHICKEN CON ARROZ HALOPACK',                         'Caliente'),
  ('30372', 'POLLO CON SALSA DE CHAMPINONES Y PURE DE PAPAS HALOPACK',   'Caliente'),
  ('30371', 'POLLO CON SALSA 4 QUESOS Y PAPAS ASADAS HALOPACK',          'Caliente'),
  ('7040',  'POLLO CON SALSA 4 QUESOS Y PURE DE PAPAS HALOPACK',         'Caliente'),
  ('30704', 'AJI DE GALLINA CON ARROZ HALOPACK',                         'Caliente'),
  ('6974',  'ALBONDIGAS ATOMATADAS CON POLENTA CREMOSA HALOPACK',        'Caliente'),
  ('23017', 'POLLO ASADO',                                               'Caliente'),
  ('50087', 'POLLO ASADO CON PAPAS FRITAS',                              'Caliente'),
  ('6972',  'SANDWICH CROISSANT JAMON QUESO MARLEY',                     'Caliente'),
  ('6962',  'SANDWICH CROISSANT AVE MAYO PALTA MARLEY',                  'Caliente'),
  ('6970',  'SANDWICH BAGEL JAMON QUESO MARLEY',                         'Caliente'),
  ('6952',  'SANDWICH MIGA AVE PIMIENTO MARLEY',                         'Caliente'),
  ('326',   'SANDWICH BAGEL CHAMPINON PESTO ALBAHACA MARLEY',            'Caliente'),
  ('6965',  'SANDWICH BAGEL CARNE MECHADA QUESO MARLEY',                 'Caliente'),
  ('6995',  'SANDWICH PITA SALMON AHUMADO MARLEY',                       'Caliente'),
  ('6997',  'SANDWICH BAGEL POLLO GRILLADO QUESO CREMA MARLEY',          'Caliente'),
  ('322',   'SANDWICH BAGEL QUESO DE CABRA PESTO ALBAHACA MARLEY',       'Caliente'),
  ('6954',  'CHUPE DE LOCO',                                             'Caliente'),
  ('30404', 'CHUPE DE LOCO BN20',                                        'Caliente'),
  ('30362', 'CHUPE DE JAIBA',                                            'Caliente'),
  ('30504', 'CHUPE DE JAIBA BN20',                                       'Caliente');

-- ─────────────────────────────────────────────────────────────
-- MIGRACIONES (para bases de datos ya existentes)
-- ─────────────────────────────────────────────────────────────
