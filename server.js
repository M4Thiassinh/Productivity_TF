// ============================================================
//  KITCHEN MANAGER – Backend  (Node.js + Express + MySQL2)
//  Archivo único: server.js
//  Sirve la API REST y los archivos estáticos del frontend.
// ============================================================

require('dotenv').config();

const express = require('express');
const mysql   = require('mysql2/promise');
const path    = require('path');
const ExcelJS = require('exceljs');
const dayjs   = require('dayjs');
const utc     = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');

// Configurar dayjs con plugins de timezone
dayjs.extend(utc);
dayjs.extend(timezone);

const app = express();
app.use(express.json());

// ── Sirve todo lo que esté en /public como archivos estáticos ──
app.use(express.static(path.join(__dirname, 'public')));

// ══════════════════════════════════════════════════════════════
//  POOL DE CONEXIONES  (reutiliza conexiones, más eficiente)
// ══════════════════════════════════════════════════════════════
const pool = mysql.createPool({
  host            : process.env.DB_HOST     || 'localhost',
  port            : Number(process.env.DB_PORT) || 3306,
  user            : process.env.DB_USER     || 'root',
  password        : process.env.DB_PASSWORD || '',
  database        : process.env.DB_NAME     || 'kitchen_db',
  waitForConnections: true,
  connectionLimit : 10,
  timezone        : '-03:00', // Chile/Santiago (UTC-3, DST UTC-4 depende de la época)
});

// ── Helper de errores ──────────────────────────────────────────
const err500 = (res, e) => {
  console.error('❌ BD Error:', e.message);
  res.status(500).json({ error: e.message });
};

// ══════════════════════════════════════════════════════════════
//  PRODUCTOS
// ══════════════════════════════════════════════════════════════

// GET  /api/productos  → Lista todos los productos
app.get('/api/productos', async (req, res) => {
  try {
    const [rows] = await pool.execute(
      'SELECT * FROM productos ORDER BY tipo_cuarto, nombre'
    );
    res.json(rows);
  } catch (e) { err500(res, e); }
});

// POST /api/productos  → Crea un producto nuevo
app.post('/api/productos', async (req, res) => {
  const { plu_id, nombre, tipo_cuarto } = req.body;
  if (!plu_id || !nombre || !tipo_cuarto)
    return res.status(400).json({ error: 'plu_id, nombre y tipo_cuarto son requeridos.' });
  try {
    await pool.execute(
      'INSERT INTO productos (plu_id, nombre, tipo_cuarto) VALUES (?, ?, ?)',
      [plu_id.trim(), nombre.trim(), tipo_cuarto]
    );
    res.status(201).json({ success: true });
  } catch (e) { err500(res, e); }
});

// ══════════════════════════════════════════════════════════════
//  COCINEROS
// ══════════════════════════════════════════════════════════════

// GET /api/cocineros  → Lista el catálogo de cocineros
app.get('/api/cocineros', async (req, res) => {
  try {
    const [rows] = await pool.execute(
      'SELECT id, nombre FROM cocineros ORDER BY nombre'
    );
    res.json(rows);
  } catch (e) { err500(res, e); }
});

// ══════════════════════════════════════════════════════════════
//  PLANIFICACIÓN DIARIA
// ══════════════════════════════════════════════════════════════

// GET  /api/planificacion?fecha=YYYY-MM-DD
//      Devuelve todos los registros de planificación para esa fecha.
//      Si no se pasa fecha, usa el día de hoy.
app.get('/api/planificacion', async (req, res) => {
  const fecha = req.query.fecha || new Date().toISOString().slice(0, 10);
  try {
    const [rows] = await pool.execute(
      `SELECT pd.id, p.plu_id, p.nombre, p.tipo_cuarto,
              pd.cant_sala, pd.cant_tienda, pd.cant_marley, pd.cantidad_planificada, pd.fecha
         FROM planificacion_diaria pd
         JOIN productos p ON pd.plu_id = p.plu_id
        WHERE pd.fecha = ?
        ORDER BY p.tipo_cuarto DESC, p.nombre`,
      [fecha]
    );
    res.json(rows);
  } catch (e) { err500(res, e); }
});

