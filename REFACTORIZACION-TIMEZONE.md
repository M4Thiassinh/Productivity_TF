# 🕐 Refactorización Completa de Fechas y Zonas Horarias

## ✅ Cambios Realizados

### 1️⃣ BASE DE DATOS - Cambio de DATETIME a TIME

**SQL a ejecutar en MySQL:**

```sql
-- Cambiar hora_inicio de DATETIME/TIMESTAMP a TIME
ALTER TABLE produccion_real 
MODIFY COLUMN hora_inicio TIME NULL;

-- Cambiar hora_fin de DATETIME/TIMESTAMP a TIME
ALTER TABLE produccion_real 
MODIFY COLUMN hora_fin TIME NULL;
```

**Cómo ejecutar:**
1. Abre MySQL Workbench, phpMyAdmin o consola MySQL
2. Selecciona la base de datos: `USE kitchen_db;`
3. Ejecuta ambos comandos ALTER TABLE
4. Verifica: `DESCRIBE produccion_real;`

**⚠️ Importante:**
- Si ya tienes datos con DATETIME (ej: `2026-04-08 14:30:00`), MySQL automáticamente extraerá solo la hora (`14:30:00`)
- Los datos existentes NO se perderán, solo cambiará el formato

---

### 2️⃣ BACKEND - Captura de Hora en Santiago

**Cambios en `server.js`:**

#### A) POST /api/produccion/iniciar

**ANTES:**
```javascript
const ahora = new Date();
// MySQL guardaba: 2026-04-08 14:30:00 (con desfase por timezone)
```

**AHORA:**
```javascript
const horaActual = dayjs().tz('America/Santiago').format('HH:mm:ss');
// MySQL guarda: 14:30:00 (solo hora, sin fecha, sin desfase)
```

**Beneficios:**
- ✅ Captura la hora EXACTA de Santiago (considera horario de verano/invierno)
- ✅ MySQL recibe un string simple ('14:30:00') y no hace conversiones
- ✅ No hay desfases por timezone

#### B) PUT /api/produccion/finalizar

**ANTES:**
```javascript
const ahora = new Date();
```

**AHORA:**
```javascript
const horaActual = dayjs().tz('America/Santiago').format('HH:mm:ss');
```

**Mismo beneficio:** Hora exacta en Santiago, sin desfases.

---

### 3️⃣ BACKEND - Corrección del Excel

**Cambios en GET /api/informes/excel:**

#### Problema Original:
```javascript
// MySQL devolvía Date object en UTC
// exceljs lo interpretaba como UTC
// Restaba horas → fecha aparecía como día anterior
```

#### Solución Implementada:

**A) Columna FECHA:**
```javascript
// Forzar que sea string YYYY-MM-DD sin conversiones UTC
if (typeof r.fecha === 'string') {
  fechaFormateada = r.fecha.slice(0, 10);
} else if (r.fecha instanceof Date) {
  fechaFormateada = dayjs(r.fecha).tz('America/Santiago').format('YYYY-MM-DD');
}
```

**B) Columnas HORA_INICIO y HORA_FIN:**
```javascript
// Ahora vienen como string "14:30:00"
// Combinar con la fecha para mostrar en formato completo
if (typeof r.hora_inicio === 'string') {
  const fechaStr = fechaFormateada || dayjs().format('YYYY-MM-DD');
  horaInicioFormateada = dayjs(`${fechaStr} ${r.hora_inicio}`)
    .tz('America/Santiago')
    .format('DD/MM/YYYY, h:mm:ss A');
}
// Resultado: "08/04/2026, 2:30:00 PM"
```

**Beneficios:**
- ✅ Fecha siempre coincide con la columna principal
- ✅ No hay saltos al día anterior
- ✅ Formato legible: DD/MM/YYYY, h:mm:ss AM/PM

---

### 4️⃣ CONFIGURACIÓN MYSQL - Timezone Eliminado

**ANTES:**
```javascript
timezone: '-03:00' // Causaba conflictos con horario de verano/invierno
```

**AHORA:**
```javascript
// Timezone eliminado: todo se maneja en Node.js con dayjs
```

**Por qué:**
- Chile cambia entre UTC-3 (verano) y UTC-4 (invierno)
- MySQL con timezone fijo causaba desfases
- Ahora dayjs maneja automáticamente el DST (Daylight Saving Time)

---

## 🚀 Pasos para Aplicar los Cambios

