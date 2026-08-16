# 📦 STOCKIA v5.2
### SaaS multi-empresa · Inventario · Ventas · Proveedores

---

## 📁 Estructura de archivos

```
stockia/
├── STOCKIA_SQL_COMPLETO_v52.sql  ← UN solo SQL para Supabase
├── index.html                    ← Landing page pública
├── login.html                    ← Inicio de sesión
├── recuperar.html                ← Solicitar recuperación de contraseña
├── nueva-password.html           ← Ingresar nueva contraseña
├── dashboard.html                ← Panel principal (3 layouts)
├── articulos.html                ← Gestión de artículos
├── clientes.html                 ← Gestión de clientes
├── ventas.html                   ← Ventas + Carrito + Arqueo + Resumen
├── proveedores.html              ← Gestión de proveedores
├── admin-empresa.html            ← Panel del admin de empresa
├── admin-global.html             ← Super panel
├── css/
│   └── global.css
└── js/
    ├── config.js                 ← ⚠️ Credenciales de Supabase (editar acá)
    ├── logo.js                   ← SVG logo centralizado
    └── global.js                 ← Lógica compartida
```

---

## 🚀 INSTALACIÓN DESDE CERO

### PASO 1 — Crear proyecto en Supabase

1. Ir a **supabase.com** → Sign in → New project
2. Completar:
   - **Name:** stockia (o el que quieras)
   - **Database Password:** guardala en un lugar seguro
   - **Region:** South America (São Paulo)
3. Clic en **Create new project** y esperar 1-2 minutos

---

### PASO 2 — Ejecutar el SQL

1. En el menú izquierdo de Supabase → **SQL Editor**
2. Clic en **New query**
3. Abrir `STOCKIA_SQL_COMPLETO_v52.sql`, copiar todo y pegarlo
4. Clic en **Run ▶**
5. Verificar que aparece: **"Success. No rows returned"**

> ⚠️ Si hay error, verificar que pegaste el contenido completo. El SQL es seguro de re-ejecutar.

---

### PASO 3 — Obtener credenciales de Supabase

1. En Supabase → **Settings** → **API**
2. Copiar:
   - **Project URL** → `https://XXXXXX.supabase.co`
   - **anon public key** → `eyJ...`

---

### PASO 4 — Configurar credenciales en el proyecto

Abrir `js/config.js` y reemplazar los valores:

```javascript
const SUPABASE_URL      = 'https://TU-PROYECTO.supabase.co';
const SUPABASE_ANON_KEY = 'eyJ...TU-KEY...';
```

> Este es el **único archivo** que hay que editar para cambiar credenciales. Todos los demás archivos lo importan automáticamente.

---

### PASO 5 — Desactivar confirmación de email

1. En Supabase → **Authentication** → **Settings**
2. Buscar **"Enable email confirmations"**
3. **Desactivarlo** (toggle en OFF)
4. Clic en **Save**

---

### PASO 6 — Crear el primer Super Admin

1. En Supabase → **Authentication** → **Users**
2. Clic en **"Add user"** → **"Create new user"**
3. Completar email y contraseña, activar **Auto Confirm User**
4. Clic en **Create user** y copiar el **UUID**
5. En **SQL Editor** → **New query**, ejecutar:

```sql
INSERT INTO public.global_admins (id, nombre, email)
VALUES ('PEGAR-UUID-AQUI', 'Tu Nombre', 'tu@email.com');
```

---

### PASO 7 — Configurar URL de recuperación de contraseña

1. En Supabase → **Authentication** → **URL Configuration**
2. En **Site URL** poner la URL de Cloudflare: `https://tu-sitio.pages.dev`
3. En **Redirect URLs** agregar: `https://tu-sitio.pages.dev/nueva-password.html`
4. Clic en **Save**

---

### PASO 8 — Subir a Cloudflare Pages

1. Ir a **dash.cloudflare.com** → **Pages**
2. Clic en **Create a project** → **Direct Upload**
3. Subir **todos los archivos** respetando la estructura de carpetas:
   ```
   /index.html, /login.html, /recuperar.html, /nueva-password.html
   /dashboard.html, /articulos.html, /clientes.html, /ventas.html
   /proveedores.html, /admin-empresa.html, /admin-global.html
   /css/global.css
   /js/config.js, /js/logo.js, /js/global.js
   /STOCKIA_SQL_COMPLETO_v52.sql (opcional, no afecta el sitio)
   ```