// GET  /api/planificacion/kds?fecha=YYYY-MM-DD[&tipo=Frío|Caliente]
//      Endpoint mejorado para KDS v2.0: incluye división de cantidades,
//      envase, total planificado y total producido actual.
app.get('/api/planificacion/kds', async (req, res) => {
  const fecha = req.query.fecha || new Date().toISOString().slice(0, 10);
  const tipo  = req.query.tipo  || null; // 'Frío' | 'Caliente' | null
  try {
    let sql = `
      SELECT
        p.plu_id,
        p.nombre,
        p.tipo_cuarto,
        p.envase,
        pd.cant_sala,
        pd.cant_tienda,
        pd.cant_marley,
        pd.cantidad_planificada AS total_planificado,
        COALESCE(pr.cantidad_real, 0) AS total_producido,
        COALESCE(pr.hora_inicio, NULL) AS hora_inicio,
        COALESCE(pr.hora_fin, NULL) AS hora_fin,
        pr.id AS registro_id
      FROM planificacion_diaria pd
      JOIN productos p ON pd.plu_id = p.plu_id
      LEFT JOIN produccion_real pr
        ON pr.plu_id = pd.plu_id AND pr.fecha = pd.fecha
      WHERE pd.fecha = ?
        AND pd.cantidad_planificada > 0`;

    const params = [fecha];
    if (tipo) {
      sql += ` AND p.tipo_cuarto = ?`;
      params.push(tipo);
    }
    sql += ` ORDER BY p.nombre`;

    const [rows] = await pool.execute(sql, params);
    res.json(rows);
  } catch (e) { err500(res, e); }
});

// POST /api/planificacion/batch
//      Carga masiva: recibe { fecha, items: [{plu_id, cant_sala, cant_tienda}] }
//      cantidad_planificada se calcula automáticamente como cant_sala + cant_tienda.
//      Solo procesa ítems donde cant_sala + cant_tienda > 0.
app.post('/api/planificacion/batch', async (req, res) => {
  const { fecha, items } = req.body;
  if (!fecha || !Array.isArray(items) || items.length === 0)
    return res.status(400).json({ error: 'fecha e items[] son requeridos.' });

  const validos = items
    .map(i => ({
      plu_id      : i.plu_id,
      cant_sala   : Number(i.cant_sala)    || 0,
      cant_tienda : Number(i.cant_tienda)  || 0,
      cant_marley : Number(i.cant_marley)  || 0,
    }))
    .filter(i => (i.cant_sala + i.cant_tienda + i.cant_marley) > 0);

  if (validos.length === 0)
    return res.json({ success: true, guardados: 0, mensaje: 'Ningún ítem con cantidad > 0.' });

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    for (const item of validos) {
      const total = item.cant_sala + item.cant_tienda + item.cant_marley;
      await conn.execute(
        `INSERT INTO planificacion_diaria
              (fecha, plu_id, cant_sala, cant_tienda, cant_marley, cantidad_planificada)
            VALUES (?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
              cant_sala            = VALUES(cant_sala),
              cant_tienda          = VALUES(cant_tienda),
              cant_marley          = VALUES(cant_marley),
              cantidad_planificada = VALUES(cantidad_planificada)`,
        [fecha, item.plu_id, item.cant_sala, item.cant_tienda, item.cant_marley, total]
      );
    }
    await conn.commit();
    res.json({ success: true, guardados: validos.length });
  } catch (e) {
    await conn.rollback();
    err500(res, e);
  } finally {
    conn.release();
  }
});

// POST /api/planificacion
//      Inserta o actualiza (upsert) la planificación de un producto en una fecha.
app.post('/api/planificacion', async (req, res) => {
  const { fecha, plu_id, cantidad_planificada } = req.body;
  if (!fecha || !plu_id || cantidad_planificada === undefined)
    return res.status(400).json({ error: 'fecha, plu_id y cantidad_planificada son requeridos.' });
  try {
    await pool.execute(
      `INSERT INTO planificacion_diaria (fecha, plu_id, cantidad_planificada)
            VALUES (?, ?, ?)
            ON DUPLICATE KEY UPDATE cantidad_planificada = VALUES(cantidad_planificada)`,
      [fecha, plu_id, Number(cantidad_planificada)]
    );
    res.json({ success: true });
  } catch (e) { err500(res, e); }
});

// ══════════════════════════════════════════════════════════════
//  PRODUCCIÓN REAL
// ══════════════════════════════════════════════════════════════

