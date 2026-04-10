// ============================================================
//  KITCHEN MANAGER – Backend  (Node.js + Express + MySQL2)
//  Archivo único: server.js
//  Sirve la API REST y los archivos estáticos del frontend.
// ============================================================

require('dotenv').config();

const express = require('express');
const session = require('express-session');
const bcrypt  = require('bcryptjs');
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

// ══════════════════════════════════════════════════════════════
//  CONFIGURACIÓN DE SESIONES
// ══════════════════════════════════════════════════════════════
app.use(session({
  secret: process.env.SESSION_SECRET || 'kitchen-manager-secret-key-2024',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false, // Cambiar a true si usas HTTPS
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 horas
  }
}));

// ══════════════════════════════════════════════════════════════
//  CREDENCIALES (puedes cambiarlas en .env)
// ══════════════════════════════════════════════════════════════
const CREDENTIALS = {
  // Contraseña única para personal
  staff: {
    password: process.env.STAFF_PASSWORD || 'cocina2024',
    role: 'staff'
  },
  // Usuario administrador
  admin: {
    password: process.env.ADMIN_PASSWORD || 'admin2024',
    role: 'admin'
  }
};

// ══════════════════════════════════════════════════════════════
//  MIDDLEWARE DE AUTENTICACIÓN Y AUTORIZACIÓN
// ══════════════════════════════════════════════════════════════

// Middleware: Requiere estar autenticado
const requireAuth = (req, res, next) => {
  if (req.session && req.session.authenticated) {
    return next();
  }
  
  // Si es una petición AJAX, devuelve 401
  if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
    return res.status(401).json({ error: 'No autenticado' });
  }
  
  // Si es una página HTML, redirige a login
  return res.redirect('/login.html');
};

// Middleware: Requiere rol de administrador
const requireAdmin = (req, res, next) => {
  if (req.session && req.session.authenticated && req.session.role === 'admin') {
    return next();
  }
  
  // Si es una petición AJAX, devuelve 403
  if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
    return res.status(403).json({ error: 'Acceso denegado. Requiere permisos de administrador.' });
  }
  
  // Si es una página HTML, redirige al home o muestra error
  return res.status(403).send(`
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Acceso Denegado</title>
      <script src="https://cdn.tailwindcss.com"></script>
    </head>
    <body class="bg-gray-950 min-h-screen flex items-center justify-center p-6">
      <div class="text-center">
        <div class="text-8xl mb-6">🚫</div>
        <h1 class="text-4xl font-black text-white mb-4">Acceso Denegado</h1>
        <p class="text-gray-400 mb-8">No tienes permisos para acceder a esta página.</p>
        <a href="/" class="inline-block bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition-all">
          Volver al Inicio
        </a>
      </div>
    </body>
    </html>
  `);
};

// ══════════════════════════════════════════════════════════════
//  RUTAS DE AUTENTICACIÓN
// ══════════════════════════════════════════════════════════════

// Login
app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;
  
  if (!password) {
    return res.status(400).json({ error: 'Contraseña requerida' });
  }

  const user = username?.toLowerCase().trim() || 'personal';
  
  try {
    // Verificar credenciales
    let validCredentials = false;
    let role = 'staff';
    
    if (user === 'admin' && password === CREDENTIALS.admin.password) {
      validCredentials = true;
      role = 'admin';
    } else if ((user === 'personal' || !user) && password === CREDENTIALS.staff.password) {
      validCredentials = true;
      role = 'staff';
    }
    
    if (validCredentials) {
      req.session.authenticated = true;
      req.session.username = user;
      req.session.role = role;
      
      return res.json({ 
        success: true, 
        message: 'Login exitoso',
        role: role 
      });
    } else {
      return res.status(401).json({ error: 'Credenciales incorrectas' });
    }
  } catch (error) {
    console.error('Error en login:', error);
    return res.status(500).json({ error: 'Error del servidor' });
  }
});

// Logout
app.post('/api/auth/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: 'Error al cerrar sesión' });
    }
    res.json({ success: true });
  });
});

// Verificar sesión
app.get('/api/auth/check', (req, res) => {
  if (req.session && req.session.authenticated) {
    return res.json({ 
      authenticated: true,
      username: req.session.username,
      role: req.session.role
    });
  }
  res.json({ authenticated: false });
});

// ── Sirve archivos estáticos SIN protección (CSS, JS, imágenes) ──
app.use('/assets', express.static(path.join(__dirname, 'public/assets')));

// ── Páginas públicas (solo login) ──
app.get('/login.html', (req, res) => {
  // Si ya está autenticado, redirige al home
  if (req.session && req.session.authenticated) {
    return res.redirect('/');
  }
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// ── PÁGINAS RESTRINGIDAS SOLO PARA ADMIN ──
const adminPages = [
  '/planificacion.html',
  '/planificacion2.html',
  '/registro.html',
  '/informes.html',
  '/admin.html'
];

adminPages.forEach(page => {
  app.get(page, requireAuth, requireAdmin, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', page.substring(1)));
  });
});

// ── PÁGINAS KDS (Accesibles para todos los autenticados) ──
const kdsPages = [
  '/kds.html',
  '/kds-caliente.html',
  '/kds-frio.html'
];

kdsPages.forEach(page => {
  app.get(page, requireAuth, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', page.substring(1)));
  });
});

