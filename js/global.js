// ============================================================
// Stockia v5.2 — global.js
// Lógica compartida: auth, nav, modales, alertas, helpers.
// Requiere: js/config.js cargado antes.
// ============================================================

// ── Cliente Supabase (usa constantes de config.js) ────────
const { createClient } = supabase;
const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ── Estado de sesión (módulo) ─────────────────────────────
let _sesionActual = null;

// ── Año actual en footers ─────────────────────────────────
document.querySelectorAll('.anio-actual').forEach(el => {
  el.textContent = new Date().getFullYear();
});

// ── Contenedor de alertas toast ───────────────────────────
(function _initAlertContainer() {
  if (!document.getElementById('alertas-container')) {
    const el = document.createElement('div');
    el.id = 'alertas-container';
    document.body.appendChild(el);
  }
})();

// ════════════════════════════════════════════════════════════
// EMPRESA ACTIVA (sessionstorage — para super admin)
// ════════════════════════════════════════════════════════════

function guardarEmpresaActiva(empresa) {
  if (empresa) {
    sessionStorage.setItem('empresa_activa', JSON.stringify(empresa));
  } else {
    sessionStorage.removeItem('empresa_activa');
  }
}

function obtenerEmpresaActiva() {
  try {
    const raw = sessionStorage.getItem('empresa_activa');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

// ════════════════════════════════════════════════════════════
// AUTH — verificarSesion()
// Devuelve: { esAdminGlobal, empresa, perfil } o null
// ════════════════════════════════════════════════════════════

async function verificarSesion() {
  const { data: { session } } = await sb.auth.getSession();
  if (!session) {
    window.location.href = 'login.html';
    return null;
  }

  const userId = session.user.id;

  // ¿Admin global?
  const { data: adminGlobal } = await sb
    .from('global_admins')
    .select('*')
    .eq('id', userId)
    .eq('activo', true)
    .single();

  if (adminGlobal) {
    const empresa = obtenerEmpresaActiva();
    _rellenarInfoUsuario(adminGlobal.nombre, 'Super Admin');

    if (empresa) {
      _rellenarBadgeEmpresa(empresa);
    }

    _sesionActual = {
      esAdminGlobal: true,
      empresa,
      perfil: {
        id: userId,
        nombre: adminGlobal.nombre,
        email:  adminGlobal.email,
        rol:    'admin_global',
        activo: true,
        permisos_admin: { ver_config: true, crear_usuarios: true, hacer_backup: true },
      },
    };
    return _sesionActual;
  }

  // Usuario normal
  const { data: perfil } = await sb
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (!perfil || !perfil.activo) {
    await sb.auth.signOut();
    window.location.href = 'login.html';
    return null;
  }

  const { data: empresa } = await sb
    .from('empresas')
    .select('*')
    .eq('id', perfil.empresa_id)
    .single();

  if (!empresa || !empresa.activa) {
    await sb.auth.signOut();
    window.location.href = 'login.html';
    return null;
  }

  const rolLabel = perfil.rol === 'admin_empresa' ? 'Admin' : 'Operador';
  _rellenarInfoUsuario(perfil.nombre, rolLabel);
  _rellenarBadgeEmpresa(empresa);

  const menuEmpresaInfo = document.getElementById('menuEmpresaInfo');
  if (menuEmpresaInfo) {
    menuEmpresaInfo.style.display = 'flex';
    menuEmpresaInfo.textContent   = empresa.nombre;
  }

  _sesionActual = { esAdminGlobal: false, empresa, perfil };
  return _sesionActual;
}

function _rellenarInfoUsuario(nombre, rol) {
  const navNombre = document.getElementById('navNombre');
  if (navNombre) navNombre.textContent = nombre;
  const navRol = document.getElementById('navRol');
  if (navRol) navRol.textContent = rol;
  const menuUsuarioInfo = document.getElementById('menuUsuarioInfo');
  if (menuUsuarioInfo) menuUsuarioInfo.textContent = nombre + ' · ' + rol;
}

function _rellenarBadgeEmpresa(empresa) {
  const badge = document.getElementById('navEmpresaBadge');
  if (!badge) return;
  badge.style.display = 'flex';
  const dot    = badge.querySelector('.nav-empresa-dot');
  const nombre = badge.querySelector('.nav-empresa-nombre');
  if (dot)    dot.style.background = empresa.color || '#1a2f6b';
  if (nombre) nombre.textContent   = empresa.nombre;
}

// ════════════════════════════════════════════════════════════
// NAVEGACIÓN — construirNav()
// Llama después de verificarSesion(). Usa _sesionActual.
// ════════════════════════════════════════════════════════════

function construirNav() {
  if (!_sesionActual) return;

  const { esAdminGlobal, empresa, perfil } = _sesionActual;
  const modulos = empresa?.modulos_habilitados || {};
  const paginaActual = window.location.pathname.split('/').pop() || 'dashboard.html';

  const links = [];

  // Dashboard siempre visible
  links.push({ href: 'dashboard.html', icono: '🏠', label: 'Inicio' });

  // Módulos según habilitación
  if (modulos.articulos !== false) {
    const icono  = empresa?.modulo_articulos_icono  || '📦';
    const nombre = empresa?.modulo_articulos_nombre || 'Artículos';
    links.push({ href: 'articulos.html', icono, label: nombre });
    links.push({ href: 'etiquetas.html', icono: '🏷️', label: 'Etiquetas' });
  }
  if (modulos.clientes) {
    links.push({ href: 'clientes.html', icono: '👥', label: 'Clientes' });
  }
  if (modulos.ventas !== false) {
    links.push({ href: 'ventas.html', icono: '💰', label: 'Ventas' });
  }
  if (modulos.proveedores) {
    links.push({ href: 'proveedores.html', icono: '🏭', label: 'Proveedores' });
  }

  // Config (admin empresa con permiso, o admin global actuando como empresa)
  const puedeConfig = esAdminGlobal ||
    (perfil?.rol === 'admin_empresa' && perfil?.permisos_admin?.ver_config !== false);
  if (puedeConfig && empresa) {
    links.push({ href: 'admin-empresa.html', icono: '⚙️', label: 'Config' });
  }

  // Renderizar nav desktop
  const navLinks = document.getElementById('navLinks');
  if (navLinks) {
    navLinks.innerHTML = links.map(l => {
      const activo = paginaActual === l.href ? ' activo' : '';
      return `<li><a href="${l.href}" class="${activo}">${l.icono} ${l.label}</a></li>`;
    }).join('');
  }

  // Renderizar nav móvil
  const navMovilLinks = document.getElementById('navMovilLinks');
  if (navMovilLinks) {
    navMovilLinks.innerHTML = links.map(l => {
      const activo = paginaActual === l.href ? ' activo' : '';
      return `<a href="${l.href}" class="${activo}"><span class="icono">${l.icono}</span> ${l.label}</a>`;
    }).join('');
  }
}

// ════════════════════════════════════════════════════════════
// SESIÓN — cerrar
// ════════════════════════════════════════════════════════════

async function cerrarSesion() {
  guardarEmpresaActiva(null);
  await sb.auth.signOut();
  window.location.href = 'login.html';
}

// ════════════════════════════════════════════════════════════
// MENÚ MÓVIL
// ════════════════════════════════════════════════════════════

function toggleMenu() {
  const menu    = document.getElementById('navMenuMovil');
  const overlay = document.getElementById('navOverlay');
  const isOpen  = menu?.classList.toggle('abierto');
  overlay?.classList.toggle('activo', isOpen);
}

function cerrarMenu() {
  document.getElementById('navMenuMovil')?.classList.remove('abierto');
  document.getElementById('navOverlay')?.classList.remove('activo');
}

// Cerrar menú al hacer click en cualquier link del menú móvil
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('#navMenuMovil a').forEach(a =>
    a.addEventListener('click', cerrarMenu)
  );
});

