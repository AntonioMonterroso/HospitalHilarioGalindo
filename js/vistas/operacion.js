/* Atención al paciente: inicio, admisión, cuentas, caja, farmacia, sala y trabajo social. */
(function (g) {
  const { U, App: A, Motor: M, Catalogo: C, Docs } = g; const e = U.esc, Q = U.Q;
  const db = () => M.db;
  const cab = (t, p, acc = '') => `<div class="cabeza"><i class="tile">${U.ic((A.MENU[location.hash.replace('#/', '').split('/')[0]] || A.MENU.inicio)[1])}</i><div class="txt"><h1>${e(t)}</h1>${p ? `<p>${e(p)}</p>` : ''}</div>${acc ? `<div class="acciones">${acc}</div>` : ''}</div>`;
  A.cab = cab;
  const pacDe = c => db().ix.pac.get(c.pac);
  const desdeHoy = () => { const h = A.hoy(), a = db().dtes; let i = a.length; while (i > 0 && a[i - 1].f >= h) i--; return a.slice(i); };

  /* ---------- inicio ---------- */
  function pendientesRol() {
    const d = db(), r = M.sesion.rol, hoy = A.hoy(), out = [];
    const add = (n, t, s, ir, nivel = '') => { if (n > 0) out.push({ n, t, s, ir, nivel }); };
    const pedidos = d.pedidos.filter(p => p.estado === 'pendiente');
    const vencidos = d.lotes.filter(l => l.vence < hoy && Object.values(l.ex).some(n => n > 0));
    const porVencer = d.lotes.filter(l => l.vence >= hoy && l.vence < hoy + 30 * M.DIA && Object.values(l.ex).some(n => n > 0));
    const bajos = d.productos.filter(p => p.qty < p.min && p.activo);
    const porAprobar = d.ocs.filter(o => o.estado === 'por aprobar');
    const desc = d.cuentas.filter(c => c.desc && c.desc.estado === 'pendiente' && !c.dte);
    const ajustes = d.ajustes.filter(a => a.estado === 'pendiente');
    const cxpV = d.cxp.filter(x => x.estado === 'pendiente' && x.vence < hoy + 7 * M.DIA);
    const abiertas = d.cuentas.filter(c => c.estado === 'abierta' && c.total > 0);
    const dia = new Date().getDate();
    if (r === 'direccion') { add(porAprobar.length, 'Órdenes por aprobar', `Superan ${Q(d.cfg.limiteAprobacion)}`, '#/compras/ordenes', 'ambar'); add(ajustes.length, 'Ajustes de inventario por aprobar', 'Nadie aprueba lo que pidió', '#/inventario/ajustes', 'ambar'); add(desc.length, 'Descuentos sociales pendientes', 'Los resuelve Trabajo social o Dirección', '#/cuentas', 'ambar'); add(vencidos.length, 'Lotes vencidos con existencia', 'Hay que darlos de baja con acta', '#/inventario/vencimientos', 'alerta'); }
    if (r === 'farmacia') { add(pedidos.length, 'Pedidos de sala por despachar', pedidos.some(p => p.urgente) ? 'Hay al menos uno urgente' : 'En orden de llegada', '#/farmacia/pedidos', pedidos.some(p => p.urgente) ? 'alerta' : 'ambar'); add(d.traslados.filter(t => t.estado === 'en camino' && t.a === 'FX').length, 'Traslados por recibir', 'Vienen de Bodega central', '#/inventario/traslados'); add(vencidos.filter(l => l.ex.FX > 0).length, 'Lotes vencidos en farmacia', 'El sistema ya no los despacha', '#/inventario/vencimientos', 'alerta'); if (dia <= 10) add(1, 'Balance mensual de controlados', `Vence el día 10. Quedan ${10 - dia} días`, '#/farmacia/control', 'alerta'); }
    if (r === 'caja') { add(abiertas.length, 'Cuentas por cobrar hoy', 'Abiertas con cargos', '#/caja', 'ambar'); if (!A.turno()) add(1, 'Turno de caja sin abrir', 'Ábralo para poder cobrar', '#/caja', 'alerta'); }
    if (r === 'admision') { add(d.cuentas.filter(c => c.estado === 'abierta' && c.total === 0).length, 'Cuentas abiertas sin cargos', 'Revise si el paciente sigue en espera', '#/cuentas'); }
    if (r === 'enfermeria' || r === 'quirofano') { const a = r === 'quirofano' ? 'QX' : 'EN'; add(d.traslados.filter(t => t.estado === 'en camino' && t.a === a).length, 'Traslados por recibir', 'Confirme lo que llegó', '#/sala', 'ambar'); add(d.pedidos.filter(p => p.estado === 'pendiente' && p.us === M.sesion.id).length, 'Mis pedidos en farmacia', 'Se actualizan solos', '#/sala'); add(d.cuentas.filter(c => c.estado === 'abierta' && (r === 'quirofano' ? c.tipo === 'cirugia' : c.tipo === 'encamamiento')).length, 'Pacientes activos', r === 'quirofano' ? 'Cirugías de hoy' : 'En encamamiento', '#/sala'); }
    if (r === 'bodega') { add(d.traslados.filter(t => t.estado === 'solicitado').length, 'Traslados por enviar', 'Farmacia y salas esperan', '#/inventario/traslados', 'ambar'); add(d.ocs.filter(o => ['aprobada', 'parcial'].includes(o.estado)).length, 'Órdenes por recibir', 'Revise lote y vencimiento', '#/compras/recepcion', 'ambar'); add(porVencer.length, 'Lotes que vencen en 30 días', 'Conviene moverlos primero', '#/inventario/vencimientos', 'ambar'); add(vencidos.length, 'Lotes vencidos con existencia', 'Baja con acta', '#/inventario/vencimientos', 'alerta'); }
    if (r === 'compras') { add(d.solicitudes.filter(s => s.estado === 'pendiente').length, 'Solicitudes por atender', 'Vienen de las áreas', '#/compras/solicitudes', 'ambar'); add(bajos.length, 'Productos bajo el mínimo', 'Se pueden agregar a una orden', '#/inventario/existencias?bajo', 'alerta'); add(porAprobar.length, 'Órdenes esperando aprobación', 'Dirección las revisa', '#/compras/ordenes'); }
    if (r === 'contabilidad') { add(cxpV.length, 'Pagos que vencen esta semana', Q(cxpV.reduce((a, x) => a + x.aPagar, 0)), '#/compras/pagar', 'ambar'); add(ajustes.length, 'Ajustes por aprobar', 'Revise el motivo', '#/inventario/ajustes', 'ambar'); add(d.turnos.filter(t => t.estado === 'cerrado' && t.cierre.dif !== 0 && t.cierra > hoy - 7 * M.DIA).length, 'Cajas con diferencia en la semana', 'Faltantes o sobrantes', '#/ley/cajas'); }
    if (r === 'social') add(desc.length, 'Solicitudes de descuento', 'Pacientes esperando en caja', '#/social', 'alerta');
    if (r === 'auditoria') { add(d.bitacora.filter(b => !b.ok).length, 'Operaciones rechazadas hoy', 'Intentos que el sistema detuvo', '#/bitacora'); add(ajustes.length, 'Ajustes pendientes', 'Aún sin resolver', '#/inventario/ajustes'); }
    return out;
  }
  const vivoHtml = () => {
    const b = db().bitacora; const ult = b.slice(-7).reverse();
    return `<ul class="vivo" aria-live="off">${ult.map(x => { const d = (x.disp || '').split(' · '); return `<li class="${x.ok ? '' : 'mal'}" title="${e(x.disp || '')}">${A.av(x.u, 30)}<span>${e(x.txt)}<small>${e(A.nomU(x.u))} · ${e(d[0] || '')}</small></span><time>${U.hora(x.ts)}</time></li>`; }).join('')}</ul>`;
  };
  A.vivoHtml = vivoHtml; A.pendientesRol = pendientesRol; A.desdeHoy = desdeHoy;
  A.vistas.inicio = {
    html() {
      if (M.sesion.rol === 'direccion') return A.tablero();
      const d = db(), hoy = A.hoy(), r = M.sesion.rol, dtes = desdeHoy();
      const ing = dtes.filter(x => x.estado === 'vigente').reduce((a, x) => a + x.total, 0);
      const cuentasHoy = (() => { let n = 0; for (let i = d.cuentas.length - 1; i >= 0 && d.cuentas[i].abierta >= hoy; i--) n++; return n; })();
      const pend = pendientesRol();
      const valor = d.productos.reduce((a, p) => a + p.valor, 0);
      const pagar = d.cxp.filter(x => x.estado === 'pendiente').reduce((a, x) => a + x.aPagar, 0);
      const tu = A.turno(), cobrado = tu ? Object.values(tu.mov).reduce((a, b) => a + b, 0) : 0;
      const pendP = d.pedidos.filter(p => p.estado === 'pendiente').length, porCobrar = d.cuentas.filter(c => c.estado === 'abierta' && c.total > 0).length;
      const cifras = {
        contabilidad: [['Ingresos de hoy', Q(ing)], ['Por pagar', Q(pagar)], ['Inventario', Q(valor)]],
        auditoria: [['Ingresos de hoy', Q(ing)], ['Inventario', Q(valor)], ['Rechazadas hoy', U.n(d.bitacora.filter(b => !b.ok && b.ts >= hoy).length)]],
        farmacia: [['Pedidos en espera', U.n(pendP)], ['Cobrado en mi caja', Q(cobrado)]],
        caja: [['Por cobrar', U.n(porCobrar)], ['Cobrado en mi turno', Q(cobrado)]],
        bodega: [['Traslados por enviar', U.n(d.traslados.filter(t => t.estado === 'solicitado').length)], ['Órdenes por recibir', U.n(d.ocs.filter(o => ['aprobada', 'parcial'].includes(o.estado)).length)]],
        compras: [['Solicitudes', U.n(d.solicitudes.filter(x => x.estado === 'pendiente').length)], ['Bajo el mínimo', U.n(d.productos.filter(p => p.qty < p.min).length)]],
        admision: [['Pacientes hoy', U.n(cuentasHoy)], ['Cuentas abiertas', U.n(d.cuentas.filter(c => c.estado === 'abierta').length)]],
        enfermeria: [['Pacientes en sala', U.n(d.cuentas.filter(c => c.estado === 'abierta' && c.tipo === 'encamamiento').length)], ['Pedidos en espera', U.n(pendP)]],
        quirofano: [['Cirugías activas', U.n(d.cuentas.filter(c => c.estado === 'abierta' && c.tipo === 'cirugia').length)], ['Pedidos en espera', U.n(pendP)]],
        social: [['Por resolver', U.n(d.cuentas.filter(c => c.desc && c.desc.estado === 'pendiente' && !c.dte).length)]],
      }[r] || [];
      let graf = '';
      if (['direccion', 'contabilidad', 'auditoria'].includes(r)) {
        const dias = new Map(); for (let i = 29; i >= 0; i--) dias.set(hoy - i * M.DIA, 0);
        const desde = hoy - 29 * M.DIA;
        const areas = {};
        for (let i = d.dtes.length - 1; i >= 0; i--) { const x = d.dtes[i]; if (x.f < desde) break; if (x.estado === 'anulada') continue; const k = M.finDia(x.f); if (dias.has(k)) dias.set(k, dias.get(k) + x.total); areas[x.area] = (areas[x.area] || 0) + x.total; }
        const datos = [...dias].map(([k, v]) => { const f = new Date(k); return { v, t: U.fecha(k), c: `${f.getDate()}/${f.getMonth() + 1}`, hoy: k === hoy, fin: f.getDay() === 0 }; });
        const orden = Object.entries(areas).sort((a, b) => b[1] - a[1]); const max = orden[0] ? orden[0][1] : 1;
        graf = `<section class="seccion"><h2>Ingresos de los últimos 30 días</h2>${U.barras(datos, { alt: 'Ingresos por día de los últimos 30 días' })}</section>
          <section class="seccion"><h2>Por área</h2>${orden.map(([a, v]) => `<div class="area"><span>${e(a)}</span><span class="num">${Q(v)}</span><i><u style="width:${(v / max * 100).toFixed(1)}%"></u></i></div>`).join('')}</section>`;
      }
      return `${cab(M.sesion.nombre, `${new Date().getHours() < 12 ? 'Buenos días' : new Date().getHours() < 18 ? 'Buenas tardes' : 'Buenas noches'}. Hoy es ${U.fecha(Date.now())}.`).replace(/<i class="tile">.*?<\/i>/, Dibujo.avatar(M.sesion.rol, 56))}
        <div class="cifras">${cifras.map(([a, b]) => `<div class="cifra"><span>${e(a)}</span><b>${e(b)}</b></div>`).join('')}</div>
        <div class="dos"><div>
          <section class="seccion"><h2>Qué falta</h2>${pend.length ? `<div class="pend">${pend.map(p => `<a class="fila-pend ${p.nivel}" href="${p.ir}" style="--a:${A.hue(p.ir)}"><b>${U.n(p.n)}</b><span class="q">${e(p.t)}<span>${e(p.s)}</span></span>${U.ic('chevron-right')}</a>`).join('')}</div>` : `<div class="nota bien">${U.ic('circle-check')}<span>Todo al día en su área.</span></div>`}</section>
          ${graf}</div>
          <aside class="seccion"><h2>Movimiento en vivo</h2>${vivoHtml()}</aside></div>`;
    },
  };

  /* ---------- admisión ---------- */
  A.vistas.admision = {
    html(st) {
      const q = U.norm(st.bq || ''); let filas;
      if (q.length >= 2) { filas = db().pacientes.filter(p => (p._b || (p._b = U.norm(`${p.nombre} ${p.exp} ${p.dpi} ${p.nit} ${p.tel}`))).includes(q)); } else filas = db().pacientes.slice(-50).reverse();
      return `${cab('Admisión', `${U.n(db().pacientes.length)} expedientes. Busque antes de crear uno nuevo.`, A.puede('paciente') ? `<button class="btn pri" data-a="nuevo">${U.ic('plus')}Nuevo paciente</button>` : '')}
      <div class="filtros">${U.busca('bq', st.bq, 'Nombre, expediente, DPI, NIT o teléfono')}</div>
      ${U.tabla({ filas, pag: st.pag_t, clic: 'ficha', vacioT: 'Ningún paciente coincide', vacio: 'Revise la escritura o cree un expediente nuevo.', cols: [{ t: 'Paciente', h: p => `${e(p.nombre)}<span class="t-sub">${e(p.exp)}</span>` }, { t: 'DPI', h: p => e(p.dpi || '—') }, { t: 'NIT', h: p => e(p.nit) }, { t: 'Teléfono', h: p => e(p.tel || '—') }, { t: 'Municipio', h: p => e(p.muni || '—') }] })}`;
    },
    acc: { nuevo() { A.formPaciente(null, id => A.fichaPaciente(id)); }, ficha: id => A.fichaPaciente(id) },
  };

  /* ---------- cuentas ---------- */
  A.vistas.cuentas = {
    ruta: p => p[1] ? (db().ix.cuenta.get(p[1]) || {}).num : '',
    html(st, p) { return p[1] ? detalleCuenta(p[1]) : listaCuentas(st); },
    acc: {
      est(id) { A.st.cuentas.est = id; A.st.cuentas.pag_t = 0; A.repintar(); }, ver(id) { location.hash = '#/cuentas/' + id; },
      cargo(id) { armarCargo(id); }, dte: id => Docs.dte(id), cobrar: id => A.cobrar(id), desc: id => pedirDescuento(id), pac: id => A.fichaPaciente(id),
      async devolver(id) { if (await U.confirmar({ titulo: 'Devolver esta línea', texto: 'El producto regresa a su lote y la cuenta baja. Queda registrado quién lo hizo.', si: 'Devolver' })) U.hacer('cuenta.devolver', { cargo: id }, 'Línea devuelta.'); },
      resolver(id) { resolverDescuento(id); },
    },
  };
  function listaCuentas(st) {
    const q = U.norm(st.bc || ''), est = st.est || 'hoy', hoy = A.hoy();
    let filas = [];
    const cs = db().cuentas;
    for (let i = cs.length - 1; i >= 0; i--) {
      const c = cs[i];
      if (est === 'hoy' && c.abierta < hoy) break;
      if (est === 'abierta' && c.estado !== 'abierta') continue;
      if (est === 'por cobrar' && c.estado !== 'por cobrar') continue;
      if (q && !(c._b || (c._b = U.norm(c.num + ' ' + pacDe(c).nombre + ' ' + pacDe(c).exp))).includes(q)) continue;
      filas.push(c);
      if (filas.length >= 3000) break;
    }
    const nAb = cs.filter(c => c.estado === 'abierta').length;
    return `${cab('Cuentas de pacientes', 'Todo lo que un paciente consume queda en su cuenta hasta que Caja cobra.')}
      <div class="filtros">${U.busca('bc', st.bc, 'Número de cuenta, paciente o expediente')}${U.chips([['hoy', 'Hoy'], ['abierta', `Abiertas (${U.n(nAb)})`], ['por cobrar', 'Crédito'], ['todas', 'Todas']], est, 'est')}</div>
      ${U.tabla({ filas, pag: st.pag_t, clic: 'ver', vacioT: 'Sin cuentas aquí', vacio: 'Cambie el filtro o busque por paciente.', cols: [{ t: 'Cuenta', h: c => `${e(c.num)}<span class="t-sub">${e(pacDe(c).nombre)}</span>` }, { t: 'Atención', h: c => `${e(C.TIPOS_CUENTA[c.tipo].nombre)} · ${c.abierta >= A.hoy() ? U.hora(c.abierta) : U.fecha(c.abierta)}` }, { t: 'Estado', h: c => A.etEstado(c.estado) + (c.desc && c.desc.estado === 'pendiente' ? ' ' + U.et('Descuento', 'ambar') : '') }, { t: 'Total', der: 1, h: c => Q(c.total) }] })}`;
  }
  function detalleCuenta(id) {
    const c = db().ix.cuenta.get(id); if (!c) return cab('Cuenta no encontrada');
    const p = pacDe(c), lineas = db().ix.cargosDe.get(id), neto = M.netoCuenta(c), abierta = c.estado === 'abierta';
    const puedeCargar = abierta && (A.puede('cuenta.cargo.producto') || A.puede('cuenta.cargo.servicio'));
    const puedeCobrar = abierta && A.puede('cuenta.facturar') && c.total > 0;
    const pri = puedeCobrar ? `<button class="btn pri" data-a="cobrar" data-id="${id}">${U.ic('wallet')}Cobrar ${Q(neto)}</button>` : '';
    const sec = `${puedeCargar ? `<button class="btn ${pri ? '' : 'pri'}" data-a="cargo" data-id="${id}">${U.ic('plus')}Agregar cargo</button>` : ''}${abierta && !c.desc && A.puede('descuento.pedir') ? `<button class="btn" data-a="desc" data-id="${id}">Pedir descuento</button>` : ''}${c.dte ? `<button class="btn" data-a="dte" data-id="${c.dte}">${U.ic('eye')}Ver documento</button>` : ''}`;
    const dNota = c.desc && c.desc.estado === 'pendiente' ? `<div class="nota">${U.ic('clock')}<span style="flex:1">Descuento social de ${c.desc.pct} % esperando resolución. Motivo: ${e(c.desc.motivo)}.</span>${A.puede('descuento.resolver') ? `<button class="btn chico" data-a="resolver" data-id="${id}">Resolver</button>` : ''}</div>` : '';
    return `<p class="peq" style="margin-bottom:8px"><a href="#/cuentas">Cuentas</a></p>
      ${cab(c.num, '', sec + pri)}
      ${dNota}
      ${U.flujo(['Abierta', 'Con cargos', 'Cobrada'], c.estado === 'pagada' ? 3 : lineas.length ? 1 : 0)}
      <div class="ficha"><div><span>Paciente</span><b><a href="#" data-a="pac" data-id="${p.id}">${e(p.nombre)}</a></b></div><div><span>Expediente</span><b>${e(p.exp)}</b></div><div><span>Atención</span><b>${e(C.TIPOS_CUENTA[c.tipo].nombre)}${c.cama ? ' · ' + e(c.cama) : ''}</b></div><div><span>Médico</span><b>${e(c.medico || '—')}</b></div><div><span>Abierta</span><b>${U.fh(c.abierta)}</b></div><div><span>Estado</span><b>${A.etEstado(c.estado)}</b></div></div>
      ${U.tabla({ contar: false, por: 200, filas: lineas, vacioT: 'Cuenta sin cargos', vacio: 'Agregue el primer servicio o producto.', cols: [{ t: 'Detalle', h: k => `${e(k.nombre)}<span class="t-sub">${k.partes ? 'Lote ' + k.partes.map(x => e(db().ix.lote.get(x.lote).num)).join(', ') + ' · ' + e(M.nomBod(db(), k.bod)) : 'Servicio'}</span>` }, { t: 'Hora', h: k => U.hora(k.f) }, { t: 'Registró', h: k => e(A.nomU(k.us)) }, { t: 'Cant.', der: 1, h: k => U.n(k.cant) }, { t: 'Precio', der: 1, h: k => Q(k.precio) }, { t: 'Total', der: 1, h: k => Q(k.total) }, { t: '', der: 1, h: k => abierta && !k.rev && k.cant > 0 && (A.puede('cuenta.cargo.producto') || A.puede('cuenta.cargo.servicio')) ? `<button class="ojo" data-a="devolver" data-id="${k.id}" aria-label="Devolver línea" title="Devolver">${U.ic('undo-2')}</button>` : '' }] })}
      <div class="totales"><div><span>Subtotal</span><span>${Q(c.total)}</span></div>${c.desc && c.desc.estado === 'aprobado' ? `<div><span>Descuento social ${c.desc.pct} %</span><span>-${Q(c.total - neto)}</span></div>` : ''}<div class="gran"><span>Total</span><span>${Q(neto)}</span></div></div>`;
  }
  function armarCargo(id) {
    const c = db().ix.cuenta.get(id); const bods = db().bodegas.filter(b => b.tipo !== 'central');
    const pref = C.TIPOS_CUENTA[c.tipo].bod; const soloServ = !A.puede('cuenta.cargo.producto');
    A.lineas({
      titulo: 'Agregar cargo', sub: `${c.num} · ${pacDe(c).nombre}`, modo: 'cargo', conServicios: true, soloServicios: soloServ, ok: 'Cargar a la cuenta',
      arriba: soloServ ? '' : `<div class="campo"><label for="bd">Sale de</label><select id="bd">${bods.map(b => `<option value="${b.id}" ${b.id === pref ? 'selected' : ''}>${e(b.nombre)}</option>`).join('')}</select></div>`,
      bod: h => { const s = h.cuerpo.querySelector('#bd'); return s ? s.value : pref; },
      async alAceptar(items) { const r = await U.hacer('cuenta.cargo', { cuenta: id, items }, true); return r.ok; },
    });
  }
  function pedirDescuento(id) {
    const c = db().ix.cuenta.get(id);
    const h = U.hoja({ titulo: 'Pedir descuento social', sub: `${c.num} · ${Q(c.total)}`, ancho: 460, cuerpo: `<div class="campo"><label for="pc">Porcentaje sugerido</label><select id="pc">${[25, 50, 75, 100].map(n => `<option>${n}</option>`).join('')}</select></div><div class="campo"><label for="mo">Motivo</label><textarea id="mo"></textarea></div>`, pie: `<button class="btn pri" data-a="ok">Enviar a Trabajo social</button>`, acciones: { async ok() { const m = h.cuerpo.querySelector('#mo').value.trim(); if (m.length < 5) return U.aviso('Escriba el motivo.', 'mal'); const r = await U.hacer('descuento.pedir', { cuenta: id, pct: +h.cuerpo.querySelector('#pc').value, motivo: m }, 'Enviado a Trabajo social.'); if (r.ok) h.cerrar(); } } });
  }
  function resolverDescuento(id) {
    const c = db().ix.cuenta.get(id); const p = pacDe(c);
    const h = U.hoja({
      titulo: 'Resolver descuento', sub: `${c.num} · ${p.nombre}`, ancho: 480,
      cuerpo: `<div class="ficha" style="margin:0"><div><span>Cuenta</span><b>${Q(c.total)}</b></div><div><span>Sugerido</span><b>${c.desc.pct} %</b></div><div><span>Pidió</span><b>${e(A.nomU(c.desc.pide))}</b></div></div><p>${e(c.desc.motivo)}</p>
        <div class="campo"><label for="pc">Porcentaje autorizado</label><select id="pc">${[10, 25, 50, 75, 100].map(n => `<option ${n === c.desc.pct ? 'selected' : ''}>${n}</option>`).join('')}</select></div><div class="campo"><label for="es">Estudio socioeconómico No.</label><input id="es" type="text"></div>`,
      pie: `<button class="btn" data-a="no">Rechazar</button><button class="btn pri" data-a="si">Autorizar</button>`,
      acciones: {
        async si() { const r = await U.hacer('descuento.resolver', { cuenta: id, aprobar: true, pct: +h.cuerpo.querySelector('#pc').value, estudio: h.cuerpo.querySelector('#es').value }, 'Descuento autorizado.'); if (r.ok) h.cerrar(); },
        async no() { const r = await U.hacer('descuento.resolver', { cuenta: id, aprobar: false }, 'Descuento rechazado.'); if (r.ok) h.cerrar(); },
      },
    });
  }
  A.resolverDescuento = resolverDescuento;

  /* ---------- caja ---------- */
  A.cobrar = function (id) {
    const t = A.turno(); if (!t) return U.aviso('Abra su turno de caja antes de cobrar.', 'mal');
    const c = db().ix.cuenta.get(id), p = pacDe(c), neto = M.netoCuenta(c), lim = db().cfg.limiteCF, cert = db().cfg.doc === 'certificador';
    const h = U.hoja({
      titulo: 'Cobrar', sub: `${c.num} · ${p.nombre}`, ancho: 520,
      cuerpo: `<div class="totales" style="margin:0;width:100%"><div class="gran" style="border:0;padding:0"><span>Total</span><span>${Q(neto)}</span></div></div>
        ${cert && neto >= lim ? `<div class="nota">${U.ic('info')}<span>Desde ${Q(lim)} la factura necesita NIT o CUI.</span></div>` : ''}
        <div class="rejilla"><div class="campo"><label for="ni">NIT o CUI</label><input id="ni" type="text" value="${e(p.nit !== 'CF' ? p.nit : (neto >= lim ? p.dpi : 'CF'))}"></div><div class="campo"><label for="no">Nombre en factura</label><input id="no" type="text" value="${e(p.nit === 'CF' && neto < lim ? 'Consumidor final' : p.nombre)}"></div></div>
        <div class="rejilla"><div class="campo"><label for="f1">Forma de pago</label><select id="f1">${['Efectivo', 'Tarjeta', 'Transferencia', 'Cheque'].map(x => `<option>${x}</option>`).join('')}</select></div><div class="campo"><label for="m1">Monto</label><input id="m1" type="number" step="0.01" value="${neto.toFixed(2)}"></div></div>
        <div class="rejilla"><div class="campo"><label for="f2">Segunda forma (opcional)</label><select id="f2"><option value="">Ninguna</option>${['Efectivo', 'Tarjeta', 'Transferencia', 'Cheque'].map(x => `<option>${x}</option>`).join('')}</select></div><div class="campo"><label for="m2">Monto</label><input id="m2" type="number" step="0.01" value="0.00"></div></div>
        <div class="campo"><label for="re">Efectivo recibido</label><input id="re" type="number" step="0.01"><span class="ayuda" id="vu">Escríbalo para calcular el vuelto.</span></div>`,
      pie: `<button class="btn" data-cerrar>Cancelar</button><button class="btn pri" data-a="ok">${cert ? 'Cobrar y certificar' : 'Cobrar'}</button>`,
      acciones: {
        async ok() {
          const q = s => h.cuerpo.querySelector(s); const pagos = [{ forma: q('#f1').value, monto: +q('#m1').value }];
          if (q('#f2').value && +q('#m2').value > 0) pagos.push({ forma: q('#f2').value, monto: +q('#m2').value });
          const suma = pagos.reduce((a, x) => a + x.monto, 0);
          if (Math.abs(suma - neto) > .005) return U.aviso(`Los pagos suman ${Q(suma)} y el total es ${Q(neto)}.`, 'mal');
          const r = await U.hacer('cuenta.facturar', { cuenta: id, nit: q('#ni').value.trim() || 'CF', nombre: q('#no').value.trim(), turno: t.id, pagos }, true);
          if (r.ok) { h.cerrar(); Docs.dte(r.id); }
        },
      },
    });
    h.cuerpo.querySelector('#re').addEventListener('input', ev => { const v = +ev.target.value - +h.cuerpo.querySelector('#m1').value; h.cuerpo.querySelector('#vu').textContent = v >= 0 ? `Vuelto: ${Q(v)}` : `Faltan ${Q(-v)}`; });
  };
  A.vistas.caja = {
    html(st) {
      const t = A.turno();
      if (!t) {
        const hechos = db().turnos.filter(x => x.us === M.sesion.id).slice(-8).reverse();
        return `${cab('Caja', 'Abra su turno para empezar a cobrar.', `<button class="btn pri" data-a="abrir">Abrir turno</button>`)}
          <section class="seccion"><h2>Mis últimos turnos</h2>${tablaTurnos(hechos)}</section>`;
      }
      const q = U.norm(st.bk || '');
      const filas = db().cuentas.filter(c => c.estado === 'abierta' && c.total > 0 && (!q || U.norm(c.num + ' ' + pacDe(c).nombre).includes(q))).reverse();
      const tot = Object.values(t.mov).reduce((a, b) => a + b, 0);
      return `${cab(t.caja, `Turno abierto a las ${U.hora(t.abre)} · fondo ${Q(t.fondo)}`, `<button class="btn" data-a="cerrar">Cerrar turno</button>`)}
        <div class="cifras"><div class="cifra"><span>Cobrado en el turno</span><b>${Q(tot)}</b></div>${['Efectivo', 'Tarjeta', 'Transferencia', 'Cheque'].map(f => `<div class="cifra"><span>${f}</span><b>${Q(t.mov[f] || 0)}</b></div>`).join('')}</div>
        <div class="filtros">${U.busca('bk', st.bk, 'Paciente o número de cuenta')}</div>
        ${U.tabla({ filas, pag: st.pag_t, clic: 'ir', vacioT: 'Nada por cobrar', vacio: 'Las cuentas con cargos aparecen aquí al momento.', cols: [{ t: 'Paciente', h: c => `${e(pacDe(c).nombre)}<span class="t-sub">${e(c.num)}</span>` }, { t: 'Atención', h: c => e(C.TIPOS_CUENTA[c.tipo].nombre) }, { t: 'Abierta', h: c => U.hora(c.abierta) }, { t: 'Aviso', h: c => c.desc && c.desc.estado === 'pendiente' ? U.et('Descuento pendiente', 'ambar') : '' }, { t: 'Total', der: 1, h: c => Q(M.netoCuenta(c)) }, { t: '', der: 1, h: c => `<button class="btn chico pri" data-a="cobrar" data-id="${c.id}">Cobrar</button>` }] })}`;
    },
    acc: {
      ir(id) { location.hash = '#/cuentas/' + id; },
      cobrar(id, b, ev) { ev.stopPropagation(); A.cobrar(id); },
      abrir() {
        const usada = db().turnos.filter(x => x.estado === 'abierto').map(x => x.caja);
        const h = U.hoja({ titulo: 'Abrir turno', ancho: 420, cuerpo: `<div class="campo"><label for="cj">Caja</label><select id="cj">${['Caja 1', 'Caja 2', 'Caja Farmacia', 'Caja Emergencia'].map(x => `<option ${usada.includes(x) ? 'disabled' : ''}>${x}${usada.includes(x) ? ' (en uso)' : ''}</option>`).join('')}</select></div><div class="campo"><label for="fo">Fondo inicial</label><input id="fo" type="number" step="0.01" value="500.00"></div>`, pie: `<button class="btn pri" data-a="ok">Abrir turno</button>`, acciones: { async ok() { const r = await U.hacer('caja.abrir', { caja: h.cuerpo.querySelector('#cj').value, fondo: +h.cuerpo.querySelector('#fo').value }, true); if (r.ok) h.cerrar(); } } });
      },
      cerrar() {
        const t = A.turno(); const esp = M.r2(t.fondo + (t.mov.Efectivo || 0));
        const h = U.hoja({
          titulo: 'Cerrar turno', sub: t.caja, ancho: 460, cuerpo: `<div class="nota info">${U.ic('lock')}<span>Cuente el efectivo sin mirar el sistema. La diferencia queda registrada.</span></div><div class="campo"><label for="co">Efectivo contado</label><input id="co" type="number" step="0.01"></div><div class="campo"><label for="nt">Nota</label><textarea id="nt"></textarea></div>`,
          pie: `<button class="btn pri" data-a="ok">Cerrar turno</button>`,
          acciones: { async ok() { const v = h.cuerpo.querySelector('#co').value; if (v === '') return U.aviso('Escriba el efectivo contado.', 'mal'); const r = await U.hacer('caja.cerrar', { turno: t.id, contado: +v, nota: h.cuerpo.querySelector('#nt').value }); if (r.ok) { U.aviso(`Turno cerrado. Se esperaba ${Q(esp)}; diferencia ${Q(+v - esp)}.`); h.cerrar(); } } },
        });
      },
    },
  };
  function tablaTurnos(f) { return U.tabla({ contar: false, filas: f, vacioT: 'Sin turnos', cols: [{ t: 'Turno', h: t => `${e(t.caja)}<span class="t-sub">${e(A.nomU(t.us))}</span>` }, { t: 'Abrió', h: t => U.fh(t.abre) }, { t: 'Estado', h: t => U.et(t.estado === 'abierto' ? 'Abierto' : 'Cerrado', t.estado === 'abierto' ? 'azul' : '') }, { t: 'Esperado', der: 1, h: t => t.cierre ? Q(t.cierre.esperado) : '' }, { t: 'Contado', der: 1, h: t => t.cierre ? Q(t.cierre.contado) : '' }, { t: 'Diferencia', der: 1, h: t => t.cierre ? (t.cierre.dif ? U.et(Q(t.cierre.dif), 'alerta') : Q(0)) : '' }] }); }
  A.tablaTurnos = tablaTurnos;

  /* ---------- farmacia ---------- */
  A.vistas.farmacia = {
    ruta: p => ({ control: 'Control de sustancias', pedidos: 'Pedidos de sala' }[p[1]] || 'Mostrador'),
    html(st, p) {
      const tab = p[1] || 'mostrador'; const pend = db().pedidos.filter(x => x.estado === 'pendiente');
      const tabs = U.tabs([{ id: 'mostrador', t: 'Mostrador' }, { id: 'pedidos', t: 'Pedidos de sala', n: pend.length }, { id: 'control', t: 'Control de sustancias' }], tab, 'farmacia');
      if (tab === 'control') return controlSustancias(st, tabs);
      if (tab === 'mostrador') return A.mostrador(st, tabs);
      const orden = pend.slice().sort((a, b) => (b.urgente - a.urgente) || (a.f - b.f));
      return `${cab('Farmacia', pend.length ? 'Los urgentes van primero. Cada despacho sale del lote que vence antes.' : 'Sin pedidos en espera.')}${tabs}
        ${U.tabla({ filas: orden, clic: 'pedido', por: 50, vacioT: 'Nada por despachar', vacio: 'Los pedidos de enfermería y quirófano aparecen aquí al instante.', cols: [{ t: 'Pedido', h: x => `${e(x.num)} ${x.urgente ? U.et('Urgente', 'alerta') : ''}<span class="t-sub">${e(pacDe(db().ix.cuenta.get(x.cuenta)).nombre)}</span>` }, { t: 'Área', h: x => e(x.area) }, { t: 'Pidió', h: x => e(A.nomU(x.us)) }, { t: 'Hace', h: x => Math.max(1, Math.round((Date.now() - x.f) / 60000)) + ' min' }, { t: 'Líneas', der: 1, h: x => x.items.length }] })}`;
    },
    despues(el, st, p) { if ((p[1] || 'mostrador') === 'mostrador') A.mostradorListo(el, st); },
    acc: {
      ver(id) { location.hash = '#/cuentas/' + id; },
      pedido(id) { atenderPedido(id); },
      balance() { const m = A.st.farmacia.mes || A.meses()[0].k; const f = balanceFilas(m); U.csv('balance-controlados-' + m, [['Producto', 'Tipo', 'Saldo inicial', 'Entradas', 'Salidas', 'Saldo final'], ...f.map(r => [r.p.nombre, r.p.controlado, r.ini, r.ent, r.sal, r.fin])]); },
    },
  };
  function balanceFilas(k) {
    const en = A.enMes(k); const [y, m] = k.split('-').map(Number); const ini = new Date(y, m, 1).getTime(), fin = new Date(y, m + 1, 1).getTime();
    return db().productos.filter(p => p.controlado).map(p => {
      const ms = db().ix.movsDe.get(p.id) || []; let antes = 0, ent = 0, sal = 0, despues = 0;
      for (const x of ms) { if (x.t.startsWith('Traslado')) continue; if (x.f < ini) antes += x.c; else if (x.f < fin) { if (x.c > 0) ent += x.c; else sal -= x.c; } else despues += x.c; }
      return { p, ini: antes, ent, sal, fin: antes + ent - sal };
    });
  }
  function controlSustancias(st, tabs) {
    const meses = A.meses(), k = st.mes || meses[0].k, en = A.enMes(k), filas = balanceFilas(k);
    const mov = db().controlados.filter(x => en(x.f) && x.sale > 0).reverse();
    const [y, m] = k.split('-').map(Number); const vence = new Date(y, m + 1, 10);
    return `${cab('Control de sustancias', `Balance mensual jurado con paciente y prescriptor. El de ${U.MESES_L[m].toLowerCase()} se entrega a más tardar el ${U.fecha(vence.getTime())}.`, `<button class="btn pri" data-a="balance">${U.ic('download')}Descargar balance</button>`)}${tabs}
      <div class="filtros">${U.mesSel('mes', k, meses)}</div>
      <section class="seccion"><h2>Balance del mes</h2>${U.tabla({ contar: false, por: 40, filas, cols: [{ t: 'Producto', h: r => `${e(r.p.nombre)}<span class="t-sub">${r.p.controlado === 'estupefaciente' ? 'Estupefaciente' : 'Psicotrópico'}</span>` }, { t: 'Saldo inicial', der: 1, h: r => U.n(r.ini) }, { t: 'Entradas', der: 1, h: r => U.n(r.ent) }, { t: 'Salidas', der: 1, h: r => U.n(r.sal) }, { t: 'Saldo final', der: 1, h: r => U.n(r.fin) }] })}</section>
      <section class="seccion"><h2>Salidas con receta</h2>${U.tabla({ filas: mov, pag: st.pag_c, nombre: 'c', vacioT: 'Sin salidas este mes', cols: [{ t: 'Producto', h: x => `${e(db().ix.prod.get(x.prod).nombre)}<span class="t-sub">Lote ${e(db().ix.lote.get(x.lote).num)}</span>` }, { t: 'Fecha', h: x => U.fh(x.f) }, { t: 'Paciente', h: x => e((db().ix.pac.get(x.pac) || {}).nombre || '—') }, { t: 'Receta', h: x => e(x.receta) }, { t: 'Prescriptor', h: x => `${e(x.medico)}<span class="t-sub">Col. ${e(x.colegiado || '—')}</span>` }, { t: 'Cant.', der: 1, h: x => U.n(x.sale) }] })}</section>`;
  }
  function atenderPedido(id) {
    const p = db().ix.ped.get(id), c = db().ix.cuenta.get(p.cuenta);
    const h = U.hoja({
      titulo: p.num, sub: `${pacDe(c).nombre} · ${p.area} · pidió ${A.nomU(p.us)}`, ancho: 620,
      cuerpo: `${p.nota ? `<div class="nota">${U.ic('info')}<span>${e(p.nota)}</span></div>` : ''}${U.tabla({ contar: false, por: 50, filas: p.items, cols: [{ t: 'Producto', h: i => { const x = db().ix.prod.get(i.prod); return `${e(x.nombre)}${x.controlado ? ' ' + U.et('Controlado', 'alerta') : ''}${i.receta ? `<span class="t-sub">Receta ${e(i.receta.num)} · ${e(i.receta.medico)}</span>` : ''}`; } }, { t: 'Disponible', der: 1, h: i => U.n(M.disponible(db(), i.prod, 'FX', Date.now())) }, { t: 'Pide', der: 1, h: i => U.n(i.cant) }] })}`,
      pie: `<button class="btn" data-a="no">Rechazar</button><button class="btn pri" data-a="si">Despachar</button>`,
      acciones: {
        async si() { const r = await U.hacer('pedido.despachar', { id }, true); if (r.ok) h.cerrar(); },
        no() { const v = U.hoja({ titulo: 'Rechazar pedido', dialogo: true, cuerpo: `<div class="campo"><label for="m">Motivo</label><input id="m" type="text"></div>`, pie: `<button class="btn peligro" data-a="ok">Rechazar</button>`, acciones: { async ok() { const r = await U.hacer('pedido.rechazar', { id, motivo: v.cuerpo.querySelector('#m').value }, true); if (r.ok) { v.cerrar(); h.cerrar(); } } } }); },
      },
    });
  }

  /* ---------- sala: enfermería y quirófano ---------- */
  A.vistas.sala = {
    html(st) {
      const q = M.sesion.rol === 'quirofano'; const bod = q ? 'QX' : 'EN';
      const tipos = q ? ['cirugia'] : ['encamamiento', 'emergencia'];
      const filas = db().cuentas.filter(c => c.estado === 'abierta' && tipos.includes(c.tipo)).reverse();
      const mis = db().pedidos.filter(p => p.us === M.sesion.id).slice(-12).reverse();
      const llegan = db().traslados.filter(t => t.estado === 'en camino' && t.a === bod);
      return `${cab(q ? 'Quirófano' : 'Sala', 'Elija al paciente para pedir a farmacia o registrar lo que se usó.', `<button class="btn" data-a="traslado">${U.ic('truck')}Pedir a bodega</button>`)}
        ${llegan.map(t => `<div class="nota info">${U.ic('truck')}<span style="flex:1">${e(t.num)} viene en camino desde ${e(M.nomBod(db(), t.de))}: ${t.items.length} ${t.items.length === 1 ? 'producto' : 'productos'}.</span><button class="btn chico" data-a="recibir" data-id="${t.id}">Recibir</button></div>`).join('')}
        <section class="seccion">${U.tabla({ filas, pag: st.pag_t, clic: 'pac', por: 15, vacioT: 'Sin pacientes activos', vacio: 'Admisión abre la cuenta y el paciente aparece aquí.', cols: [{ t: 'Paciente', h: c => `${e(pacDe(c).nombre)}<span class="t-sub">${e(c.num)}${c.cama ? ' · ' + e(c.cama) : ''}</span>` }, { t: 'Atención', h: c => e(C.TIPOS_CUENTA[c.tipo].nombre) }, { t: 'Desde', h: c => U.fh(c.abierta) }, { t: 'Cargado', der: 1, h: c => Q(c.total) }] })}</section>
        <section class="seccion"><h2>Mis pedidos a farmacia</h2>${U.tabla({ contar: false, filas: mis, vacioT: 'Aún no ha pedido nada', vacio: 'Elija un paciente de la lista.', cols: [{ t: 'Pedido', h: p => `${e(p.num)}<span class="t-sub">${e(pacDe(db().ix.cuenta.get(p.cuenta)).nombre)}</span>` }, { t: 'Hora', h: p => U.hora(p.f) }, { t: 'Estado', h: p => A.etEstado(p.estado) + (p.motivo ? `<span class="t-sub">${e(p.motivo)}</span>` : '') }] })}</section>`;
    },
    acc: {
      pac(id) {
        const c = db().ix.cuenta.get(id); const q = M.sesion.rol === 'quirofano'; const bod = q ? 'QX' : 'EN';
        const h = U.hoja({
          titulo: pacDe(c).nombre, sub: `${c.num}${c.cama ? ' · ' + c.cama : ''}`, ancho: 480,
          cuerpo: `<div class="pend"><a class="fila-pend" href="#" data-a="pedir">${U.ic('pill')}<span class="q">Pedir a farmacia<span>Farmacia lo prepara y lo carga a la cuenta</span></span>${U.ic('chevron-right')}</a>
            ${A.puede('cuenta.cargo.producto') ? `<a class="fila-pend" href="#" data-a="consumo">${U.ic('syringe')}<span class="q">Registrar consumo<span>Sale de ${e(M.nomBod(db(), bod))} y se carga a la cuenta</span></span>${U.ic('chevron-right')}</a>` : ''}
            <a class="fila-pend" href="#" data-a="serv">${U.ic('stethoscope')}<span class="q">Agregar servicio<span>Visita, día de cama o procedimiento</span></span>${U.ic('chevron-right')}</a>
            <a class="fila-pend" href="#/cuentas/${id}" data-a="cuenta">${U.ic('receipt')}<span class="q">Ver la cuenta</span>${U.ic('chevron-right')}</a></div>`,
          acciones: {
            cuenta() { h.cerrar(); location.hash = '#/cuentas/' + id; },
            pedir() { A.lineas({ titulo: 'Pedir a farmacia', sub: pacDe(c).nombre, modo: 'pedido', bod: 'FX', ok: 'Enviar pedido', arriba: `<label class="peq"><input type="checkbox" id="ur"> Urgente</label>`, async alAceptar(items, v) { const r = await U.hacer('pedido.crear', { cuenta: id, urgente: v.cuerpo.querySelector('#ur').checked, items: items.map(({ bod, ...x }) => x) }, true); if (r.ok) h.cerrar(); return r.ok; } }); },
            consumo() { A.lineas({ titulo: 'Registrar consumo', sub: pacDe(c).nombre, modo: 'cargo', bod, ok: 'Cargar a la cuenta', async alAceptar(items) { const r = await U.hacer('cuenta.cargo', { cuenta: id, items }, true); if (r.ok) h.cerrar(); return r.ok; } }); },
            serv() { A.lineas({ titulo: 'Agregar servicio', sub: pacDe(c).nombre, modo: 'cargo', conServicios: true, soloServicios: true, ok: 'Cargar a la cuenta', async alAceptar(items) { const r = await U.hacer('cuenta.cargo', { cuenta: id, items }, true); if (r.ok) h.cerrar(); return r.ok; } }); },
          },
        });
      },
      traslado() { const q = M.sesion.rol === 'quirofano'; A.pedirTraslado(q ? 'QX' : 'EN'); },
      recibir(id) { U.hacer('traslado.recibir', { id }, true); },
    },
  };

  /* ---------- trabajo social ---------- */
  A.vistas.social = {
    html(st) {
      const pend = db().cuentas.filter(c => c.desc && c.desc.estado === 'pendiente' && !c.dte);
      const k = st.ms || A.meses()[0].k, en = A.enMes(k);
      const hechas = db().dtes.filter(d => (d.tipo === 'FACT' || d.tipo === 'COMP') && d.desc > 0 && d.estado === 'vigente' && en(d.f));
      const total = hechas.reduce((a, d) => a + d.desc, 0);
      return `${cab('Trabajo social', 'Cada descuento queda con su estudio socioeconómico. Es la ayuda que el Patronato puede demostrar.')}
        <section class="seccion"><h2>Por resolver</h2>${U.tabla({ contar: false, filas: pend, clic: 'res', vacioT: 'Nada pendiente', vacio: 'Admisión y Caja envían aquí las solicitudes.', cols: [{ t: 'Paciente', h: c => `${e(pacDe(c).nombre)}<span class="t-sub">${e(c.num)}</span>` }, { t: 'Motivo', h: c => e(c.desc.motivo) }, { t: 'Sugerido', der: 1, h: c => c.desc.pct + ' %' }, { t: 'Cuenta', der: 1, h: c => Q(c.total) }] })}</section>
        <section class="seccion"><div class="sub-cab"><h2>Ayuda otorgada</h2>${U.mesSel('ms', k, A.meses())}</div>
        <div class="cifras"><div class="cifra"><span>Monto condonado</span><b>${Q(total)}</b></div><div class="cifra"><span>Pacientes beneficiados</span><b>${U.n(hechas.length)}</b></div></div>
        ${U.tabla({ filas: hechas.slice().reverse(), pag: st.pag_t, cols: [{ t: 'Documento', h: d => `${e(d.serie)}-${d.num}<span class="t-sub">${e(d.nombre)}</span>` }, { t: 'Fecha', h: d => U.fecha(d.f) }, { t: 'Área', h: d => e(d.area) }, { t: 'Cuenta', der: 1, h: d => Q(d.bruto) }, { t: 'Condonado', der: 1, h: d => Q(d.desc) }, { t: 'Pagó', der: 1, h: d => Q(d.total) }] })}</section>`;
    },
    acc: { res: id => A.resolverDescuento(id) },
  };
})(window);