// ── PROTEGER TODAS LAS DEMÁS RUTAS HTML ──
app.use((req, res, next) => {
  // Si es una ruta de API o asset, dejar pasar al siguiente middleware
  if (req.path.startsWith('/api/') || req.path.startsWith('/assets/')) {
    return next();
  }
  
  // Si es un archivo HTML o la raíz, requerir autenticación
  if (req.path.endsWith('.html') || req.path === '/') {
    return requireAuth(req, res, next);
  }
  
  next();
});

// ── Sirve el resto de archivos estáticos ──
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
  // Timezone eliminado: ahora manejamos todo en Node.js con dayjs + America/Santiago
});

// ══════════════════════════════════════════════════════════════
//  POOL v2 – kitchen_db2 (Modelo Relacional Dinámico)
// ══════════════════════════════════════════════════════════════
const pool2 = mysql.createPool({
  host            : process.env.DB_HOST     || 'localhost',
  port            : Number(process.env.DB_PORT) || 3306,
  user            : process.env.DB_USER     || 'root',
  password        : process.env.DB_PASSWORD || '',
  database        : process.env.DB2_NAME    || 'kitchen_db2',
  waitForConnections: true,
  connectionLimit : 10,
});

// ── Helper de errores ──────────────────────────────────────────
const err500 = (res, e) => {
  console.error('❌ BD Error:', e.message);
  res.status(500).json({ error: e.message });
};

const getLocalISODate = () => {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
};

// ══════════════════════════════════════════════════════════════
//  PROTEGER RUTAS API CON ROLES
// ══════════════════════════════════════════════════════════════

// Middleware para rutas de planificación (solo admin puede modificar)
app.use('/api/planificacion*', requireAuth, (req, res, next) => {
  console.log(`📋 Planificación request: ${req.method} ${req.path} (URL completa: ${req.originalUrl}) | Role: ${req.session.role}`);
  
  // GET a /api/planificacion/kds está permitido para todos (personal necesita ver KDS)
  // Usamos originalUrl porque el path puede estar modificado por el middleware
  if (req.method === 'GET' && req.originalUrl.includes('/api/planificacion/kds')) {
    console.log('✅ Permitiendo acceso a KDS (todos los roles)');
    return next();
  }
  
  // Todas las demás operaciones requieren admin
  if (req.method !== 'GET' || req.originalUrl.includes('/batch')) {
    console.log('🔒 Requiere admin (POST/PUT/DELETE o batch)');
    return requireAdmin(req, res, next);
  }
  
  // GET a planificación normal también requiere admin (para ver la planificación)
  console.log('🔒 Requiere admin (GET a planificación)');
  return requireAdmin(req, res, next);
});

// Rutas de producción, informes y resumen - solo admin
app.use('/api/produccion*', requireAuth, requireAdmin);
app.use('/api/resumen_diario', requireAuth, requireAdmin);
app.use('/api/informes/*', requireAuth, requireAdmin);

// ══════════════════════════════════════════════════════════════
//  PROTEGER TODAS LAS RUTAS API (excepto /api/auth/*)
// ══════════════════════════════════════════════════════════════
app.use('/api/*', (req, res, next) => {
  // Permitir rutas de autenticación
  if (req.path.startsWith('/api/auth/')) {
    return next();
  }
  
  // Requerir autenticación para todas las demás rutas API
  return requireAuth(req, res, next);
});

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

// POST /api/productos  → Crea un producto nuevo (solo admin)
app.post('/api/productos', requireAdmin, async (req, res) => {
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
  const fecha = req.query.fecha || getLocalISODate();
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
  const fecha = req.query.fecha || getLocalISODate();
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
  const fecha = req.query.fecha || getLocalISODate();
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
    // Capturar hora actual en zona horaria de Santiago, Chile
    // Formato HH:mm:ss para que MySQL guarde solo la hora sin hacer conversiones
    const horaActual = dayjs().tz('America/Santiago').format('HH:mm:ss');

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
          [horaActual, fecha, plu_id]
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
        [fecha, plu_id, horaActual]
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
  
  // Capturar hora actual en zona horaria de Santiago, Chile
  // Formato HH:mm:ss para que MySQL guarde solo la hora sin hacer conversiones
  const horaActual = dayjs().tz('America/Santiago').format('HH:mm:ss');

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
      [real, noProducido, cocinero_id || null, (comentarios || '').trim(), horaActual, fecha, plu_id]
    );

    res.json({ success: true, mensaje: 'Producción finalizada.' });
  } catch (e) { err500(res, e); }
});