4. Clic en **Deploy site**

---

### PASO 9 — Primera entrada al sistema

1. Ir a `https://tu-sitio.pages.dev/login.html`
2. Ingresar con el email y contraseña del super admin
3. El sistema redirige automáticamente a `admin-global.html`

---

### PASO 10 — Crear primera empresa

1. En Super Admin → clic en **"➕ Nueva empresa"**
2. Completar nombre y slug
3. Guardar, luego clic en **"✏️ Editar"** para configurar:
   - **⚙️ General:** color, tipo de negocio, módulo de artículos
   - **🔌 Módulos:** artículos / clientes / ventas / proveedores
   - **📊 Funciones:** modo de ventas, resumen, arqueo de caja

---

### PASO 11 — Crear usuarios para la empresa

1. Clic en **"👥 Usuarios"** en la card de la empresa
2. Clic en **"+ Agregar usuario"**
3. Completar nombre, email, contraseña y rol (Admin o Operador)

---

## 📋 FUNCIONALIDADES

### 🌐 Super Admin (`admin-global.html`)
- Crear, editar, activar/desactivar empresas
- Ingresar como cualquier empresa para operar
- Backup JSON por empresa
- Gestión de usuarios con permisos granulares
- Mensajes del sistema: individual por empresa y globales

### 🏠 Dashboard — 3 layouts según `modo_ventas`
- **individual:** buscadores de artículos y clientes, últimas ventas
- **carrito:** ventas del día, desglose por forma de pago, arqueo
- **ambos:** métricas combinadas

### 💰 Ventas
- Modo individual: un artículo, formas de pago múltiples, cuotas mensuales
- Modo carrito: múltiples artículos, pago por ítem, devolución parcial
- Filas expandibles con detalle de ítems
- Resumen PDF/Excel por período
- Arqueo de caja con conteo de billetes

### 🗄️ Base de datos — 12 tablas

| Tabla | Descripción |
|---|---|
| `empresas` | Config + módulos + funciones |
| `global_admins` | Super administradores |
| `profiles` | Usuarios + permisos |
| `articulos` | Catálogo con stock mínimo |
| `clientes` | Con código único por empresa |
| `ventas` | Cabecera de venta |
| `pagos` | Log individual de cobros |
| `venta_items` | Ítems del carrito con cuotas |
| `proveedores` | Con código único |
| `compras` | Pedidos de compra |
| `arqueos` | Cierres de caja |
| `mensajes_sistema` | Mensajes individual + global |

---

## 📌 REGLAS IMPORTANTES

**Frontend:**
- `js/config.js` es el único archivo con credenciales — editar solo ahí
- `js/logo.js` inyecta el SVG del logo vía `data-logo="nav"` en los nav
- `js/global.js` maneja auth, nav, modales, alertas, exportaciones

**SQL:**
- Nunca usar `CREATE POLICY IF NOT EXISTS` → siempre `DROP IF EXISTS` + `CREATE`
- La `anon key` es pública por diseño — la seguridad real está en RLS

**JavaScript:**
- Siempre verificar balance de llaves `{}` en ventas.html — una extra rompe todo
- `exportarResumenPDF` es `async` — necesario porque carga ítems antes de dibujar

---

## 📈 HISTORIAL DE VERSIONES

| Versión | Cambios |
|---|---|
| v5.2 | `js/config.js` centralizado; `js/logo.js`; advisory lock en códigos; estado `anulado` en carritos; `marcar_mensaje_leido` segura; RLS mensajes sin UPDATE directo; session restore al crear usuarios; confirm en toggle usuarios; fix bug módulo artículos |
| v5.1 | Cuotas por ítem, recuperación de contraseña, landing page |
| v5.0 | Dashboard diferenciado por modo, arqueo con fondo inicial |
| v4.6 | Filas expandibles, PDF con ítems carrito |
| v4.5 | Mensajes sistema (individual + global) |
| v4.4 | Carrito multi-artículo, devolución parcial |
| v4.3 | Permisos granulares admin empresa |
| v4.2 | Resumen PDF/Excel, Arqueo de caja |
| v4.1 | Fecha editable, pagos individuales |
| v4.0 | Proveedores, códigos únicos |
| v3.0 | Multi-empresa, módulos, backup |

---

*Stockia v5.2 · Sistema de gestión SaaS multi-empresa*
