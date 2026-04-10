-- ============================================================
--  SEED: kitchen_db2 – Productos reales + Cocineros reales
--  Fuente: Envases.xlsx  (79 productos con PLU, nombre, envase)
--  Cuartos asignados según database.sql original (kitchen_db)
--
--  IMPORTANTE: Ejecutar DESPUÉS de database2.sql
--  USE kitchen_db2;
-- ============================================================

USE kitchen_db2;

-- ─────────────────────────────────────────────────────────────
-- PASO 1: Cocineros reales (extraídos de columna "Equipo de trabajo")
-- ─────────────────────────────────────────────────────────────
INSERT IGNORE INTO cocineros (nombre) VALUES
  ('Carolina Naranjo'),
  ('María Angelica Pinuer'),
  ('Silbia Bahamonde'),
  ('Jessica Alvarez'),
  ('Ricardo Flores'),
  ('Matias Perez'),
  ('Nazarena Sarabia'),
  ('Veronica Valdebenito'),
  ('Jean Paul Game');
  -- Cocineros genéricos del sistema original (en caso de que ya existan en produccion_real)


-- ─────────────────────────────────────────────────────────────
-- PASO 2: Productos con envase (79 registros del Excel)
--   Cuarto asignado desde database.sql original (kitchen_db)
--
--  CUARTO FRÍO  → pizzas, gohan, poke, ensaladas, wraps,
--                 postres, ceviche, bebidas, sandwiches fríos
--  CUARTO CALIENTE → pastas, pasteles, platos calientes,
--                    sandwiches calientes (marley/bagel)
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

UPDATE productos
SET envase = CASE plu
    WHEN '30498' THEN 'PET 500 ML'
    WHEN '6946' THEN 'BN20'
    WHEN '30704' THEN 'HALOPACK'
    WHEN '6996' THEN 'BN20'
    WHEN '6947' THEN 'BN20'
    WHEN '7902' THEN 'BN20'
    WHEN '30371' THEN 'HALOPACK'
    WHEN '30486' THEN 'KRAFT 26OZ'
    WHEN '30488' THEN 'KRAFT 26OZ'
    WHEN '30480' THEN 'KRAFT 26OZ'
    WHEN '30428' THEN 'KRAFT 26OZ'
    WHEN '30434' THEN 'KRAFT 26OZ'
    WHEN '30340' THEN 'C10'
    WHEN '30395' THEN 'HALOPACK'
    WHEN '30372' THEN 'HALOPACK'
    WHEN '30399' THEN 'SNACK BAG F'
    WHEN '30394' THEN 'SNACK BAG F'
    WHEN '30438' THEN 'SNACK BAG F'
    WHEN '30422' THEN NULL
    WHEN '303940' THEN 'VASO 8 0Z'
    WHEN '6974' THEN 'HALOPACK'
    WHEN '30412' THEN 'HALOPACK'
    WHEN '30414' THEN 'HALOPACK'
    WHEN '30380' THEN 'PET 250 ML'
    WHEN '30381' THEN 'PET 210 ML'
    WHEN '30435' THEN 'PET 210 ML'
    WHEN '30419' THEN 'PET 210 ML'
    WHEN '6945' THEN 'BOLSA AL VACIO 35X40'
    WHEN '6944' THEN 'BOLSA AL VACIO 35X40'
    WHEN '180' THEN 'BOLSA AL VACIO 35X40'
    WHEN '13490' THEN 'BOLSA AL VACIO 35X40'
    WHEN '254' THEN 'BOLSA AL VACIO 35X40'
    WHEN '182' THEN 'BOLSA AL VACIO 35X41'
    WHEN '326' THEN NULL
    WHEN '322' THEN NULL
    WHEN '7903' THEN 'HALOPACK'
    WHEN '1010' THEN 'KRAFT 26OZ'
    WHEN '6968' THEN 'BOLSA AL VACIO 28X29'
    WHEN '30429' THEN 'BOLSA AL VACIO 28X29'
    WHEN '30369' THEN 'BOLSA AL VACIO 28X29'
    WHEN '6955' THEN 'BOLSA AL VACIO 28X29'
    WHEN '30373' THEN 'C10'
    WHEN '30405' THEN 'KRAFT 26OZ'
    WHEN '30440' THEN 'KRAFT 26OZ'
    WHEN '1065' THEN 'C40'
    WHEN '30385' THEN 'HALOPACK'
    WHEN '30706' THEN 'HALOPACK'
    WHEN '30705' THEN 'HALOPACK'
    WHEN '30708' THEN 'HALOPACK'
    WHEN '7040' THEN 'HALOPACK'
    WHEN '30514' THEN 'HALOPACK'
    WHEN '30492' THEN 'HALOPACK'
    WHEN '30464' THEN 'C10'
    WHEN '6954' THEN 'C10'
    WHEN '30362' THEN 'C10'
    WHEN '30504' THEN 'BN20'
    WHEN '30404' THEN 'BN20'
    WHEN '30427' THEN 'C40'
    WHEN '30449' THEN 'C20'
    WHEN '30335' THEN 'C20'
    WHEN '7898' THEN 'BN20'
    WHEN '30431' THEN 'C20'
    WHEN '30702' THEN 'HALOPACK'
    WHEN '30342' THEN 'C20'
    WHEN '9979' THEN 'C40'
    WHEN '30403' THEN 'KRAFT 26OZ'
    WHEN '30407' THEN 'KRAFT 26OZ'
    WHEN '30406' THEN 'C20'
    WHEN '30703' THEN 'C20'
    WHEN '30389' THEN 'C40'
    WHEN '30337' THEN 'KRAFT 26OZ'
    WHEN '30384' THEN 'KRAFT 26OZ'
    WHEN '30450' THEN 'BANDEJA PET 23,8 X 18,1'
    WHEN '30710' THEN 'BANDEJA PET 23,8 X 18,1'
    WHEN '6957' THEN 'KRAFT 40OZ'
    WHEN '6993' THEN 'KRAFT 40OZ'
    WHEN '6959' THEN 'KRAFT 40OZ'
    WHEN '30396' THEN 'VASO 16OZ'
    WHEN '30417' THEN 'VASO 16OZ'
    ELSE envase 
END
WHERE plu IN (
    '30498', '6946', '30704', '6996', '6947', '7902', '30371', '30486', '30488', '30480', '30428', 
    '30434', '30340', '30395', '30372', '30399', '30394', '30438', '30422', '303940', '6974', 
    '30412', '30414', '30380', '30381', '30435', '30419', '6945', '6944', '180', '13490', '254', 
    '182', '326', '322', '7903', '1010', '6968', '30429', '30369', '6955', '30373', '30405', 
    '30440', '1065', '30385', '30706', '30705', '30708', '7040', '30514', '30492', '30464', 
    '6954', '30362', '30504', '30404', '30427', '30449', '30335', '7898', '30431', '30702', 
    '30342', '9979', '30403', '30407', '30406', '30703', '30389', '30337', '30384', '30450', 
    '30710', '6957', '6993', '6959', '30396', '30417'
);