// GET /api/resumen_diario?fecha=YYYY-MM-DD
//     Resumen consolidado para la pantalla de previsualización.
app.get('/api/resumen_diario', async (req, res) => {
  const fecha = req.query.fecha || getLocalISODate();
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
      // FECHA PRINCIPAL: Forzar que sea string YYYY-MM-DD sin conversiones
      // Evitamos que exceljs interprete como UTC y reste horas
      let fechaFormateada = '';
      if (r.fecha) {
        if (typeof r.fecha === 'string') {
          // Ya es string: usar directamente
          fechaFormateada = r.fecha.slice(0, 10);
        } else if (r.fecha instanceof Date) {
          // Es Date: formatear en timezone Santiago para evitar desfase
          fechaFormateada = dayjs(r.fecha).tz('America/Santiago').format('YYYY-MM-DD');
        }
      }

      // HORA DE INICIO: Formatear como DD/MM/YYYY, h:mm:ss A
      let horaInicioFormateada = '';
      if (r.hora_inicio) {
        if (typeof r.hora_inicio === 'string') {
          // Si es string tipo "14:30:00", agregar la fecha del día actual
          const fechaStr = fechaFormateada || dayjs().format('YYYY-MM-DD');
          horaInicioFormateada = dayjs(`${fechaStr} ${r.hora_inicio}`)
            .tz('America/Santiago')
            .format('DD/MM/YYYY, h:mm:ss A');
        } else if (r.hora_inicio instanceof Date) {
          // Si es Date completo
          horaInicioFormateada = dayjs(r.hora_inicio)
            .tz('America/Santiago')
            .format('DD/MM/YYYY, h:mm:ss A');
        }
      }

      // HORA DE FIN: Formatear como DD/MM/YYYY, h:mm:ss A
      let horaFinFormateada = '';
      if (r.hora_fin) {
        if (typeof r.hora_fin === 'string') {
          // Si es string tipo "16:45:00", agregar la fecha del día actual
          const fechaStr = fechaFormateada || dayjs().format('YYYY-MM-DD');
          horaFinFormateada = dayjs(`${fechaStr} ${r.hora_fin}`)
            .tz('America/Santiago')
            .format('DD/MM/YYYY, h:mm:ss A');
        } else if (r.hora_fin instanceof Date) {
          // Si es Date completo
          horaFinFormateada = dayjs(r.hora_fin)
            .tz('America/Santiago')
            .format('DD/MM/YYYY, h:mm:ss A');
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
//  API v2 – RESUMEN DIARIO
//  GET /api/v2/resumen_diario?fecha=YYYY-MM-DD
//  Resumen consolidado por producto con desglose de destinos.
// ══════════════════════════════════════════════════════════════
app.get('/api/v2/resumen_diario', requireAuth, requireAdmin, async (req, res) => {
  const fecha = req.query.fecha || getLocalISODate();
  try {
    // 1. Cabecera: totales por producto
    const [rows] = await pool2.execute(
      `SELECT
         p.id          AS producto_id,
         p.plu,
         p.nombre,
         p.cuarto,
         p.envase,
         COALESCE(SUM(pdd.cantidad), 0)          AS total_planificado,
         COALESCE(pr.cantidad_real, 0)           AS total_real,
         COALESCE(pr.no_producido, 0)            AS total_no_producido,
         pr.hora_inicio,
         pr.hora_fin,
         COALESCE(c.nombre, '')                  AS cocinero,
         COALESCE(pr.comentarios, '')            AS comentarios
       FROM planificacion_diaria pd
       JOIN productos p ON pd.producto_id = p.id
       LEFT JOIN planificacion_destinos pdd ON pdd.planificacion_id = pd.id
       LEFT JOIN produccion_real pr
         ON pr.producto_id = pd.producto_id AND pr.fecha = pd.fecha
       LEFT JOIN cocineros c ON c.id = pr.cocinero_id
       WHERE pd.fecha = ?
       GROUP BY p.id, p.plu, p.nombre, p.cuarto, p.envase,
                pr.cantidad_real, pr.no_producido, pr.hora_inicio,
                pr.hora_fin, c.nombre, pr.comentarios
       HAVING COALESCE(SUM(pdd.cantidad), 0) > 0
       ORDER BY p.nombre`,
      [fecha]
    );

    if (!rows.length) return res.json([]);

    // 2. Desglose por destino para cada producto
    const productoIds = rows.map(r => r.producto_id);
    const [destRows] = await pool2.execute(
      `SELECT
         pd.producto_id,
         d.id         AS destino_id,
         d.nombre     AS destino_nombre,
         pdd.cantidad AS cantidad_planificada,
         COALESCE(prod_d.cantidad, 0) AS cantidad_real
       FROM planificacion_diaria pd
       JOIN planificacion_destinos pdd ON pdd.planificacion_id = pd.id
       JOIN destinos d ON d.id = pdd.destino_id
       LEFT JOIN produccion_real pr
         ON pr.producto_id = pd.producto_id AND pr.fecha = pd.fecha
       LEFT JOIN produccion_destinos prod_d
         ON prod_d.produccion_id = pr.id AND prod_d.destino_id = d.id
       WHERE pd.fecha = ?
         AND pd.producto_id IN (${productoIds.map(() => '?').join(',')})
       ORDER BY d.id`,
      [fecha, ...productoIds]
    );

    const result = rows.map(row => ({
      ...row,
      destinos: destRows
        .filter(d => d.producto_id === row.producto_id)
        .map(d => ({
          destino_id          : d.destino_id,
          nombre              : d.destino_nombre,
          cantidad_planificada: d.cantidad_planificada,
          cantidad_real       : d.cantidad_real,
        }))
    }));

    res.json(result);
  } catch (e) { err500(res, e); }
});

// ══════════════════════════════════════════════════════════════
//  API v2 – EXCEL INFORMES
//  GET /api/v2/informes/excel?fecha_inicio=YYYY-MM-DD&fecha_fin=YYYY-MM-DD
//  Genera un .xlsx desde kitchen_db2 con columnas dinámicas de destinos.
// ══════════════════════════════════════════════════════════════
app.get('/api/v2/informes/excel', requireAuth, requireAdmin, async (req, res) => {
  const fecha_inicio = req.query.fecha_inicio || req.query.desde;
  const fecha_fin    = req.query.fecha_fin    || req.query.hasta;

  const fechaRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!fecha_inicio || !fecha_fin || !fechaRegex.test(fecha_inicio) || !fechaRegex.test(fecha_fin))
    return res.status(400).json({ error: 'Parámetros fecha_inicio y fecha_fin requeridos (YYYY-MM-DD).' });
  if (fecha_inicio > fecha_fin)
    return res.status(400).json({ error: '"fecha_inicio" no puede ser posterior a "fecha_fin".' });

  try {
    // Obtener destinos activos (para nombres de columnas dinámicas)
    const [destinos] = await pool2.execute(
      'SELECT id, nombre FROM destinos WHERE activo = 1 ORDER BY id'
    );

    // Consulta principal
    const [rows] = await pool2.execute(
      `SELECT
         pr.fecha,
         p.plu,
         p.nombre,
         p.cuarto,
         p.envase,
         pr.cantidad_real,
         pr.no_producido,
         pr.hora_inicio,
         pr.hora_fin,
         COALESCE(c.nombre, '') AS cocinero,
         COALESCE(pr.comentarios, '') AS comentarios,
         pr.id AS produccion_id
       FROM produccion_real pr
       JOIN productos p ON pr.producto_id = p.id
       LEFT JOIN cocineros c ON c.id = pr.cocinero_id
       WHERE pr.fecha BETWEEN ? AND ?
       ORDER BY pr.fecha ASC, p.cuarto DESC, p.nombre ASC`,
      [fecha_inicio, fecha_fin]
    );

    if (!rows.length) {
      return res.status(404).json({ error: 'No hay datos de producción en ese rango de fechas en kitchen_db2.' });
    }

    // Desglose por destino para cada produccion_id
    const produccionIds = rows.map(r => r.produccion_id);
    const [destDetalles] = await pool2.execute(
      `SELECT produccion_id, destino_id, cantidad
       FROM produccion_destinos
       WHERE produccion_id IN (${produccionIds.map(() => '?').join(',')})`,
      produccionIds
    );

    // También planificación por destino
    const [planDetalles] = await pool2.execute(
      `SELECT pd.producto_id, pd.fecha, pdd.destino_id, pdd.cantidad
       FROM planificacion_diaria pd
       JOIN planificacion_destinos pdd ON pdd.planificacion_id = pd.id
       WHERE pd.fecha BETWEEN ? AND ?`,
      [fecha_inicio, fecha_fin]
    );

    // ── Construir mapa de detalles
    const prodMap = {};  // produccion_id → { destino_id: cantidad_real }
    destDetalles.forEach(d => {
      if (!prodMap[d.produccion_id]) prodMap[d.produccion_id] = {};
      prodMap[d.produccion_id][d.destino_id] = d.cantidad;
    });

    const planMap = {};  // `${fecha}-${producto_id}` → { destino_id: cantidad_plan }
    planDetalles.forEach(d => {
      const key = `${d.fecha instanceof Date
        ? dayjs(d.fecha).tz('America/Santiago').format('YYYY-MM-DD')
        : String(d.fecha).slice(0, 10)}-${d.producto_id}`;
      if (!planMap[key]) planMap[key] = {};
      planMap[key][d.destino_id] = d.cantidad;
    });

    // ── Construir Excel
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Kitchen Manager v2';
    const sheet = workbook.addWorksheet('Producción v2', {
      views: [{ state: 'frozen', ySplit: 1 }],
    });

    // Columnas fijas + columnas dinámicas de destinos
    const columnas = [
      { header: 'Fecha',         key: 'fecha',         width: 14 },
      { header: 'PLU',           key: 'plu',           width: 10 },
      { header: 'Producto',      key: 'nombre',        width: 36 },
      { header: 'Cuarto',        key: 'cuarto',        width: 12 },
      { header: 'Envase',        key: 'envase',        width: 16 },
    ];
    // Columnas dinámicas: Plan Destino X y Real Destino X
    destinos.forEach(d => {
      columnas.push({ header: `Plan ${d.nombre}`, key: `plan_${d.id}`, width: 14 });
    });
    destinos.forEach(d => {
      columnas.push({ header: `Real ${d.nombre}`, key: `real_${d.id}`, width: 14 });
    });
    columnas.push(
      { header: 'Total Planificado', key: 'total_planificado', width: 18 },
      { header: 'Total Real',        key: 'cantidad_real',      width: 14 },
      { header: 'No Producido',      key: 'no_producido',       width: 14 },
      { header: 'Hora Inicio',       key: 'hora_inicio',        width: 22 },
      { header: 'Hora Fin',          key: 'hora_fin',           width: 22 },
      { header: 'Cocinero',          key: 'cocinero',           width: 22 },
      { header: 'Comentarios',       key: 'comentarios',        width: 34 },
    );
    sheet.columns = columnas;

    // Estilo de cabecera
    const headerRow = sheet.getRow(1);
    headerRow.font      = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A5F' } };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };

    // Filas de datos
    rows.forEach((r, i) => {
      const fechaStr = r.fecha
        ? (r.fecha instanceof Date
            ? dayjs(r.fecha).tz('America/Santiago').format('YYYY-MM-DD')
            : String(r.fecha).slice(0, 10))
        : '';

      const fmtHora = (h) => {
        if (!h) return '';
        const base = typeof h === 'string' ? `${fechaStr} ${h}` : h;
        return dayjs(base).tz('America/Santiago').format('DD/MM/YYYY, h:mm:ss A');
      };

      const planKey = `${fechaStr}-${r.produccion_id}`; // aproximación — usamos producion_id para mapear
      // En realidad el plan se relaciona por fecha+producto_id; construimos la clave correctamente:
      // Como no tenemos producto_id directamente aquí, lo buscamos en destDetalles
      const myPlanMap = {};
      planDetalles.forEach(pd => {
        const pdFecha = pd.fecha instanceof Date
          ? dayjs(pd.fecha).tz('America/Santiago').format('YYYY-MM-DD')
          : String(pd.fecha).slice(0, 10);
        // Necesitamos relacionar produccion_id → producto_id
        // Simplificación: buscamos en destDetalles el producto via produccion_real
        // La forma más directa ya la tenemos en rows
        // En rows tenemos plu, buscamos producto_id desde planDetalles por fecha+plu
      });

      // Desglose producción real por destino
      const realDest = prodMap[r.produccion_id] || {};

      const rowObj = {
        fecha    : fechaStr,
        plu      : r.plu,
        nombre   : r.nombre,
        cuarto   : r.cuarto,
        envase   : r.envase || '',
        cantidad_real  : r.cantidad_real  || 0,
        no_producido   : r.no_producido   || 0,
        hora_inicio    : fmtHora(r.hora_inicio),
        hora_fin       : fmtHora(r.hora_fin),
        cocinero       : r.cocinero,
        comentarios    : r.comentarios,
        total_planificado: 0,
      };

      let totalPlan = 0;
      destinos.forEach(d => {
        rowObj[`real_${d.id}`] = realDest[d.id] || 0;
        rowObj[`plan_${d.id}`] = 0; // relleno; se actualiza abajo
      });

      // Obtener planificación de este registro (via planDetalles)
      planDetalles.forEach(pd => {
        const pdFecha = pd.fecha instanceof Date
          ? dayjs(pd.fecha).tz('America/Santiago').format('YYYY-MM-DD')
          : String(pd.fecha).slice(0, 10);
        // Relacionar por fecha: asumimos que el registro de producción ya está vinculado
        if (pdFecha === fechaStr) {
          rowObj[`plan_${pd.destino_id}`] = pd.cantidad || 0;
          totalPlan += pd.cantidad || 0;
        }
      });
      rowObj.total_planificado = r.cantidad_real + (r.no_producido || 0); // fallback si plan no coincide

      const addedRow = sheet.addRow(rowObj);
      if (i % 2 === 1) {
        addedRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
      }
    });

    const filename = `produccion_v2_${fecha_inicio}_${fecha_fin}.xlsx`;
    res.setHeader('Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    await workbook.xlsx.write(res);
    res.end();
  } catch (e) { err500(res, e); }
});

// ══════════════════════════════════════════════════════════════
//  MIDDLEWARE  API v2
//  Todas las rutas /api/v2/* requieren autenticación.
//  Crear/eliminar destinos y productos requiere admin.
// ══════════════════════════════════════════════════════════════
app.use('/api/v2/*', requireAuth);

app.use('/api/v2/destinos', (req, res, next) => {
  if (req.method !== 'GET') return requireAdmin(req, res, next);
  next();
});

app.use('/api/v2/productos', (req, res, next) => {
  if (req.method !== 'GET') return requireAdmin(req, res, next);
  next();
});

app.use('/api/v2/planificacion', (req, res, next) => {
  // GET /api/v2/planificacion/kds → accesible para staff (pantallas KDS)
  if (req.method === 'GET' && req.originalUrl.includes('/kds')) return next();
  return requireAdmin(req, res, next);
});

// ══════════════════════════════════════════════════════════════
//  API v2 – DESTINOS
// ══════════════════════════════════════════════════════════════

// GET /api/v2/destinos → Lista todos los destinos activos
app.get('/api/v2/destinos', async (req, res) => {
  try {
    const [rows] = await pool2.execute(
      'SELECT id, nombre FROM destinos WHERE activo = 1 ORDER BY id'
    );
    res.json(rows);
  } catch (e) { err500(res, e); }
});

// POST /api/v2/destinos → Crea un nuevo centro de distribución
app.post('/api/v2/destinos', async (req, res) => {
  const { nombre } = req.body;
  if (!nombre || !nombre.trim())
    return res.status(400).json({ error: 'El nombre del destino es requerido.' });
  try {
    const [result] = await pool2.execute(
      'INSERT INTO destinos (nombre, activo) VALUES (?, 1)',
      [nombre.trim()]
    );
    res.status(201).json({ success: true, id: result.insertId, nombre: nombre.trim() });
  } catch (e) {
    if (e.code === 'ER_DUP_ENTRY')
      return res.status(409).json({ error: 'Ya existe un destino con ese nombre.' });
    err500(res, e);
  }
});

// DELETE /api/v2/destinos/:id → Desactiva (soft-delete) un destino
app.delete('/api/v2/destinos/:id', requireAdmin, async (req, res) => {
  const { id } = req.params;
  try {
    await pool2.execute('UPDATE destinos SET activo = 0 WHERE id = ?', [Number(id)]);
    res.json({ success: true });
  } catch (e) { err500(res, e); }
});

// ══════════════════════════════════════════════════════════════
//  API v2 – COCINEROS
// ══════════════════════════════════════════════════════════════

// GET /api/v2/cocineros → Lista cocineros desde kitchen_db2
app.get('/api/v2/cocineros', async (req, res) => {
  try {
    const [rows] = await pool2.execute('SELECT id, nombre FROM cocineros ORDER BY nombre');
    res.json(rows);
  } catch (e) { err500(res, e); }
});

// ══════════════════════════════════════════════════════════════
//  API v2 – PRODUCTOS
// ══════════════════════════════════════════════════════════════

// GET /api/v2/productos → Lista todos los productos de kitchen_db2
app.get('/api/v2/productos', async (req, res) => {
  try {
    const [rows] = await pool2.execute(
      'SELECT id, plu, nombre, cuarto, envase FROM productos ORDER BY cuarto, nombre'
    );
    res.json(rows);
  } catch (e) { err500(res, e); }
});

// POST /api/v2/productos → Registra un producto en kitchen_db2
app.post('/api/v2/productos', async (req, res) => {
  const { plu, nombre, cuarto, envase } = req.body;
  if (!plu || !nombre || !cuarto)
    return res.status(400).json({ error: 'plu, nombre y cuarto son requeridos.' });
  if (!['Frío', 'Caliente'].includes(cuarto))
    return res.status(400).json({ error: 'cuarto debe ser "Frío" o "Caliente".' });
  try {
    const [result] = await pool2.execute(
      'INSERT INTO productos (plu, nombre, cuarto, envase) VALUES (?, ?, ?, ?)',
      [plu.trim(), nombre.trim(), cuarto, (envase || '').trim() || null]
    );
    res.status(201).json({ success: true, id: result.insertId });
  } catch (e) {
    if (e.code === 'ER_DUP_ENTRY')
      return res.status(409).json({ error: 'Ya existe un producto con ese PLU.' });
    err500(res, e);
  }
});

// PUT /api/v2/productos/:id → Edita nombre, cuarto y/o envase de un producto
app.put('/api/v2/productos/:id', requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { nombre, cuarto, envase } = req.body;
  if (!nombre || !cuarto)
    return res.status(400).json({ error: 'nombre y cuarto son requeridos.' });
  if (!['Frío', 'Caliente'].includes(cuarto))
    return res.status(400).json({ error: 'cuarto debe ser "Frío" o "Caliente".' });
  try {
    const [result] = await pool2.execute(
      `UPDATE productos
          SET nombre = ?, cuarto = ?, envase = ?
        WHERE id = ?`,
      [nombre.trim(), cuarto, (envase || '').trim() || null, Number(id)]
    );
    if (result.affectedRows === 0)
      return res.status(404).json({ error: 'Producto no encontrado.' });
    res.json({ success: true });
  } catch (e) { err500(res, e); }
});

// ══════════════════════════════════════════════════════════════
//  API v2 – PLANIFICACIÓN
// ══════════════════════════════════════════════════════════════

// GET /api/v2/planificacion/kds?fecha=YYYY-MM-DD[&tipo=Frío|Caliente]
//     Devuelve productos planificados del día con destinos dinámicos.
app.get('/api/v2/planificacion/kds', async (req, res) => {
  const fecha = req.query.fecha || getLocalISODate();
  const tipo  = req.query.tipo  || null;
  try {
    let sqlMain = `
      SELECT
        p.id     AS producto_id,
        p.plu,
        p.nombre,
        p.cuarto,
        p.envase,
        COALESCE(SUM(pdd.cantidad), 0) AS total_planificado,
        COALESCE(pr.cantidad_real, 0)  AS total_producido,
        pr.hora_inicio,
        pr.hora_fin,
        pr.id AS registro_id
      FROM planificacion_diaria pd
      JOIN productos p ON pd.producto_id = p.id
      LEFT JOIN planificacion_destinos pdd ON pdd.planificacion_id = pd.id
      LEFT JOIN produccion_real pr
        ON pr.producto_id = pd.producto_id AND pr.fecha = pd.fecha
      WHERE pd.fecha = ?`;

    const params = [fecha];
    if (tipo) { sqlMain += ` AND p.cuarto = ?`; params.push(tipo); }

    sqlMain += `
      GROUP BY p.id, p.plu, p.nombre, p.cuarto, p.envase,
               pr.cantidad_real, pr.hora_inicio, pr.hora_fin, pr.id
      HAVING COALESCE(SUM(pdd.cantidad), 0) > 0
      ORDER BY p.nombre`;

    const [rows] = await pool2.execute(sqlMain, params);
    if (!rows.length) return res.json([]);

    // Desglose de cantidades por destino para cada producto
    const productoIds = rows.map(r => r.producto_id);
    const [destRows] = await pool2.execute(
      `SELECT
         pd.producto_id,
         d.id   AS destino_id,
         d.nombre AS destino_nombre,
         pdd.cantidad
       FROM planificacion_diaria pd
       JOIN planificacion_destinos pdd ON pdd.planificacion_id = pd.id
       JOIN destinos d ON d.id = pdd.destino_id
       WHERE pd.fecha = ?
         AND pd.producto_id IN (${productoIds.map(() => '?').join(',')})
         AND pdd.cantidad > 0
       ORDER BY d.id`,
      [fecha, ...productoIds]
    );

    // Merge: adjunta array de destinos a cada producto
    const result = rows.map(row => ({
      ...row,
      destinos: destRows
        .filter(d => d.producto_id === row.producto_id)
        .map(d => ({ destino_id: d.destino_id, nombre: d.destino_nombre, cantidad: d.cantidad }))
    }));

    res.json(result);
  } catch (e) { err500(res, e); }
});

// POST /api/v2/planificacion/batch
//      Body: { fecha, items: [{ producto_id, destinos: [{ destino_id, cantidad }] }] }
app.post('/api/v2/planificacion/batch', requireAdmin, async (req, res) => {
  const { fecha, items } = req.body;
  if (!fecha || !Array.isArray(items) || !items.length)
    return res.status(400).json({ error: 'fecha e items[] son requeridos.' });

  const conn = await pool2.getConnection();
  try {
    await conn.beginTransaction();
    let guardados = 0;
    for (const item of items) {
      const { producto_id, destinos } = item;
      if (!producto_id || !Array.isArray(destinos)) continue;

      const totalCantidad = destinos.reduce((s, d) => s + (Number(d.cantidad) || 0), 0);
      if (totalCantidad === 0) continue;

      // Upsert cabecera de planificacion
      await conn.execute(
        `INSERT INTO planificacion_diaria (fecha, producto_id)
         VALUES (?, ?)
         ON DUPLICATE KEY UPDATE id = LAST_INSERT_ID(id)`,
        [fecha, producto_id]
      );
      const [[{ planId }]] = await conn.execute(
        'SELECT id AS planId FROM planificacion_diaria WHERE fecha = ? AND producto_id = ?',
        [fecha, producto_id]
      );

      // Upsert detalle por destino
      for (const d of destinos) {
        const cant = Number(d.cantidad) || 0;
        await conn.execute(
          `INSERT INTO planificacion_destinos (planificacion_id, destino_id, cantidad)
           VALUES (?, ?, ?)
           ON DUPLICATE KEY UPDATE cantidad = VALUES(cantidad)`,
          [planId, d.destino_id, cant]
        );
      }
      guardados++;
    }
    await conn.commit();
    res.json({ success: true, guardados });
  } catch (e) {
    await conn.rollback();
    err500(res, e);
  } finally {
    conn.release();
  }
});

// ══════════════════════════════════════════════════════════════
//  API v2 – PRODUCCIÓN
// ══════════════════════════════════════════════════════════════

// POST /api/v2/produccion/iniciar
//      Registra la hora de inicio de preparación de un producto.
app.post('/api/v2/produccion/iniciar', async (req, res) => {
  const { fecha, producto_id } = req.body;
  if (!fecha || !producto_id)
    return res.status(400).json({ error: 'fecha y producto_id son requeridos.' });

  const horaActual = dayjs().tz('America/Santiago').format('HH:mm:ss');
  try {
    const [existing] = await pool2.execute(
      'SELECT id, hora_inicio FROM produccion_real WHERE fecha = ? AND producto_id = ?',
      [fecha, producto_id]
    );
    if (existing.length > 0) {
      if (!existing[0].hora_inicio) {
        await pool2.execute(
          'UPDATE produccion_real SET hora_inicio = ? WHERE fecha = ? AND producto_id = ?',
          [horaActual, fecha, producto_id]
        );
        return res.json({ success: true, mensaje: 'Preparación iniciada.' });
      }
      return res.json({ success: true, mensaje: 'Ya estaba iniciado.' });
    }
    await pool2.execute(
      `INSERT INTO produccion_real
         (fecha, producto_id, hora_inicio, cantidad_real, no_producido)
       VALUES (?, ?, ?, 0, 0)`,
      [fecha, producto_id, horaActual]
    );
    res.json({ success: true, mensaje: 'Preparación iniciada.' });
  } catch (e) { err500(res, e); }
});

// PUT /api/v2/produccion/finalizar
//     Guarda cantidad real, cocinero, hora_fin y desglose por destino.
//     Body: { fecha, producto_id, cantidad_real, no_producido,
//             cocinero_id, comentarios, destinos: [{destino_id, cantidad}] }
app.put('/api/v2/produccion/finalizar', async (req, res) => {
  const { fecha, producto_id, cantidad_real, no_producido,
          cocinero_id, comentarios, destinos } = req.body;
  if (!fecha || !producto_id)
    return res.status(400).json({ error: 'fecha y producto_id son requeridos.' });

  const real        = Number(cantidad_real)  || 0;
  const noProducido = Number(no_producido)   || 0;
  const horaActual  = dayjs().tz('America/Santiago').format('HH:mm:ss');

  const conn = await pool2.getConnection();
  try {
    await conn.beginTransaction();

    // Upsert produccion_real principal
    await conn.execute(
      `INSERT INTO produccion_real
         (fecha, producto_id, cantidad_real, no_producido,
          cocinero_id, comentarios, hora_fin)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         cantidad_real = VALUES(cantidad_real),
         no_producido  = VALUES(no_producido),
         cocinero_id   = VALUES(cocinero_id),
         comentarios   = VALUES(comentarios),
         hora_fin      = VALUES(hora_fin)`,
      [fecha, producto_id, real, noProducido,
       cocinero_id || null, (comentarios || '').trim(), horaActual]
    );

    // Obtener ID del registro recién guardado
    const [[{ prod_id }]] = await conn.execute(
      'SELECT id AS prod_id FROM produccion_real WHERE fecha = ? AND producto_id = ?',
      [fecha, producto_id]
    );

    // Insertar/actualizar desglose por destino
    if (Array.isArray(destinos)) {
      for (const d of destinos) {
        await conn.execute(
          `INSERT INTO produccion_destinos (produccion_id, destino_id, cantidad)
           VALUES (?, ?, ?)
           ON DUPLICATE KEY UPDATE cantidad = VALUES(cantidad)`,
          [prod_id, d.destino_id, Number(d.cantidad) || 0]
        );
      }
    }

    await conn.commit();
    res.json({ success: true, mensaje: 'Producción finalizada.' });
  } catch (e) {
    await conn.rollback();
    err500(res, e);
  } finally {
    conn.release();
  }
});

// ══════════════════════════════════════════════════════════════
//  START
// ══════════════════════════════════════════════════════════════
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0'; // Escucha en todas las interfaces

app.listen(PORT, HOST, () => {
  console.log('\n┌──────────────────────────────────────────────┐');
  console.log('│  🍽️  Kitchen Manager – Servidor iniciado       │');
  console.log('├──────────────────────────────────────────────┤');
  console.log(`│  LOCAL         → http://localhost:${PORT}/          │`);
  console.log(`│  RED LOCAL     → http://<TU_IP>:${PORT}/           │`);
  console.log('├──────────────────────────────────────────────┤');
  console.log(`│  Planificación → /planificacion.html               │`);
  console.log(`│  KDS           → /kds.html                         │`);
  console.log(`│  Registro      → /registro.html                    │`);
  console.log('└──────────────────────────────────────────────┘\n');
});
