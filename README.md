# 🍽️ Kitchen Manager v2

Sistema web interno para **gestión de producción de cocina**, **KDS (Kitchen Display System)** y **Reportes**, diseñado para múltiples centros de distribución con base de datos relacional avanzada.

---

## 📁 Estructura del Proyecto

```text
Productivity_TF/
├── server.js                 ← Backend principal (Node.js + Express)
├── ecosystem.config.js       ← Configuración de PM2 para el servidor de la empresa
├── package.json              ← Dependencias y scripts
├── .env.example / .env copy  ← Plantillas de variables de entorno
├── database2.sql             ← Script de creación de la base de datos v2
├── seed_v2.sql               ← Datos semilla para iniciar
├── migracion_v2.sql          ← Script para migrar datos de v1 a v2 (si aplica)
└── public/                   ← Frontend
    ├── index.html            ← Inicio centralizadoizado
    ├── planificacion2.html   ← Vista de Planificación del Jefe de Cocina
    ├── kds.html              ← KDS General
    ├── kds-frio.html         ← KDS Cuarto Frío
    ├── kds-caliente.html     ← KDS Cuarto Caliente
    ├── registro.html         ← Registro de producción real
    ├── informes.html         ← Dashboard y reportes
    └── admin.html            ← Panel de administración de Destinos y Productos
```

---

## 🛠️ Requisitos Previos

| Herramienta | Versión mínima | Descarga |
|-------------|---------------|----------|
| **Node.js** | 18 LTS        | https://nodejs.org |
| **MySQL**   | 8.0 / MariaDB 10.x | https://dev.mysql.com/downloads/ |
| **npm**     | 9.x           | Incluido con Node.js |
| **PM2**     | 5.x           | `npm install -g pm2` |

---

## 🚀 Paso a Paso: Iniciar en el Servidor de la Empresa

### 1️⃣ Descargar el Proyecto y Preparar Entorno
Clona el repositorio o copia la carpeta `Productivity_TF` al servidor.

### 2️⃣ Crear la Base de Datos
Abre tu cliente MySQL y ejecuta los archivos SQL en este orden:
1. `database2.sql` (Crea la estructura de `kitchen_db2`)
2. `seed_v2.sql` (Inserta productos base, cocineros y centros de distribución)

*(Nota: Si vienes de una base de datos antigua `kitchen_db`, puedes usar `migracion_v2.sql` en vez de `seed_v2.sql` para traer todo el histórico).*

### 3️⃣ Configurar Variables de Entorno (`.env`)
```bash
# Windows:
copy ".env copy" .env

# Mac / Linux:
cp ".env copy" .env
```
Edita `.env` con las credenciales del servidor y los nuevos parámetros de autenticación y base de datos:

```env
PORT=3000
HOST=0.0.0.0

# Base de datos
DB_HOST=192.168.0.96          # IP del servidor de base de datos
DB_USER=administrador
DB_PASSWORD=tu_contraseña
DB_NAME=kitchen_db            # BD antigua (si aplica)
DB2_NAME=kitchen_db2          # BD nueva
DB_PORT=3306

# Contraseñas de acceso
STAFF_PASSWORD=cocina2026
ADMIN_PASSWORD=admin2026
SESSION_SECRET=kitchen-manager-secret-key-change-this-2026
```

### 4️⃣ Instalar Dependencias
Abre una terminal en la carpeta del proyecto y ejecuta:
```bash
npm install
```

### 5️⃣ Iniciar el Servidor con PM2
Para mantener la aplicación corriendo siempre en segundo plano y reiniciar si falla:
```bash
# Iniciar usando el archivo de configuración
pm2 start ecosystem.config.js

# Guardar la lista de procesos actuales de pm2 para que arranquen con el sistema
pm2 save

# (Opcional) Configurar el inicio automático con Windows/Linux
# pm2 startup
```

Para ver el estado del servidor usa: `pm2 status`
O para ver registros en tiempo real: `pm2 logs`

*(Si prefieres modo desarrollo, ejecuta `npm run dev` o `node server.js`)*

---

## 🌐 Módulos Disponibles en Navegador

Para acceder desde las sucursales, entra al navegador e ingresa `http://IP-DEL-SERVIDOR:3000`:

| Vista | Ruta | Descripción |
|-------|------|-------------|
| 🏠 **Home** | `/` o `index.html` | Accesos directos a todos los módulos |
| 👨‍💼 **Planificación**| `/planificacion2.html` | Jefe de cocina: qué producir por centro |
| 📺 **KDS General** | `/kds.html` | Visualización en vivo (auto-refresca 30s) |
| ❄️ **KDS Frío** | `/kds-frio.html` | KDS exclusivo para Cuarto Frío |
| 🔥 **KDS Caliente**| `/kds-caliente.html` | KDS exclusivo para Cuarto Caliente |
| 🍳 **Registro** | `/registro.html` | Cocineros: registrar lo que produjeron |
| 📊 **Informes** | `/informes.html` | KPIs, control de mermas y envíos |
| ⚙️ **Admin** | `/admin.html` | (Nuevo) Gestionar centros de distribución |

---

## ❗ Solución de Problemas Frecuentes

| Error | Causa probable | Solución |
|-------|----------------|----------|
| **ER_ACCESS_DENIED_ERROR** | Credenciales de BD incorrectas en `.env` | Verifica usuario/contraseña |
| **ECONNREFUSED** | Base de datos apagada (MySQL) | Inicia el servicio MySQL en el servidor |
| **Cannot find module** | Paquetes no instalados | Detén PM2 y ejecuta `npm install` |
| **EADDRINUSE: port 3000** | El puerto ya está en uso por otro programa | Cambia PORT en `.env` y el ecosistema |

---
*Kitchen Manager v2.0 · Sistema Privado*
