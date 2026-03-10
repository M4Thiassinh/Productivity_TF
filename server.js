// ============================================================
//  KITCHEN MANAGER – Backend  (Node.js + Express + MySQL2)
//  Archivo único: server.js
//  Sirve la API REST y los archivos estáticos del frontend.
// ============================================================

require('dotenv').config();

const express = require('express');
const mysql   = require('mysql2/promise');
const path    = require('path');

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
  timezone        : 'local',
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
//      Solo devuelve ítems con cantidad_planificada > 0 (para el KDS).
//      Parámetro opcional ?tipo=Frío o ?tipo=Caliente para filtrar cuarto.
app.get('/api/planificacion/kds', async (req, res) => {
  const fecha = req.query.fecha || new Date().toISOString().slice(0, 10);
  const tipo  = req.query.tipo  || null; // 'Frío' | 'Caliente' | null
  try {
    let sql = `SELECT p.plu_id, p.nombre, p.tipo_cuarto,
              pd.cantidad_planificada
         FROM planificacion_diaria pd
         JOIN productos p ON pd.plu_id = p.plu_id
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
              COALESCE(pr.cantidad_real, 0)  AS cantidad_real,
              COALESCE(pr.mermas,        0)  AS mermas,
              COALESCE(pr.comentarios,   '') AS comentarios
         FROM planificacion_diaria pd
         JOIN productos p ON pd.plu_id = p.plu_id
         LEFT JOIN produccion_real pr
           ON pr.plu_id = pd.plu_id AND pr.fecha = pd.fecha
        WHERE pd.fecha = ?
          AND pd.cantidad_planificada > 0
        ORDER BY p.tipo_cuarto DESC, p.nombre`,
      [fecha]
    );
    res.json(rows);
  } catch (e) { err500(res, e); }
});

// POST /api/produccion
//      Inserta o actualiza el registro de producción real de un ítem.
//      Solo recibe: cantidad_real, mermas y comentarios.
//      La distribución sala/tienda es responsabilidad del jefe (planificacion_diaria).
app.post('/api/produccion', async (req, res) => {
  const { fecha, plu_id, cantidad_real, mermas, comentarios } = req.body;
  if (!fecha || !plu_id)
    return res.status(400).json({ error: 'fecha y plu_id son requeridos.' });
  try {
    await pool.execute(
      `INSERT INTO produccion_real
              (fecha, plu_id, cantidad_real, mermas, comentarios)
            VALUES (?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
              cantidad_real = VALUES(cantidad_real),
              mermas        = VALUES(mermas),
              comentarios   = VALUES(comentarios)`,
      [
        fecha, plu_id,
        Number(cantidad_real) || 0,
        Number(mermas)        || 0,
        (comentarios || '').trim(),
      ]
    );
    res.json({ success: true });
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
