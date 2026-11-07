/* Configuración completa: reglas, permisos, catálogos y datos. */
(function (g) {
  const { U, App: A, Motor: M, Catalogo: C } = g; const e = U.esc, Q = U.Q;
  const db = () => M.db;
  const general = A.vistas.config.html, accGeneral = A.vistas.config.acc;

  /* Lo que el dueño puede mover, y lo que la ley no deja apagar */
  const REGLAS = [
    { k: 'aprobarOC', t: 'Aprobar compras grandes', d: () => `Las órdenes desde ${Q(db().cfg.limiteAprobacion)} pasan por Dirección.` },
    { k: 'separarFunciones', t: 'Nadie aprueba lo suyo', d: () => 'Quien crea una orden o pide un ajuste no puede aprobarlo.' },
    { k: 'ajusteAprueba', t: 'Ajustes con aprobación', d: () => 'Un ajuste de inventario espera a que otra persona lo revise.' },
    { k: 'descuentoAut', t: 'Descuento social autorizado', d: () => 'Trabajo social o Dirección resuelven cada descuento.' },
    { k: 'retISR', t: 'Retener ISR a proveedores', d: () => '5 % y 7 % a quienes están en régimen opcional simplificado.' },
    { k: 'serviciosExentos', t: 'Servicios exentos de IVA', d: () => 'Por asistencia social. Confirmar el criterio con la SAT.' },
  ];
  const FIJAS = [
    ['No se vende ni se traslada lo vencido', 'Lo protege al paciente, y el lote solo sale con baja y acta.'],
    ['Controlados solo con receta', 'Decreto 48-92 y AG 712-99.'],
    ['No se vende lo que no hay', 'La existencia nunca queda en negativo.'],
    ['Sale primero lo que vence primero', 'El sistema elige el lote solo.'],
    ['Nada se borra', 'Cada error se corrige con otro movimiento, y queda en la bitácora.'],
  ];
  A.vistas.config.ruta = p => ({ reglas: 'Reglas', permisos: 'Permisos', seguridad: 'Seguridad', catalogos: 'Catálogos', datos: 'Datos' }[p[1]] || 'General');
  A.vistas.config.html = function (st, p) {
    const tab = p[1] || 'general';
    const tabs = U.tabs([['general', 'General'], ['reglas', 'Reglas'], ['permisos', 'Permisos'], ['seguridad', 'Seguridad'], ['catalogos', 'Catálogos'], ['datos', 'Datos']].map(([id, t]) => ({ id, t })), tab, 'config');
    if (tab === 'general') { const h = general(); return `${A.cab('Configuración', 'Se cambia solo con el botón Editar.', `<button class="btn pri" data-a="editar">${U.ic('pencil')}Editar</button>`)}${tabs}${h.slice(h.indexOf('<h2'))}`; }
    return { reglas, permisos, seguridad, catalogos, datos }[tab](st, tabs);
  };
  function reglas(st, tabs) {
    const c = db().cfg;
    return `${A.cab('Configuración', 'Decida cómo trabaja el hospital. Cada cambio queda en la bitácora.', `<button class="btn pri" data-a="reglasEd">${U.ic('pencil')}Editar reglas</button>`)}${tabs}
      <section class="seccion"><h2>Reglas que usted decide</h2><div class="pend">${REGLAS.map(r => `<div class="fila-pend"><span class="q">${e(r.t)}<span>${e(r.d())}</span></span>${c[r.k] ? U.et('Activa', 'bien') : U.et('Apagada')}</div>`).join('')}</div></section>
      <section class="seccion"><h2>Reglas fijas</h2><div class="pend">${FIJAS.map(([t, d]) => `<div class="fila-pend"><span class="q">${e(t)}<span>${e(d)}</span></span>${U.ic('lock')}</div>`).join('')}</div></section>`;
  }
  function permisos(st, tabs) {
    const k = st.rolP || 'farmacia', r = C.ROLES[k];
    return `${A.cab('Configuración', 'Elija un rol y vea qué puede hacer.', `<button class="btn pri" data-a="permEd" data-id="${k}">${U.ic('pencil')}Editar permisos</button>`)}${tabs}
      <div class="filtros">${U.chips(Object.entries(C.ROLES).map(([id, x]) => [id, x.nombre]), k, 'rolP')}</div>
      <div class="con-av" style="margin-bottom:12px">${Dibujo.avatar(k, 52)}<span class="mudo">${e(r.desc)}</span></div>
      <div class="fichas">${A.PERMISOS.map(([id, t]) => `<div class="fp perm ${r.acciones.includes(id) ? 'si' : ''}"><b>${e(t)}</b>${r.acciones.includes(id) ? U.et('Puede', 'bien') : U.et('No puede')}</div>`).join('')}</div>`;
  }
  function seguridad(st, tabs) {
    const hoy = A.hoy(), b = db().bitacora;
    return `${A.cab('Configuración', 'Cinco niveles de protección, uno sobre otro.')}${tabs}
      <div class="cifras"><div class="cifra"><span>Intentos detenidos hoy</span><b>${U.n(b.filter(x => !x.ok && x.ts >= hoy).length)}</b></div><div class="cifra"><span>Acciones registradas</span><b>${U.n(b.length)}</b></div><div class="cifra"><span>Usuarios activos</span><b>${U.n(db().usuarios.filter(u => u.activo).length)}</b></div></div>
      ${A.nivelesHtml()}
      <section class="seccion" style="margin-top:24px"><h2>Por área</h2><div class="fichas">${Object.entries(Dibujo.SEG).map(([k, [n, l]]) => `<div class="fp"><b>${e({ fx: 'Farmacia', bc: 'Bodega central', ad: 'Admisión y caja', em: 'Emergencia', ce: 'Consulta externa', lb: 'Laboratorio e imagen', qx: 'Quirófanos', en: 'Encamamiento' }[k])}</b><span>${e(l[0])}</span>${U.et(n, n === 'Máxima' ? 'alerta' : n === 'Alta' ? 'ambar' : '')}</div>`).join('')}</div></section>`;
  }
  function catalogos(st, tabs) {
    const q = U.norm(st.bs || ''), f = db().servicios.filter(s => !q || U.norm(s.nombre + s.cod + s.area).includes(q));
    return `${A.cab('Configuración', 'Servicios que se cargan a la cuenta del paciente. Productos y proveedores están en Inventario y Compras.', `<button class="btn pri" data-a="servNuevo">${U.ic('plus')}Nuevo servicio</button>`)}${tabs}
      <div class="filtros">${U.busca('bs', st.bs, 'Buscar servicio')}</div>
      ${U.tabla({ filas: f, pag: st.pag_t, vacioT: 'Sin servicios', cols: [{ t: 'Servicio', h: s => `${e(s.nombre)}<span class="t-sub">${e(s.cod)}</span>` }, { t: 'Área', h: s => e(s.area) }, { t: 'Precio', der: 1, h: s => Q(s.precio) }, { t: '', der: 1, h: s => U.lapiz('servEd', s.id) }] })}`;
  }
  function datos(st, tabs) {
    const real = M.modo === 'real', d = db();
    return `${A.cab('Configuración', 'Cómo se está usando el sistema ahora.')}${tabs}
      <section class="seccion"><h2>Forma de uso</h2><div class="fichas origen">
        <button class="fp ${real ? '' : 'si'}" data-a="modo" data-id="demo"><i class="mi">${U.ic('activity')}</i><b>Demo con datos de ejemplo</b><span>Dos meses de operación inventada. Vuelve a empezar cada día.</span>${real ? '' : U.et('En uso', 'bien')}</button>
        <button class="fp ${real ? 'si' : ''}" data-a="modo" data-id="real"><i class="mi">${U.ic('building-2')}</i><b>Sistema en blanco</b><span>Sin datos: se cargan sus productos, proveedores y usuarios, y se quedan guardados.</span>${real ? U.et('En uso', 'bien') : ''}</button>
      </div></section>
      ${real ? `<div class="nota">${U.ic('info')}<span>Por ahora sus datos viven en este navegador. Descargue respaldos: al conectar el servidor en la nube se comparten entre dispositivos.</span></div>` : ''}
      <section class="seccion"><h2>Respaldo</h2><div class="cifras"><div class="cifra"><span>Productos</span><b>${U.n(d.productos.length)}</b></div><div class="cifra"><span>Proveedores</span><b>${U.n(d.proveedores.length)}</b></div><div class="cifra"><span>Usuarios</span><b>${U.n(d.usuarios.length)}</b></div></div>
      <div class="acciones"><button class="btn" data-a="respaldo">${U.ic('download')}Descargar respaldo</button><label class="btn">Restaurar respaldo<input type="file" id="resp" accept=".json" hidden></label><button class="btn" data-a="reiniciar">${U.ic('refresh-cw')}${real ? 'Borrar todo' : 'Reiniciar el demo'}</button></div></section>`;
  }
  A.vistas.config.despues = function (el) {
    const f = el.querySelector('#resp'); if (!f) return;
    f.addEventListener('change', async () => { const a = f.files[0]; if (!a) return; if (!await U.confirmar({ titulo: 'Restaurar respaldo', texto: 'Reemplaza lo que hay ahora en este navegador.', si: 'Restaurar', peligro: true })) return; try { await M.importar(JSON.parse(await a.text())); } catch (err) { U.aviso(err.message || 'No se pudo leer el archivo.', 'mal'); } });
  };
  Object.assign(accGeneral, {
    rolP(id) { A.st.config.rolP = id; A.repintar(); },
    reglasEd() {
      const c = db().cfg;
      const h = U.hoja({
        titulo: 'Editar reglas', ancho: 560,
        cuerpo: `${REGLAS.map(r => `<label class="peq regla"><input type="checkbox" data-k="${r.k}" ${c[r.k] ? 'checked' : ''}><span><b>${e(r.t)}</b>${e(r.d())}</span></label>`).join('')}<div class="rejilla"><div class="campo"><label for="li">Aprobar compras desde</label><input id="li" type="number" step="0.01" value="${c.limiteAprobacion.toFixed(2)}"></div><div class="campo"><label for="dv">Avisar vencimiento, días antes</label><input id="dv" type="number" value="${c.diasVence}"></div></div>`,
        pie: `<button class="btn" data-cerrar>Cancelar</button><button class="btn pri" data-a="ok">Guardar</button>`,
        acciones: { async ok() { const d = { limiteAprobacion: +h.cuerpo.querySelector('#li').value, diasVence: +h.cuerpo.querySelector('#dv').value }; h.cuerpo.querySelectorAll('[data-k]').forEach(i => { d[i.dataset.k] = i.checked; }); const r = await U.hacer('config.guardar', d, 'Reglas guardadas.'); if (r.ok) h.cerrar(); } },
      });
    },
    permEd(k) {
      const r = C.ROLES[k];
      const h = U.hoja({
        titulo: `Permisos de ${r.nombre}`, ancho: 620,
        cuerpo: `<div class="fichas">${A.PERMISOS.map(([id, t]) => `<label class="fp perm"><span><input type="checkbox" data-p="${id}" ${r.acciones.includes(id) ? 'checked' : ''}> <b>${e(t)}</b></span></label>`).join('')}</div>`,
        pie: `<button class="btn" data-cerrar>Cancelar</button><button class="btn pri" data-a="ok">Guardar</button>`,
        acciones: { async ok() { const fuera = r.acciones.filter(a => !A.PERMISOS.some(p => p[0] === a)); const si = [...h.cuerpo.querySelectorAll('[data-p]:checked')].map(i => i.dataset.p); const x = await U.hacer('rol.permisos', { rol: k, acciones: [...fuera, ...si] }, 'Permisos guardados.'); if (x.ok) h.cerrar(); } },
      });
    },
    servNuevo() { formServ(); }, servEd(id) { formServ(db().ix.serv.get(id)); },
    async modo(m) {
      if (m === M.modo) return;
      const ok = await U.confirmar({ titulo: m === 'real' ? 'Pasar a sistema en blanco' : 'Volver al demo', texto: m === 'real' ? 'Sale de los datos de ejemplo. Lo que cargue queda guardado aparte, y puede volver al demo cuando quiera.' : 'Sus datos no se borran: quedan guardados para cuando vuelva.', si: 'Cambiar' });
      if (ok) M.cambiarModo(m);
    },
    async respaldo() { const o = await M.exportar(); const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(o)], { type: 'application/json' })); a.download = `respaldo-hospital-${U.iso(Date.now())}.json`; a.click(); U.aviso(`Respaldo descargado: ${U.n(o.ops.length)} operaciones.`); },
  });
  accGeneral.reiniciar = async function () { const real = M.modo === 'real'; if (await U.confirmar({ titulo: real ? 'Borrar todo' : 'Reiniciar el demo', texto: real ? 'Se pierde todo lo cargado en este navegador. Descargue antes un respaldo.' : 'Se pierde lo hecho durante la demostración.', si: real ? 'Borrar todo' : 'Reiniciar', peligro: true })) M.reiniciar(); };
  function formServ(s) {
    const v = s || { area: 'Consulta externa', precio: 0 }, areas = [...new Set(db().servicios.map(x => x.area))];
    const h = U.hoja({ titulo: s ? 'Editar servicio' : 'Nuevo servicio', ancho: 460, cuerpo: `<div class="campo"><label for="n">Nombre</label><input id="n" type="text" value="${e(v.nombre || '')}"></div><div class="rejilla"><div class="campo"><label for="a">Área</label><select id="a">${areas.map(x => `<option ${x === v.area ? 'selected' : ''}>${e(x)}</option>`).join('')}</select></div><div class="campo"><label for="p">Precio</label><input id="p" type="number" step="0.01" value="${(+v.precio).toFixed(2)}"></div></div>`, pie: `<button class="btn" data-cerrar>Cancelar</button><button class="btn pri" data-a="ok">Guardar</button>`, acciones: { async ok() { const q = x => h.cuerpo.querySelector(x).value; const d = { nombre: q('#n').trim(), area: q('#a'), precio: +q('#p') }; if (s) d.id = s.id; const r = await U.hacer('servicio.guardar', d, 'Servicio guardado.'); if (r.ok) h.cerrar(); } } });
  }
})(window);
