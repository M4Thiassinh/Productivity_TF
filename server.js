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
  '/registro.html', 
  '/informes.html'
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