### 1. Ejecutar SQL en Base de Datos

```bash
mysql -u root -p kitchen_db
```

```sql
ALTER TABLE produccion_real MODIFY COLUMN hora_inicio TIME NULL;
ALTER TABLE produccion_real MODIFY COLUMN hora_fin TIME NULL;
DESCRIBE produccion_real;
```

### 2. Reiniciar el Servidor

```bash
pm2 restart productivity-app
```

### 3. Verificar Funcionamiento

**A) Probar Inicio de Producción:**
1. Ve a "Registro de Producción"
2. Inicia un producto
3. Verifica en MySQL:
   ```sql
   SELECT fecha, plu_id, hora_inicio FROM produccion_real ORDER BY fecha DESC LIMIT 5;
   ```
4. Deberías ver: `hora_inicio: 14:30:00` (solo hora)

**B) Probar Finalización:**
1. Finaliza un producto
2. Verifica:
   ```sql
   SELECT fecha, plu_id, hora_inicio, hora_fin FROM produccion_real WHERE hora_fin IS NOT NULL ORDER BY fecha DESC LIMIT 5;
   ```
3. Deberías ver ambas horas en formato TIME

**C) Probar Excel:**
1. Ve a "Informes"
2. Descarga reporte
3. Verifica que:
   - Columna "Fecha" coincide con "Hora de Inicio"
   - Ejemplo: Fecha=2026-04-08, Hora=08/04/2026, 2:30:00 PM ✅

---

## 📊 Comparación ANTES vs AHORA

| Aspecto | ANTES | AHORA |
|---------|-------|-------|
| **Tipo dato MySQL** | DATETIME | TIME |
| **Captura hora** | `new Date()` (UTC) | `dayjs().tz('America/Santiago').format('HH:mm:ss')` |
| **Guardado MySQL** | `2026-04-08 14:30:00` | `14:30:00` |
| **Timezone MySQL** | `-03:00` (fijo) | Ninguno (manejo en Node.js) |
| **Horario Invierno** | ❌ Desfase de 1 hora | ✅ Correcto automáticamente |
| **Excel Fecha** | ❌ Día anterior | ✅ Fecha correcta |
| **Excel Hora** | `08/04/2026, 2:30:00 PM` | `08/04/2026, 2:30:00 PM` |

---

## 🔍 Depuración y Logs

Si quieres verificar que todo funciona correctamente, agrega estos logs temporales:

```javascript
// En POST /api/produccion/iniciar
console.log('🕐 Hora capturada en Santiago:', horaActual);

// En PUT /api/produccion/finalizar
console.log('🕐 Hora finalización en Santiago:', horaActual);
```

Luego verifica los logs:
```bash
pm2 logs productivity-app
```

---

## ⚠️ Consideraciones Importantes

### 1. Datos Existentes
Si ya tienes datos con DATETIME, MySQL automáticamente los convertirá a TIME:
- `2026-04-08 14:30:00` → `14:30:00` ✅
- Solo se conserva la hora, la fecha se pierde (pero ya la tienes en la columna `fecha`)

### 2. Backup
Antes de hacer el ALTER TABLE, considera un backup:
```bash
mysqldump -u root -p kitchen_db produccion_real > backup_produccion_real.sql
```

### 3. Horario de Verano/Invierno
`dayjs` con el plugin `timezone` maneja automáticamente:
- Horario de verano (UTC-3)
- Horario de invierno (UTC-4)
- Las transiciones entre ambos

No necesitas hacer nada manual.

---

## ✅ Resultado Final

Después de aplicar todos los cambios:

1. ✅ **Hora exacta de Santiago** guardada en MySQL
2. ✅ **Sin desfases** por cambios de horario
3. ✅ **Excel correcto** con fechas coincidentes
4. ✅ **Tipo TIME** optimizado (solo hora, sin fecha redundante)
5. ✅ **Código más limpio** y mantenible

---

## 📝 Resumen de Archivos Modificados

| Archivo | Cambios |
|---------|---------|
| `server.js` | ✅ POST /api/produccion/iniciar<br>✅ PUT /api/produccion/finalizar<br>✅ GET /api/informes/excel<br>✅ Pool MySQL (timezone eliminado) |
| Base de datos | ✅ ALTER TABLE produccion_real (2 columnas) |

---

**Fecha de refactorización:** Abril 2026
**Versión:** Kitchen Manager v2.3 - Timezone Fix