// GET  /api/produccion?fecha=YYYY-MM-DD
//      Devuelve los productos planificados del día con su producción
//      real (si ya fue registrada). LEFT JOIN → muestra 0 si aún no hay registro.
app.get('/api/produccion', async (req, res) => {
  const fecha = req.query.fecha || new Date().toISOString().slice(0, 10);
  try {
    const [rows] = await pool.execute(
      `SELECT p.plu_id, p.nombre, p.tipo_cuarto,
              pd.cant_sala, pd.cant_tienda, pd.cant_marley, pd.cantidad_planificada,
              pr.id AS registro_id,
              COALESCE(pr.cantidad_real, 0)  AS cantidad_real,
              COALESCE(pr.no_producido,  0)  AS no_producido,
              COALESCE(pr.comentarios,   '') AS comentarios,
              pr.cocinero_id,
              COALESCE(c.nombre,         '') AS cocinero_nombre
         FROM planificacion_diaria pd
         JOIN productos p ON pd.plu_id = p.plu_id
         LEFT JOIN produccion_real pr
           ON pr.plu_id = pd.plu_id AND pr.fecha = pd.fecha
         LEFT JOIN cocineros c ON c.id = pr.cocinero_id
        WHERE pd.fecha = ?
          AND pd.cantidad_planificada > 0
        ORDER BY p.tipo_cuarto DESC, p.nombre`,
      [fecha]
    );
    res.json(rows);
  } catch (e) { err500(res, e); }
});

// POST /api/produccion y /api/produccion_real
//      Inserta o actualiza el registro de producción real de un ítem.
//      No bloquea por sobrepasar lo planificado.
const guardarProduccion = async (req, res) => {
  const { fecha, plu_id, cantidad_real, no_producido, comentarios, cocinero_id } = req.body;
  if (!fecha || !plu_id)
    return res.status(400).json({ error: 'fecha y plu_id son requeridos.' });

  const real = Number(cantidad_real) || 0;
  const noProducido = Number(no_producido) || 0;

  try {
    await pool.execute(
      `INSERT INTO produccion_real
              (fecha, plu_id, cantidad_real, no_producido, comentarios, cocinero_id)
            VALUES (?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
              cantidad_real = VALUES(cantidad_real),
              no_producido  = VALUES(no_producido),
              comentarios   = VALUES(comentarios),
              cocinero_id   = VALUES(cocinero_id)`,
      [
        fecha,
        plu_id,
        real,
        noProducido,
        (comentarios || '').trim(),
        cocinero_id || null,
      ]
    );
    res.json({ success: true });
  } catch (e) { err500(res, e); }
};

app.post('/api/produccion', guardarProduccion);
app.post('/api/produccion_real', guardarProduccion);

// ══════════════════════════════════════════════════════════════
//  FLUJO DE 2 PASOS - v2.0
// ══════════════════════════════════════════════════════════════

// POST /api/produccion/iniciar
//      Registra el inicio de preparación de un producto.
//      Solo guarda la fecha, plu_id y hora_inicio.
app.post('/api/produccion/iniciar', async (req, res) => {
  const { fecha, plu_id } = req.body;

  if (!fecha || !plu_id)
    return res.status(400).json({ error: 'fecha y plu_id son requeridos.' });

  try {
    const ahora = new Date();

    // Verificar si ya existe un registro para este producto en esta fecha
    const [existing] = await pool.execute(
      'SELECT id, hora_inicio FROM produccion_real WHERE fecha = ? AND plu_id = ?',
      [fecha, plu_id]
    );

    if (existing.length > 0) {
      // Ya existe: actualizar solo si no tiene hora_inicio
      if (!existing[0].hora_inicio) {
        await pool.execute(
          'UPDATE produccion_real SET hora_inicio = ? WHERE fecha = ? AND plu_id = ?',
          [ahora, fecha, plu_id]
        );
        return res.json({ success: true, mensaje: 'Preparación iniciada.' });
      } else {
        return res.json({ success: true, mensaje: 'Ya estaba iniciado.' });
      }
    } else {
      // No existe: crear nuevo registro
      await pool.execute(
        `INSERT INTO produccion_real
          (fecha, plu_id, hora_inicio, cantidad_real, no_producido)
         VALUES (?, ?, ?, 0, 0)`,
        [fecha, plu_id, ahora]
      );
      return res.json({ success: true, mensaje: 'Preparación iniciada.' });
    }
  } catch (e) { err500(res, e); }
});

