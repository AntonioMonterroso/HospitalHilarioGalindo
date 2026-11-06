/* Marco de la aplicación: entrada, menú por rol, rutas y actualización en vivo. */
(function (g) {
  const { U, Catalogo: C, Motor: M } = g; const e = U.esc;
  const A = { vistas: {}, st: {} };
  g.App = A;
  const params = new URLSearchParams(location.search);
  A.enMarco = params.get('marco') === '1';

  A.MENU = {
    inicio: ['Inicio', 'house'], admision: ['Admisión', 'user-round'], cuentas: ['Cuentas', 'receipt'], caja: ['Caja', 'wallet'], farmacia: ['Farmacia', 'pill'], sala: ['Sala', 'stethoscope'],
    inventario: ['Inventario', 'boxes'], compras: ['Compras', 'shopping-cart'], social: ['Trabajo social', 'heart-handshake'], ley: ['Contabilidad y ley', 'book-open-check'], reportes: ['Reportes', 'chart-column'], bitacora: ['Bitácora', 'scroll-text'], usuarios: ['Usuarios', 'users'], config: ['Configuración', 'settings'],
  };
  A.rol = () => C.ROLES[M.sesion.rol];
  A.puede = a => A.rol().acciones.includes(a);
  A.hoy = () => M.finDia(Date.now());
  A.turno = () => M.db.turnos.find(t => t.us === M.sesion.id && t.estado === 'abierto');

  /* Cuántas cosas esperan a este rol, para el menú */
  A.pendientes = function () {
    const db = M.db, r = M.sesion.rol, o = {};
    const ped = db.pedidos.filter(p => p.estado === 'pendiente').length;
    if (r === 'farmacia') o.farmacia = ped;
    const desc = db.cuentas.filter(c => c.desc && c.desc.estado === 'pendiente' && !c.dte).length;
    if (r === 'social' || r === 'direccion') o.social = desc;
    if (r === 'direccion' || r === 'compras' || r === 'bodega' || r === 'contabilidad') {
      const n = db.ocs.filter(x => r === 'direccion' ? x.estado === 'por aprobar' : r === 'bodega' ? ['aprobada', 'parcial'].includes(x.estado) : false).length + (r === 'compras' ? db.solicitudes.filter(s => s.estado === 'pendiente').length : 0);
      if (n) o.compras = n;
    }
    if (r === 'bodega') o.inventario = db.traslados.filter(t => t.estado === 'solicitado').length;
    return o;
  };

  function entrar(u) {
    M.sesion = u;
    try { sessionStorage.setItem('hhg.u', u.id); } catch (err) { }
    pintarMarco();
    const v = location.hash.replace('#/', '').split('/')[0];
    if (!A.rol().vistas.includes(v) && v !== 'dispositivos') location.hash = '#/inicio'; else ruta();
  }
  A.salir = function () {
    try { sessionStorage.removeItem('hhg.u'); } catch (err) { }
    M.sesion = null; location.hash = ''; pantallaEntrada();
  };

  function pantallaEntrada() {
    document.getElementById('raiz').innerHTML = `<main class="entrada">
      <section class="entrada-izq"><div><span class="peq">${e(C.HOSPITAL.lugar)}</span><h1>Hospital<br>Hilario Galindo</h1><p>Inventario, compras y ventas en un solo registro, para todo el hospital y desde cualquier dispositivo.</p></div>
      <p class="pie">Demostración con datos de ejemplo. Ningún paciente, proveedor ni documento es real.</p></section>
      <section class="entrada-der"><h2>¿Quién entra?</h2><p class="mudo">Cada rol ve solo lo suyo. Elija uno para recorrer el sistema.</p>
      <div class="personas">${M.db.usuarios.map(u => `<button class="persona" data-u="${u.id}"><b>${e(u.nombre)}</b><span>${e(C.ROLES[u.rol].nombre)} · ${e(u.disp.split(' · ')[0])}</span></button>`).join('')}</div>
      <p class="peq mudo" style="margin-top:24px"><a href="propuesta.html">Ver la propuesta y los precios</a></p></section></main>`;
    document.querySelectorAll('.persona').forEach(b => b.onclick = () => pedirPin(M.db.ix.usr.get(b.dataset.u)));
  }
  function pedirPin(u) {
    const h = U.hoja({
      titulo: u.nombre, sub: C.ROLES[u.rol].desc, dialogo: true,
      cuerpo: `<div class="campo"><label for="pin">PIN</label><input id="pin" type="password" inputmode="numeric" maxlength="4" value="${e(u.pin)}"><span class="ayuda">PIN de demostración: ${e(u.pin)}</span></div>`,
      pie: `<button class="btn pri" data-a="ok">Entrar</button>`,
      acciones: { ok() { if (h.cuerpo.querySelector('#pin').value !== u.pin) return U.aviso('PIN incorrecto.', 'mal'); h.cerrar(); entrar(u); } },
    });
    h.cuerpo.querySelector('#pin').addEventListener('keydown', ev => { if (ev.key === 'Enter') h.acciones.ok(); });
  }

  function pintarMarco() {
    const u = M.sesion, rol = A.rol();
    const banda = A.enMarco ? '' : `<div class="banda"><span>Demostración · datos de ejemplo · documentos sin validez fiscal</span><span class="acciones solo-grande"><a href="#/dispositivos">Ver varios dispositivos a la vez</a><a href="propuesta.html">Propuesta y precios</a></span></div>`;
    document.getElementById('raiz').innerHTML = `${banda}<div class="app"><aside class="lateral"><div class="marca"><b>Hilario Galindo</b><span>Patronato Pro-Salud</span></div><nav class="menu" id="menu" aria-label="Principal"></nav>
      <div class="quien"><b>${e(u.nombre)}</b><span>${e(rol.nombre)}</span><button data-a="salir">${U.ic('log-out')}<span>Cambiar de rol</span></button></div></aside>
      <div class="central"><header class="tope"><div class="ruta" id="ruta"></div>
        <div class="buscar-global">${U.ic('search')}<input type="search" id="global" placeholder="Paciente, producto, cuenta, factura" aria-label="Buscar en todo el sistema"></div>
        <span class="pulso" id="pulso"><i></i><span>En línea</span></span></header>
      <main class="vista" id="vista"></main></div></div><nav class="barra-movil" id="barra" aria-label="Principal"></nav>`;
    pintarMenu();
    document.getElementById('global').addEventListener('focus', A.buscarGlobal);
  }
  function pintarMenu() {
    const v = location.hash.replace('#/', '').split('/')[0] || 'inicio', p = A.pendientes(), vs = A.rol().vistas;
    const item = id => { const [t, i] = A.MENU[id]; return `<a href="#/${id}" ${id === v ? 'aria-current="page"' : ''}>${U.ic(i)}<span>${e(t)}</span>${p[id] ? `<span class="cuenta">${p[id]}</span>` : ''}</a>`; };
    const menu = document.getElementById('menu'); if (menu) menu.innerHTML = vs.map(item).join('');
    const b = document.getElementById('barra');
    if (b) {
      const pri = vs.slice(0, vs.length > 5 ? 4 : 5);
      b.innerHTML = pri.map(id => { const [t, i] = A.MENU[id]; return `<a href="#/${id}" ${id === v ? 'aria-current="page"' : ''}>${U.ic(i)}<span>${e(t.split(' ')[0])}</span>${p[id] ? `<span class="cuenta">${p[id]}</span>` : ''}</a>`; }).join('') + (vs.length > 5 ? `<button data-a="mas">${U.ic('ellipsis')}<span>Más</span></button>` : '');
    }
  }
  A.masMenu = function () {
    const vs = A.rol().vistas.slice(4);
    const h = U.hoja({ titulo: 'Más', cuerpo: `<div class="pend">${vs.map(id => `<a class="fila-pend" href="#/${id}" data-a="ir">${U.ic(A.MENU[id][1])}<span class="q">${e(A.MENU[id][0])}</span>${U.ic('chevron-right')}</a>`).join('')}<a class="fila-pend" href="#/dispositivos" data-a="ir">${U.ic('monitor')}<span class="q">Varios dispositivos a la vez</span>${U.ic('chevron-right')}</a><a class="fila-pend" href="propuesta.html">${U.ic('file-text')}<span class="q">Propuesta y precios</span>${U.ic('chevron-right')}</a></div><button class="btn" data-a="salir">${U.ic('log-out')}Cambiar de rol</button>`, acciones: { ir(_, b) { h.cerrar(); location.hash = b.getAttribute('href'); }, salir() { h.cerrar(); A.salir(); } } });
  };

  /* ---------- rutas ---------- */
  let actual = null;
  function ruta() {
    if (!M.sesion) return;
    const partes = location.hash.replace('#/', '').split('/'); const id = partes[0] || 'inicio';
    if (id === 'dispositivos') { location.href = 'dispositivos.html'; return; }
    const vista = A.vistas[id];
    if (!vista || !A.rol().vistas.includes(id)) { location.hash = '#/inicio'; return; }
    const cambia = !actual || actual.id !== id || actual.sub !== (partes[1] || '');
    actual = { id, sub: partes[1] || '', v: vista, partes };
    A.st[id] = A.st[id] || {};
    pintar(cambia);
    pintarMenu();
    document.getElementById('ruta').textContent = [A.MENU[id][0], vista.ruta ? vista.ruta(partes) : ''].filter(Boolean).join(' / ');
    if (cambia) { const m = document.getElementById('vista'); m.style.minHeight = ''; scrollTo(0, 0); }
  }
  function pintar(limpio) {
    const el = document.getElementById('vista'); if (!el || !actual) return;
    const y = scrollY, foco = document.activeElement, fid = foco && el.contains(foco) ? foco.id : null, sel = fid && foco.selectionStart;
    if (!limpio) el.style.minHeight = el.offsetHeight + 'px'; // la página no se sube al filtrar
    el.innerHTML = actual.v.html(A.st[actual.id], actual.partes);
    if (actual.v.despues) actual.v.despues(el, A.st[actual.id], actual.partes);
    if (!limpio) scrollTo(0, y);
    if (fid) { const n = document.getElementById(fid); if (n) { n.focus({ preventScroll: true }); if (sel != null && n.setSelectionRange && n.type !== 'number' && n.type !== 'date') try { n.setSelectionRange(sel, sel); } catch (x) { } } }
  }
  A.repintar = () => pintar(false);
  addEventListener('hashchange', ruta);

  /* Clics y filtros con un solo escuchador */
  document.addEventListener('click', ev => {
    const b = ev.target.closest('[data-a]'); if (!b || b.closest('.capa')) return;
    const a = b.dataset.a, id = b.dataset.id;
    if (a === 'salir') return A.salir();
    if (a === 'mas') return A.masMenu();
    if (a === 'pag') { const [n, p] = id.split('|'); A.st[actual.id]['pag_' + n] = +p; return A.repintar(); }
    const fn = actual && actual.v.acc && actual.v.acc[a];
    if (fn) { ev.preventDefault(); fn(id, b, ev); }
  });
  document.addEventListener('keydown', ev => { if (ev.key === 'Enter' && ev.target.matches('tr.clic')) ev.target.click(); });
  let tFiltro;
  document.addEventListener('input', ev => {
    const k = ev.target.dataset && ev.target.dataset.filtro; if (!k || !actual) return;
    const st = A.st[actual.id]; st[k] = ev.target.value;
    Object.keys(st).forEach(x => { if (x.startsWith('pag_')) st[x] = 0; });
    clearTimeout(tFiltro); tFiltro = setTimeout(A.repintar, ev.target.tagName === 'SELECT' ? 0 : 160);
  });

  /* ---------- búsqueda global ---------- */
  A.buscarGlobal = function (ev) {
    ev.target.blur();
    const h = U.hoja({ titulo: 'Buscar', sub: 'Pacientes, productos, cuentas y facturas', ancho: 620, cuerpo: `<div id="bg"></div>`, alAbrir(h) {
      const db = M.db, vs = A.rol().vistas;
      const s = U.selector(h.cuerpo.querySelector('#bg'), {
        ph: 'Nombre, DPI, NIT, código, número de cuenta o factura', alEnfocar: false, max: 40, buscar(q) {
          if (q.length < 2) return [];
          const r = [];
          if (vs.includes('admision') || vs.includes('cuentas')) for (const p of db.pacientes) { if (r.length > 12) break; if ((p._b || (p._b = U.norm(`${p.nombre} ${p.exp} ${p.dpi} ${p.nit} ${p.tel}`))).includes(q)) r.push({ txt: p.nombre, sub: `Paciente ${p.exp} · DPI ${p.dpi || '—'} · ${p.muni}`, t: 'p', id: p.id }); }
          if (vs.includes('inventario') || vs.includes('farmacia')) for (const p of db.productos) { if (r.length > 26) break; if (U.norm(p.nombre + ' ' + p.cod).includes(q)) r.push({ txt: p.nombre, sub: `Producto ${p.cod} · existencia ${U.n(p.qty)}`, t: 'i', id: p.id }); }
          if (vs.includes('cuentas')) {
            for (let i = db.cuentas.length - 1, n = 0; i >= 0 && n < 8; i--) if (U.norm(db.cuentas[i].num).includes(q)) { r.push({ txt: db.cuentas[i].num, sub: `Cuenta · ${db.ix.pac.get(db.cuentas[i].pac).nombre}`, t: 'c', id: db.cuentas[i].id }); n++; }
            for (let i = db.dtes.length - 1, n = 0; i >= 0 && n < 8; i--) { const d = db.dtes[i]; if ((d.serie + '-' + d.num).toLowerCase().includes(q) || d.uuid.toLowerCase().includes(q)) { r.push({ txt: `${d.tipo} ${d.serie}-${d.num}`, sub: `${d.nombre} · ${U.Q(d.total)}`, t: 'd', id: d.id }); n++; } }
          }
          return r;
        }, alElegir(x) {
          if (x.t === 'p') A.fichaPaciente(x.id);
          if (x.t === 'i') A.fichaProducto(x.id);
          if (x.t === 'c') { h.cerrar(); location.hash = '#/cuentas/' + x.id; }
          if (x.t === 'd') Docs.dte(x.id);
        },
      });
      s.input.focus({ preventScroll: true });
    } });
  };

  /* ---------- vivo ---------- */
  let tVivo; let vistos = 0;
  A.iniciarVivo = function () {
    M.alCambiar(hechos => {
      vistos += hechos.length;
      const p = document.getElementById('pulso');
      if (p) { p.classList.remove('late'); void p.offsetWidth; p.classList.add('late'); }
      clearTimeout(tVivo);
      tVivo = setTimeout(() => {
        if (!M.sesion) return;
        pintarMenu();
        A.repintar();
        U.pila.forEach(h => h.refrescar && h.refrescar());
      }, 300);
    });
  };

  A.arrancar = async function () {
    document.getElementById('raiz').innerHTML = `<div class="vacio" style="padding-top:30vh"><b>Cargando el hospital</b>Preparando dos meses de operación</div>`;
    await M.iniciar();
    A.iniciarVivo();
    const pedido = params.get('u'); let id = pedido;
    if (!id) try { id = sessionStorage.getItem('hhg.u'); } catch (err) { }
    const u = id && M.db.ix.usr.get(id);
    if (u) entrar(u); else pantallaEntrada();
  };
  document.addEventListener('DOMContentLoaded', A.arrancar);
})(window);