// ════════════════════════════════════════════════════════════
// MODALES
// ════════════════════════════════════════════════════════════

function abrirModal(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.style.display = 'flex';
  document.body.style.overflow = 'hidden';
}

function cerrarModal(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.style.display = 'none';
  // Solo restaurar scroll si no hay otro modal abierto
  const hayModales = document.querySelectorAll('.modal-overlay[style*="flex"]');
  if (!hayModales.length) document.body.style.overflow = '';
}

// Cerrar modal al hacer click fuera
document.addEventListener('click', (e) => {
  if (e.target.classList.contains('modal-overlay')) {
    e.target.style.display = 'none';
    const hayModales = document.querySelectorAll('.modal-overlay[style*="flex"]');
    if (!hayModales.length) document.body.style.overflow = '';
  }
});

// Cerrar modal con Escape
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  const modales = document.querySelectorAll('.modal-overlay[style*="flex"]');
  if (modales.length) {
    modales[modales.length - 1].style.display = 'none';
    if (modales.length === 1) document.body.style.overflow = '';
  }
});

// ════════════════════════════════════════════════════════════
// ALERTAS TOAST
// ════════════════════════════════════════════════════════════

function mostrarAlerta(mensaje, tipo = 'info') {
  let container = document.getElementById('alertas-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'alertas-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `alerta-toast ${tipo}`;
  const iconos = { exito: '✅', error: '⚠️', info: 'ℹ️', warning: '⚠️' };
  toast.innerHTML = `${iconos[tipo] || ''} ${mensaje}`;
  container.appendChild(toast);

  // Auto-remover
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(20px)';
    toast.style.transition = 'opacity .3s, transform .3s';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// ════════════════════════════════════════════════════════════
// FORMATEO
// ════════════════════════════════════════════════════════════

function formatoPeso(valor) {
  const num = parseFloat(valor) || 0;
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}

function formatoFecha(fecha) {
  if (!fecha) return '-';
  try {
    const d = new Date(fecha);
    if (isNaN(d.getTime())) return fecha;
    return d.toLocaleDateString('es-AR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
    });
  } catch { return String(fecha); }
}

// ════════════════════════════════════════════════════════════
// TIPO DE NEGOCIO
// ════════════════════════════════════════════════════════════

function esKiosco() {
  const empresa = _sesionActual?.empresa || obtenerEmpresaActiva();
  return empresa?.tipo_negocio === 'kiosco_almacen';
}

// ════════════════════════════════════════════════════════════
// CÓDIGOS
// ════════════════════════════════════════════════════════════

async function siguienteCodigo(tipo, empresaId) {
  const rpcMap = {
    venta:     'siguiente_codigo_venta',
    cliente:   'siguiente_codigo_cliente',
    proveedor: 'siguiente_codigo_proveedor',
  };
  const fn = rpcMap[tipo];
  if (!fn) return '1';
  const { data } = await sb.rpc(fn, { p_empresa_id: empresaId });
  return data || '1';
}

async function codigoEsUnico(tabla, campo, valor, empresaId, excludeId = null) {
  if (!valor) return true;
  let q = sb.from(tabla).select('id').eq('empresa_id', empresaId).eq(campo, valor);
  if (excludeId) q = q.neq('id', excludeId);
  const { data } = await q.limit(1);
  return !data?.length;
}

// ════════════════════════════════════════════════════════════
// BACKUP Y EXPORT
// ════════════════════════════════════════════════════════════

async function exportarEmpresaJSON(empresaId, nombre) {
  mostrarAlerta('Generando backup...', 'info');
  try {
    const [arts, clts, vts, pvrs, cmprs, arqueos] = await Promise.all([
      sb.from('articulos').select('*').eq('empresa_id', empresaId),
      sb.from('clientes').select('*').eq('empresa_id', empresaId),
      sb.from('ventas').select('*').eq('empresa_id', empresaId),
      sb.from('proveedores').select('*').eq('empresa_id', empresaId),
      sb.from('compras').select('*').eq('empresa_id', empresaId),
      sb.from('arqueos').select('*').eq('empresa_id', empresaId),
    ]);

    const backup = {
      version:    '5.2',
      empresa_id: empresaId,
      exportado:  new Date().toISOString(),
      articulos:  arts.data || [],
      clientes:   clts.data || [],
      ventas:     vts.data  || [],
      proveedores:pvrs.data || [],
      compras:    cmprs.data|| [],
      arqueos:    arqueos.data || [],
    };

    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `stockia-backup-${nombre.toLowerCase().replace(/\s+/g,'-')}-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    mostrarAlerta('Backup descargado ✓', 'exito');
  } catch (err) {
    mostrarAlerta('Error al generar backup: ' + err.message, 'error');
  }
}

async function exportarEmpresaCSV(empresaId, nombre, tabla) {
  mostrarAlerta('Generando CSV...', 'info');
  try {
    const { data } = await sb.from(tabla).select('*').eq('empresa_id', empresaId);
    if (!data?.length) { mostrarAlerta('Sin datos para exportar', 'info'); return; }

    const cols = Object.keys(data[0]);
    const escape = (v) => {
      const s = v == null ? '' : String(v);
      return s.includes(',') || s.includes('"') || s.includes('\n')
        ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const csv = [
      cols.join(','),
      ...data.map(row => cols.map(c => escape(row[c])).join(',')),
    ].join('\n');

    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `stockia-${tabla}-${nombre.toLowerCase().replace(/\s+/g,'-')}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    mostrarAlerta('CSV descargado ✓', 'exito');
  } catch (err) {
    mostrarAlerta('Error: ' + err.message, 'error');
  }
}

async function importarBackupJSON(file, empresaId) {
  try {
    const text   = await file.text();
    const backup = JSON.parse(text);
    let importados = 0;

    const upsert = async (tabla, datos) => {
      if (!datos?.length) return;
      // Forzar empresa_id correcto
      const filas = datos.map(r => ({ ...r, empresa_id: empresaId }));
      const { error } = await sb.from(tabla).upsert(filas, { onConflict: 'id' });
      if (error) throw new Error(`${tabla}: ${error.message}`);
      importados += filas.length;
    };

    await upsert('articulos',   backup.articulos);
    await upsert('clientes',    backup.clientes);
    await upsert('ventas',      backup.ventas);
    await upsert('proveedores', backup.proveedores);
    await upsert('compras',     backup.compras);

    mostrarAlerta(`Backup importado: ${importados} registros ✓`, 'exito');
  } catch (err) {
    mostrarAlerta('Error al importar: ' + err.message, 'error');
  }
}
