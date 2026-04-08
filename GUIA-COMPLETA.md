# 🍽️ Kitchen Manager - Guía Completa de Autenticación

Sistema de gestión de cocina con control de acceso por roles.

---

## 📋 Tabla de Contenidos
- [Inicio Rápido](#inicio-rápido)
- [Sistema de Roles](#sistema-de-roles)
- [Credenciales](#credenciales)
- [Instalación](#instalación)
- [Acceso desde Otros Dispositivos](#acceso-desde-otros-dispositivos)
- [Solución de Problemas](#solución-de-problemas)

---

## 🚀 Inicio Rápido

### Opción 1: Usar Script (Más Fácil)
```bash
# Ejecuta el archivo:
iniciar-con-pm2.bat
```

### Opción 2: Comandos Manuales
```bash
# 1. Instalar dependencias
npm install

# 2. Iniciar con PM2
pm2 start ecosystem.config.js

# 3. Ver estado
pm2 list
```

### Acceder a la Aplicación
```
http://localhost:3000/
```

---

## 👥 Sistema de Roles

### 👨‍🍳 Personal de Cocina (Staff)

**Contraseña:** `cocina2026` (configurable en `.env`)

**Permisos:**
- ✅ Ver pantallas KDS (Kitchen Display System)
  - KDS Cuarto Frío
  - KDS Cuarto Caliente
  - KDS General
- ❌ NO puede planificar
- ❌ NO puede registrar producción
- ❌ NO puede ver informes

**Páginas Accesibles:**
- `/kds.html`
- `/kds-frio.html`
- `/kds-caliente.html`

### 👨‍💼 Administrador (Admin)

**Contraseña:** `admin2026` (configurable en `.env`)

**Permisos:**
- ✅ Acceso total a todas las funciones
- ✅ Planificación diaria
- ✅ Registro de producción
- ✅ Pantallas KDS
- ✅ Informes y reportes Excel

**Páginas Accesibles:**
- Todas las anteriores +
- `/planificacion.html`
- `/registro.html`
- `/informes.html`

---

## 🔑 Credenciales

### Configuración Actual (`.env`)

```env
# Personal (solo KDS)
STAFF_PASSWORD=cocina2026

# Administrador (acceso total)
ADMIN_PASSWORD=admin2026

# Clave de sesión (cámbiala por seguridad)
SESSION_SECRET=kitchen-manager-secret-key-change-this-2026
```

### Cambiar Contraseñas

1. Abre el archivo `.env` con Notepad
2. Modifica las contraseñas:
   ```env
   STAFF_PASSWORD=tu_nueva_contraseña
   ADMIN_PASSWORD=otra_contraseña_segura
   ```
3. Guarda el archivo
4. Reinicia el servidor:
   ```bash
   pm2 restart productivity-app
   ```

---

## 📦 Instalación Completa

### Requisitos
- Node.js (versión 14 o superior)
- npm (incluido con Node.js)
- PM2 (se instalará automáticamente)
- MySQL/MariaDB

### Pasos

1. **Clonar o descargar el proyecto**
   ```bash
   cd c:\Users\matyr\Desktop\Productivity_TF
   ```

2. **Instalar dependencias**
   ```bash
   npm install
   ```

3. **Configurar variables de entorno**
   - Edita el archivo `.env`
   - Configura las credenciales de MySQL
   - Establece las contraseñas de acceso

4. **Inicializar base de datos**
   - Importa `database.sql` en MySQL
   - Ejecuta las migraciones si existen

5. **Iniciar servidor**
   ```bash
   # Con PM2 (recomendado)
   pm2 start ecosystem.config.js
   
   # O modo normal
   npm start
   ```

---

## 🌐 Acceso desde Otros Dispositivos

### 1. Obtener tu IP Local

**Windows:**
```cmd
ipconfig
```
Busca "Dirección IPv4" (ejemplo: `192.168.1.100`)

### 2. Abrir Puerto en Firewall

Ejecuta como **Administrador** en CMD:
```cmd
netsh advfirewall firewall add rule name="Kitchen Manager - Puerto 3000" dir=in action=allow protocol=TCP localport=3000
```

### 3. Conectar desde Otro Dispositivo

Desde cualquier dispositivo en la **misma red WiFi**:
```
http://192.168.1.100:3000/
```
(Reemplaza `192.168.1.100` con tu IP real)

### 4. Login

Todos los dispositivos usan las mismas credenciales:
- **Personal:** cocina2026
- **Admin:** admin2026

---

## 🔧 Comandos Útiles de PM2

```bash
# Ver aplicaciones corriendo
pm2 list

# Ver logs en tiempo real
pm2 logs productivity-app

# Reiniciar aplicación
pm2 restart productivity-app

# Detener aplicación
pm2 stop productivity-app

# Eliminar de PM2
pm2 delete productivity-app

# Ver información detallada
pm2 show productivity-app

# Guardar configuración actual
pm2 save

# Auto-inicio en reinicio del sistema
pm2 startup
```

---

## ⚠️ Solución de Problemas

### No me redirige al login
**Solución:**
- Limpia las cookies del navegador
- Abre en modo incógnito
- Verifica que el servidor esté corriendo: `pm2 list`

### "Cannot find module 'express-session'"
**Solución:**
```bash
npm install
```

### La contraseña no funciona
**Solución:**
- Verifica el archivo `.env`
- Asegúrate de no tener espacios extra
- Reinicia el servidor: `pm2 restart productivity-app`

### Personal no ve productos en KDS
**Solución:**
1. Verifica que haya productos planificados para hoy
2. Revisa los logs:
   ```bash
   pm2 logs productivity-app
   ```
3. Deberías ver:
   ```
   ✅ Permitiendo acceso a KDS (todos los roles)
   ```

### No puedo acceder desde otro dispositivo
**Solución:**
- Verifica que estén en la misma red WiFi
- Confirma que el firewall permita el puerto 3000
- Usa la IP correcta (verifica con `ipconfig`)
- Asegúrate que el servidor esté escuchando en `0.0.0.0`

### El servidor se detiene al cerrar la terminal
**Solución:**
- Usa PM2 en lugar de `npm start`
- PM2 mantiene el servidor corriendo en segundo plano

---

## 📁 Estructura del Proyecto

```
Productivity_TF/
├── server.js                    # Servidor principal
├── package.json                 # Dependencias
├── ecosystem.config.js          # Configuración PM2
├── .env                         # Variables de entorno (contraseñas)
├── database.sql                 # Script de base de datos
├── public/                      # Frontend
│   ├── index.html              # Menú principal
│   ├── login.html              # Página de login
│   ├── planificacion.html      # Planificación (solo admin)
│   ├── registro.html           # Registro (solo admin)
│   ├── kds.html                # KDS general
│   ├── kds-frio.html           # KDS cuarto frío
│   ├── kds-caliente.html       # KDS cuarto caliente
│   └── informes.html           # Informes (solo admin)
├── iniciar-con-pm2.bat         # Script para iniciar
├── REINICIAR-Y-VER-LOGS.bat    # Script para debug
├── README.md                    # Documentación original
├── GUIA-COMPLETA.md            # Esta guía
└── ROLES-Y-PERMISOS.md         # Detalles de permisos
```

---

## 🔒 Seguridad

### Implementado
- ✅ Autenticación por sesión (24 horas)
- ✅ Control de acceso basado en roles
- ✅ Validación en backend (no bypasseable desde frontend)
- ✅ Contraseñas en variables de entorno (no en código)
- ✅ Páginas protegidas con redirección a login
- ✅ APIs protegidas con middleware

### Recomendaciones
- 🔐 Cambia las contraseñas por defecto
- 🔐 Cambia el `SESSION_SECRET` a algo aleatorio
- 🔐 Si usas HTTPS, activa `cookie.secure: true` en `server.js`
- 🔐 No compartas contraseñas en repositorios públicos
- 🔐 Considera implementar hash de contraseñas con bcrypt

---

## 📊 Flujo de Usuario

### Personal de Cocina
```
1. Abrir navegador → http://IP:3000/
2. Seleccionar "👨‍🍳 Personal de Cocina"
3. Ingresar contraseña: cocina2026
4. Ver menú con 3 botones KDS
5. Click en KDS deseado
6. Ver productos planificados del día
7. (Opcional) Cerrar sesión
```

### Administrador
```
1. Abrir navegador → http://IP:3000/
2. Seleccionar "👨‍💼 Administrador"
3. Ingresar contraseña: admin2026
4. Ver menú completo (5 botones)
5. Planificar → Registrar → Ver KDS → Generar Informes
6. (Opcional) Cerrar sesión
```

---

## 🎯 Permisos Detallados por Endpoint

| Endpoint | Método | Personal | Admin | Descripción |
|----------|--------|----------|-------|-------------|
| `/api/auth/login` | POST | ✅ | ✅ | Iniciar sesión |
| `/api/auth/logout` | POST | ✅ | ✅ | Cerrar sesión |
| `/api/productos` | GET | ✅ | ✅ | Lista productos |
| `/api/productos` | POST | ❌ | ✅ | Crear producto |
| `/api/cocineros` | GET | ✅ | ✅ | Lista cocineros |
| `/api/planificacion/kds` | GET | ✅ | ✅ | **Datos para KDS** |
| `/api/planificacion` | GET | ❌ | ✅ | Ver planificación |
| `/api/planificacion` | POST | ❌ | ✅ | Guardar planificación |
| `/api/produccion` | * | ❌ | ✅ | Gestionar producción |
| `/api/informes/excel` | GET | ❌ | ✅ | Descargar reporte |

---

## 📞 Soporte

Si tienes problemas:

1. **Revisa esta guía** - La mayoría de problemas están cubiertos
2. **Revisa los logs:**
   ```bash
   pm2 logs productivity-app --lines 100
   ```
3. **Consulta:** `ROLES-Y-PERMISOS.md` para detalles técnicos

---

## 📝 Changelog

### v2.2 - Sistema de Roles
- ✅ Login con selector de usuario
- ✅ Control de acceso por roles (Personal/Admin)
- ✅ Personal solo accede a KDS
- ✅ Menú adaptativo según rol
- ✅ Protección en backend con middleware
- ✅ Página de acceso denegado

### v2.1 - Autenticación Básica
- ✅ Sistema de login con contraseña
- ✅ Sesiones de 24 horas
- ✅ Protección de rutas

### v2.0 - Sistema Base
- ✅ Planificación diaria
- ✅ Registro de producción
- ✅ KDS en tiempo real
- ✅ Informes Excel

---

**Kitchen Manager v2.2**  
Sistema de Gestión de Producción de Cocina con Control de Acceso  
© 2024 - Uso Interno
