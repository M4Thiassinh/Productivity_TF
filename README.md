# 🍽️ Kitchen Manager

Sistema web interno para **gestión de producción de cocina** y **KDS (Kitchen Display System)**.

---

## 📁 Estructura del Proyecto

```
Productivity_TF/
├── server.js               ← Backend (Node.js + Express + MySQL)
├── package.json            ← Dependencias Node.js
├── .env.example            ← Plantilla de variables de entorno
├── database.sql            ← Script de creación de tablas
├── requirements.txt        ← Referencia de dependencias
└── public/
    ├── index.html          ← Home: 3 botones principales
    ├── planificacion.html  ← Vista del Jefe de Cocina
    ├── kds.html            ← Pantalla KDS (auto-refresca c/30s)
    └── registro.html       ← Registro de producción real
```

---

## 🛠️ Requisitos Previos

| Herramienta | Versión mínima | Descarga |
|-------------|---------------|----------|
| **Node.js** | 18 LTS        | https://nodejs.org |
| **MySQL**   | 8.0           | https://dev.mysql.com/downloads/ |
| **npm**     | 9.x           | Incluido con Node.js |

---

## 🚀 Paso a Paso: Correr el Proyecto

### 1️⃣  Clonar / Descargar el Proyecto

Simplemente copia la carpeta `Productivity_TF/` al nuevo computador.

---

### 2️⃣  Crear la Base de Datos

Abre tu cliente MySQL (Workbench, TablePlus, DBeaver, terminal, etc.) y ejecuta el archivo `database.sql`.

Esto creará:
- Base de datos: `kitchen_db`
- Tabla: `productos` (con 8 productos de ejemplo)
- Tabla: `planificacion_diaria`
- Tabla: `produccion_real`

---

### 3️⃣  Configurar Variables de Entorno

```bash
# Windows:
copy .env.example .env

# Mac / Linux:
cp .env.example .env
```

Edita `.env` con tus credenciales MySQL:

```env
PORT=3000
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=tu_contraseña_aqui
DB_NAME=kitchen_db
```

---

### 4️⃣  Instalar Dependencias

```bash
npm install
```

---

### 5️⃣  Iniciar el Servidor

```bash
npm start
```

O en modo desarrollo (reinicio automático):

```bash
npm run dev
```

---

### 6️⃣  Abrir en el Navegador

| Vista | URL |
|-------|-----|
| 🏠 Home | http://localhost:3000 |
| 👨‍💼 Planificación | http://localhost:3000/planificacion.html |
| 📺 KDS | http://localhost:3000/kds.html |
| 🍳 Registro | http://localhost:3000/registro.html |

---

## 📡 API REST

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET  | /api/productos | Lista todos los productos |
| POST | /api/productos | Crea un producto nuevo |
| GET  | /api/planificacion?fecha=YYYY-MM-DD | Planificación del día |
| GET  | /api/planificacion/kds?fecha=YYYY-MM-DD | Solo ítems con cant > 0 |
| POST | /api/planificacion | Guarda o actualiza planificación |
| GET  | /api/produccion?fecha=YYYY-MM-DD | Producción real del día |
| POST | /api/produccion | Guarda o actualiza producción real |

---

## 🔁 Flujo de Uso Diario

1. **Jefe (mañana)** → `planificacion.html` → Define cuánto producir
2. **Cocineros (en turno)** → `kds.html` → Ven qué deben producir (se actualiza sola c/30s)
3. **Cocineros (al cierre)** → `registro.html` → Registran lo que se produjo

---

## ❗ Solución de Problemas

| Error | Causa probable | Solución |
|-------|----------------|----------|
| ER_ACCESS_DENIED_ERROR | Credenciales BD incorrectas | Verifica .env |
| ECONNREFUSED | MySQL no está corriendo | Inicia el servicio MySQL |
| Cannot find module | Paquetes no instalados | Ejecuta npm install |
| EADDRINUSE: port 3000 | Puerto ocupado | Cambia PORT=3001 en .env |
| KDS en blanco | Sin planificación hoy | Agrega ítems en Planificación |

---

## 🌐 Acceso desde Otros Dispositivos (Red Local)

Edita la última línea de `server.js`:

```js
app.listen(PORT, '0.0.0.0', () => { ... })
```

Luego accede desde otro equipo con: `http://IP-DEL-SERVIDOR:3000`

---

*Kitchen Manager v1.0 · Uso interno*