// PUT /api/produccion/finalizar
//     Finaliza la preparación registrando cantidad real, no producido,
//     cocinero y comentarios. Marca hora_fin.
app.put('/api/produccion/finalizar', async (req, res) => {
  const { fecha, plu_id, cantidad_real, no_producido, cocinero_id, comentarios } = req.body;

  if (!fecha || !plu_id)
    return res.status(400).json({ error: 'fecha y plu_id son requeridos.' });

  const real = Number(cantidad_real) || 0;
  const noProducido = Number(no_producido) || 0;
  const ahora = new Date();

  try {
    // Actualizar registro existente (debe existir porque se llamó /iniciar primero)
    await pool.execute(
      `UPDATE produccion_real
       SET cantidad_real = ?,
           no_producido = ?,
           cocinero_id = ?,
           comentarios = ?,
           hora_fin = ?
       WHERE fecha = ? AND plu_id = ?`,
      [real, noProducido, cocinero_id || null, (comentarios || '').trim(), ahora, fecha, plu_id]
    );

    res.json({ success: true, mensaje: 'Producción finalizada.' });
  } catch (e) { err500(res, e); }
});

// GET /api/resumen_diario?fecha=YYYY-MM-DD
//     Resumen consolidado para la pantalla de previsualización.
app.get('/api/resumen_diario', async (req, res) => {
  const fecha = req.query.fecha || new Date().toISOString().slice(0, 10);
  try {
    const [rows] = await pool.execute(
      `SELECT p.plu_id,
              p.nombre,
              COALESCE(SUM(pd.cant_sala), 0)            AS total_sala,
              COALESCE(SUM(pd.cant_tienda), 0)          AS total_tienda,
              COALESCE(SUM(pd.cant_marley), 0)          AS total_marley,
              COALESCE(SUM(pd.cantidad_planificada), 0) AS total_planeado,
              COALESCE(SUM(pr.cantidad_real), 0)        AS total_real,
              COALESCE(SUM(pr.no_producido), 0)         AS total_no_producido
         FROM planificacion_diaria pd
         JOIN productos p ON p.plu_id = pd.plu_id
         LEFT JOIN produccion_real pr
           ON pr.plu_id = pd.plu_id AND pr.fecha = pd.fecha
        WHERE pd.fecha = ?
        GROUP BY p.plu_id, p.nombre
        ORDER BY p.nombre`,
      [fecha]
    );
    res.json(rows);
  } catch (e) { err500(res, e); }
});

// ══════════════════════════════════════════════════════════════
//  INFORMES
// ══════════════════════════════════════════════════════════════

