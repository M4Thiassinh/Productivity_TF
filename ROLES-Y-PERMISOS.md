# 🔐 Sistema de Roles y Permisos - Kitchen Manager

## ✅ Cambios Realizados

### 1. **Login con Selector de Usuario**
- Ahora hay un desplegable (dropdown) en lugar de campo de texto
- Dos opciones:
  - 👨‍🍳 **Personal de Cocina** (Solo KDS)
  - 👨‍💼 **Administrador** (Acceso Total)

### 2. **Permisos por Rol**

#### 👨‍🍳 **PERSONAL** (Rol: `staff`)
**Puede acceder a:**
- ✅ KDS Cuarto Frío (`/kds-frio.html`)
- ✅ KDS Cuarto Caliente (`/kds-caliente.html`)
- ✅ KDS General (`/kds.html`)

**NO puede acceder a:**
- ❌ Planificación Diaria (`/planificacion.html`)
- ❌ Registro de Producción (`/registro.html`)
- ❌ Informes (`/informes.html`)
- ❌ Crear productos
- ❌ Modificar planificación
- ❌ Ver o modificar producción
- ❌ Descargar reportes Excel

#### 👨‍💼 **ADMINISTRADOR** (Rol: `admin`)
**Puede acceder a TODO:**
- ✅ Todas las páginas KDS
- ✅ Planificación Diaria
- ✅ Registro de Producción
- ✅ Informes y reportes Excel
- ✅ Todas las funciones de API

### 3. **Interfaz Adaptativa**

El **menú principal** (`index.html`) ahora:
- Muestra un indicador del tipo de usuario arriba
- **Personal** solo ve los 3 botones de KDS
- **Admin** ve los 5 botones (Planificación, Registro, KDS x3, Informes)
- Botones ocultos automáticamente según el rol

### 4. **Protección en Backend**

**Middleware de autorización:**
- `requireAuth` - Requiere estar logueado
- `requireAdmin` - Requiere ser administrador

**Rutas protegidas:**
```javascript
// SOLO ADMIN
/planificacion.html
/registro.html
/informes.html

/api/planificacion (POST)
/api/planificacion/batch
/api/produccion/*
/api/resumen_diario
/api/informes/excel
/api/productos (POST)

// TODOS LOS AUTENTICADOS
/kds.html
/kds-caliente.html
/kds-frio.html
/api/planificacion/kds (GET) - Para que personal pueda ver datos en KDS
/api/productos (GET)
/api/cocineros (GET)
```

### 5. **Página de Acceso Denegado**

Si el personal intenta acceder a páginas de admin:
- Muestra una página bonita con mensaje "🚫 Acceso Denegado"
- Botón para volver al inicio
- En API devuelve código 403 (Forbidden)

## 🔑 Credenciales

### Personal de Cocina
- **Usuario:** `personal`
- **Contraseña:** `cocina2026` (configurable en `.env`)
- **Acceso:** Solo KDS

### Administrador
- **Usuario:** `admin`
- **Contraseña:** `admin2026` (configurable en `.env`)
- **Acceso:** Total

## 🚀 Cómo Probar

### 1. Iniciar el servidor
```bash
cd c:\Users\matyr\Desktop\Productivity_TF
npm install
pm2 restart productivity-app
```

### 2. Probar como Personal
```
1. Ir a: http://localhost:3000/
2. Seleccionar: "👨‍🍳 Personal de Cocina"
3. Ingresar contraseña: cocina2026
4. Deberías ver SOLO los 3 botones de KDS
5. Intentar ir a /planificacion.html → Acceso Denegado
```

### 3. Probar como Admin
```
1. Cerrar sesión (botón "Cerrar Sesión")
2. Seleccionar: "👨‍💼 Administrador"
3. Ingresar contraseña: admin2026
4. Deberías ver TODOS los 5 botones
5. Puedes acceder a todas las páginas
```

## 📝 Archivos Modificados

| Archivo | Cambios |
|---------|---------|
| `server.js` | • Middleware `requireAdmin`<br>• Protección de rutas por rol<br>• Validación de permisos en API |
| `public/login.html` | • Selector dropdown de usuario<br>• Mensaje informativo sobre permisos |
| `public/index.html` | • Clase `admin-only` en botones<br>• Script para ocultar/mostrar según rol<br>• Indicador de tipo de usuario |

## 🔧 Configuración

Para cambiar contraseñas, edita `.env`:

```env
# Personal (solo KDS)
STAFF_PASSWORD=cocina2026

# Administrador (acceso total)  
ADMIN_PASSWORD=admin2026
```

Reinicia el servidor después de cambiar:
```bash
pm2 restart productivity-app
```

## 🎯 Flujo de Usuario

### Personal de Cocina:
```
Login (personal) → Menú (solo 3 KDS) → Ver pantallas KDS → Logout
```

### Administrador:
```
Login (admin) → Menú completo → Planificar → Registrar → Ver KDS → Informes → Logout
```

## 🛡️ Seguridad

- ✅ Validación en backend (no solo frontend)
- ✅ Todas las rutas protegidas con middleware
- ✅ Sesiones con expiración (24 horas)
- ✅ Redirección automática a login si no autenticado
- ✅ Mensajes claros de acceso denegado
- ✅ No se pueden bypassear permisos desde el navegador

## ❓ Preguntas Frecuentes

**¿Puede el personal ver la planificación?**
No, solo puede ver las pantallas KDS con los productos a producir.

**¿El personal puede modificar algo?**
No, solo puede visualizar las pantallas KDS. No tiene acceso a formularios.

**¿Cómo agregar más usuarios?**
Actualmente hay 2 roles fijos. Para agregar más usuarios individuales, necesitarías:
1. Crear una tabla de usuarios en la base de datos
2. Modificar el sistema de login para consultar la BD
3. Implementar registro de usuarios

**¿Los datos en KDS se actualizan automáticamente?**
Sí, las páginas KDS hacen refresh automático cada 30 segundos.

---

**Versión:** 2.2 con Control de Acceso por Roles
**Fecha:** Abril 2024