// GET /api/informes/excel?fecha_inicio=YYYY-MM-DD&fecha_fin=YYYY-MM-DD
//     Descarga un .xlsx con toda la producción y no producido del rango.
app.get('/api/informes/excel', async (req, res) => {
  const fecha_inicio = req.query.fecha_inicio || req.query.desde;
  const fecha_fin    = req.query.fecha_fin    || req.query.hasta;

  // Validación de formato para evitar valores inesperados
  const fechaRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!fecha_inicio || !fecha_fin || !fechaRegex.test(fecha_inicio) || !fechaRegex.test(fecha_fin))
    return res.status(400).json({ error: 'Parámetros fecha_inicio y fecha_fin requeridos (formato YYYY-MM-DD).' });
  if (fecha_inicio > fecha_fin)
    return res.status(400).json({ error: '"fecha_inicio" no puede ser posterior a "fecha_fin".' });

  try {
    const [rows] = await pool.execute(
      `SELECT pr.fecha,
              p.plu_id,
              p.nombre,
              p.tipo_cuarto,
              COALESCE(pd.cant_sala,             0)  AS cant_sala,
              COALESCE(pd.cant_tienda,           0)  AS cant_tienda,
              COALESCE(pd.cant_marley,           0)  AS cant_marley,
              COALESCE(pd.cantidad_planificada,  0)  AS cantidad_planificada,
              pr.cantidad_real,
              pr.no_producido,
              pr.hora_inicio,
              pr.hora_fin,
              COALESCE(c.nombre,                '')  AS cocinero,
              COALESCE(pr.comentarios,          '')  AS comentarios
         FROM produccion_real pr
         JOIN productos p ON pr.plu_id = p.plu_id
         LEFT JOIN planificacion_diaria pd
           ON pd.plu_id = pr.plu_id AND pd.fecha = pr.fecha
         LEFT JOIN cocineros c ON c.id = pr.cocinero_id
        WHERE pr.fecha BETWEEN ? AND ?
        ORDER BY pr.fecha ASC, p.tipo_cuarto DESC, p.nombre ASC`,
      [fecha_inicio, fecha_fin]
    );

    const workbook  = new ExcelJS.Workbook();
    workbook.creator = 'Kitchen Manager';
    const sheet = workbook.addWorksheet('Producción', {
      views: [{ state: 'frozen', ySplit: 1 }],
    });

    sheet.columns = [
      { header: 'Fecha',           key: 'fecha',                width: 14 },
      { header: 'PLU',             key: 'plu_id',               width: 10 },
      { header: 'Producto',        key: 'nombre',               width: 34 },
      { header: 'Cuarto',          key: 'tipo_cuarto',          width: 12 },
      { header: 'Plan Sala',       key: 'cant_sala',            width: 12 },
      { header: 'Plan Tienda',     key: 'cant_tienda',          width: 14 },
      { header: 'Plan Marley',     key: 'cant_marley',          width: 14 },
      { header: 'Planificado',     key: 'cantidad_planificada', width: 14 },
      { header: 'Real',            key: 'cantidad_real',        width: 10 },
      { header: 'No Producido',    key: 'no_producido',         width: 14 },
      { header: 'Hora de Inicio',  key: 'hora_inicio',          width: 20 },
      { header: 'Hora de Finalización', key: 'hora_fin',        width: 20 },
      { header: 'Cocinero',        key: 'cocinero',             width: 22 },
      { header: 'Comentarios',     key: 'comentarios',          width: 32 },
    ];

    // Estilo de cabecera
    const headerRow = sheet.getRow(1);
    headerRow.font  = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A5F' } };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };

    // Filas de datos con formato de fecha legible en zona horaria de Chile
    rows.forEach((r, i) => {
      // Formatear la fecha principal usando dayjs con timezone de Chile
      let fechaFormateada = '';
      if (r.fecha) {
        if (r.fecha instanceof Date) {
          fechaFormateada = dayjs(r.fecha).tz('America/Santiago').format('YYYY-MM-DD');
        } else {
          fechaFormateada = String(r.fecha).slice(0, 10);
        }
      }

      // Formatear hora_inicio con timezone de Chile
      let horaInicioFormateada = '';
      if (r.hora_inicio) {
        if (r.hora_inicio instanceof Date) {
          horaInicioFormateada = dayjs(r.hora_inicio).tz('America/Santiago').format('DD/MM/YYYY, h:mm:ss A');
        } else {
          horaInicioFormateada = r.hora_inicio;
        }
      }

      // Formatear hora_fin con timezone de Chile
      let horaFinFormateada = '';
      if (r.hora_fin) {
        if (r.hora_fin instanceof Date) {
          horaFinFormateada = dayjs(r.hora_fin).tz('America/Santiago').format('DD/MM/YYYY, h:mm:ss A');
        } else {
          horaFinFormateada = r.hora_fin;
        }
      }

      const row = sheet.addRow({
        ...r,
        fecha: fechaFormateada,
        hora_inicio: horaInicioFormateada,
        hora_fin: horaFinFormateada,
      });
      // Filas alternadas
      if (i % 2 === 1) {
        row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
      }
    });

    const filename = `produccion_${fecha_inicio}_${fecha_fin}.xlsx`;
    res.setHeader('Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (e) { err500(res, e); }
});

// ══════════════════════════════════════════════════════════════
//  START
// ══════════════════════════════════════════════════════════════
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log('\n┌──────────────────────────────────────────────┐');
  console.log('│  🍽️  Kitchen Manager – Servidor iniciado       │');
  console.log('├──────────────────────────────────────────────┤');
  console.log(`│  HOME          → http://localhost:${PORT}/          │`);
  console.log(`│  Planificación → http://localhost:${PORT}/planificacion.html │`);
  console.log(`│  KDS           → http://localhost:${PORT}/kds.html           │`);
  console.log(`│  Registro      → http://localhost:${PORT}/registro.html      │`);
  console.log('└──────────────────────────────────────────────┘\n');
});
