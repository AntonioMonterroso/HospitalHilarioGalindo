/* Contabilidad y ley, reportes, bitácora, usuarios y configuración. */
(function (g) {
  const { U, App: A, Motor: M, Catalogo: C, Docs } = g; const e = U.esc, Q = U.Q;
  const db = () => M.db;
  const suma = (a, k) => a.reduce((s, x) => s + (typeof k === 'function' ? k(x) : x[k]), 0);
  const pieT = (n, celdas) => `<td colspan="${n}">Total</td>` + celdas.map(c => `<td class="der">${c}</td>`).join('');

  /* Partida contable de cada día, armada con lo que ya pasó en el sistema */
  function partidasDia(dia) {
    const a = dia, b = dia + M.DIA, d = db(); const L = [];
    const dtes = d.dtes.filter(x => x.f >= a && x.f < b && x.estado !== 'anulada');
    if (dtes.length) {
      const pagos = {}; d.pagos.forEach(p => { if (p.f >= a && p.f < b) pagos[p.forma] = (pagos[p.forma] || 0) + p.monto; });
      const tot = suma(dtes, 'total'), pag = Object.values(pagos).reduce((x, y) => x + y, 0);
      const cta = { Efectivo: '1101 Caja', Tarjeta: '1103 Tarjetas por liquidar', Transferencia: '1102 Bancos', Cheque: '1102 Bancos' };
      const deb = {}; for (const f in pagos) deb[cta[f]] = (deb[cta[f]] || 0) + pagos[f];
      for (const c in deb) L.push([c, deb[c], 0]);
      if (tot - pag > .005) L.push(['1105 Clientes y aseguradoras', tot - pag, 0]);
      L.push(['4101 Ingresos por servicios y ventas gravados', 0, suma(dtes, 'base')]);
      if (suma(dtes, 'exento')) L.push(['4102 Ingresos exentos', 0, suma(dtes, 'exento')]);
      L.push(['2105 IVA por pagar', 0, suma(dtes, 'iva')]);
    }
    let costo = 0; const ms = d.movs; for (const m of ms) if (m.f >= a && m.f < b && m.t === 'Consumo paciente') costo += -m.c * m.u;
    if (costo > 0) { L.push(['5101 Costo de medicamentos e insumos', costo, 0]); L.push(['1201 Inventarios', 0, costo]); }
    return L.map(([c, x, y]) => [c, M.r2(x), M.r2(y)]);
  }

  A.vistas.ley = {
    ruta: p => ({ ventas: 'Libro de ventas', compras: 'Libro de compras', retenciones: 'Retenciones', inventario: 'Inventario valorado', partidas: 'Partidas', donaciones: 'Donaciones', fondos: 'Fondos públicos', cajas: 'Cierres de caja' }[p[1] || 'ventas']),
    html(st, p) {
      const tab = p[1] || 'ventas';
      const tabs = U.tabs([['ventas', 'Libro de ventas'], ['compras', 'Libro de compras'], ['retenciones', 'Retenciones'], ['inventario', 'Inventario valorado'], ['partidas', 'Partidas'], ['donaciones', 'Donaciones'], ['fondos', 'Fondos públicos'], ['cajas', 'Cierres de caja']].map(([id, t]) => ({ id, t })), tab, 'ley');
      const meses = A.meses(); st.mes = st.mes || meses[0].k;
      return ({ ventas, compras, retenciones, inventario, partidas, donaciones, fondos, cajas }[tab])(st, tabs, meses);
    },
    acc: {
      dte: id => Docs.dte(id), rec: id => Docs.rec(id), con: id => Docs.constancia(id), don: id => Docs.donacion(id),
      exV() { const en = A.enMes(A.st.ley.mes); U.csv('libro-ventas-' + A.st.ley.mes, [['Fecha', 'Tipo', 'Serie', 'Número', 'Factura SAT', 'NIT', 'Nombre', 'Exento', 'Gravado', 'IVA', 'Total', 'Estado'], ...db().dtes.filter(d => en(d.f)).map(d => [U.fecha(d.f), d.tipo, d.serie, d.num, d.sat ? `${d.sat.serie} ${d.sat.num}` : '', d.nit, d.nombre, d.exento, d.base, d.iva, d.total, d.estado])]); },
      exC() { const en = A.enMes(A.st.ley.mes); U.csv('libro-compras-' + A.st.ley.mes, [['Fecha', 'Tipo', 'Serie', 'Número', 'NIT', 'Proveedor', 'Base', 'IVA', 'Total'], ...db().recepciones.filter(r => en(r.f)).map(r => { const p = db().ix.prov.get(r.prov); return [U.fecha(r.fFactura), r.tipoDoc, r.serie, r.factura, p.nit, p.nombre, r.base, r.iva, r.total]; })]); },
      dinero() {
        const h = U.hoja({ titulo: 'Recibo por donación', sub: 'Donación en dinero', ancho: 460, cuerpo: `<div class="campo"><label for="d">Donante</label><input id="d" type="text"></div><div class="rejilla"><div class="campo"><label for="n">NIT</label><input id="n" type="text" value="CF"></div><div class="campo"><label for="m">Monto</label><input id="m" type="number" step="0.01"></div></div><div class="campo"><label for="f">Forma</label><select id="f"><option>Transferencia</option><option>Cheque</option><option>Efectivo</option></select></div>`, pie: `<button class="btn pri" data-a="ok">Emitir recibo</button>`, acciones: { async ok() { const q = s => h.cuerpo.querySelector(s); const r = await U.hacer('donacion.dinero', { donante: q('#d').value.trim(), nit: q('#n').value.trim(), monto: +q('#m').value, forma: q('#f').value }, true); if (r.ok) h.cerrar(); } } });
      },
    },
  };
  function ventas(st, tabs, meses) {
    const en = A.enMes(st.mes); const f = db().dtes.filter(d => en(d.f)).reverse(); const v = f.filter(d => d.estado !== 'anulada');
    return `${A.cab('Contabilidad y ley', 'Libro de ventas y servicios prestados, armado solo desde cada venta.', `<button class="btn pri" data-a="exV">${U.ic('download')}Excel</button>`)}${tabs}
      <div class="filtros">${U.mesSel('mes', st.mes, meses)}</div>
      <div class="cifras"><div class="cifra"><span>Exento</span><b>${Q(suma(v, 'exento'))}</b></div><div class="cifra"><span>Gravado</span><b>${Q(suma(v, 'base'))}</b></div><div class="cifra"><span>IVA débito</span><b>${Q(suma(v, 'iva'))}</b></div><div class="cifra"><span>Total del mes</span><b>${Q(suma(v, 'total'))}</b><small>${U.n(f.length)} documentos</small></div>${db().cfg.doc === 'interno' ? `<div class="cifra"><span>Sin factura anotada</span><b>${U.n(v.filter(d => d.tipo === 'COMP' && !d.sat).length)}</b></div>` : ''}</div>
      ${U.tabla({ filas: f, pag: st.pag_t, por: 30, cols: [{ t: 'Documento', h: d => `${d.tipo} ${e(d.serie)}-${d.num}<span class="t-sub">${e(d.nombre)}</span>` }, { t: 'Fecha', h: d => U.fecha(d.f) }, { t: 'NIT', h: d => e(d.nit) }, { t: 'Factura SAT', h: d => d.sat ? `${e(d.sat.serie)} ${e(d.sat.num)}` : '—' }, { t: 'Exento', der: 1, h: d => Q(d.exento) }, { t: 'Gravado', der: 1, h: d => Q(d.base) }, { t: 'IVA', der: 1, h: d => Q(d.iva) }, { t: 'Total', der: 1, h: d => d.estado === 'vigente' ? Q(d.total) : `${Q(d.total)} ${A.etEstado(d.estado)}` }, { t: '', der: 1, h: d => U.ojo('dte', d.id) }] })}`;
  }
  function compras(st, tabs, meses) {
    const en = A.enMes(st.mes); const f = db().recepciones.filter(r => en(r.f)).reverse();
    return `${A.cab('Contabilidad y ley', 'Libro de compras y servicios recibidos.', `<button class="btn pri" data-a="exC">${U.ic('download')}Excel</button>`)}${tabs}
      <div class="filtros">${U.mesSel('mes', st.mes, meses)}</div>
      <div class="cifras"><div class="cifra"><span>Base</span><b>${Q(suma(f, 'base'))}</b></div><div class="cifra"><span>IVA crédito</span><b>${Q(suma(f, 'iva'))}</b></div><div class="cifra"><span>Total</span><b>${Q(suma(f, 'total'))}</b><small>${U.n(f.length)} facturas</small></div></div>
      ${U.tabla({ filas: f, pag: st.pag_t, vacioT: 'Sin compras este mes', cols: [{ t: 'Factura', h: r => `${r.tipoDoc} ${e(r.serie)}-${e(r.factura)}<span class="t-sub">${e(db().ix.prov.get(r.prov).nombre)}</span>` }, { t: 'Fecha', h: r => U.fecha(r.fFactura) }, { t: 'NIT', h: r => e(db().ix.prov.get(r.prov).nit) }, { t: 'Base', der: 1, h: r => Q(r.base) }, { t: 'IVA', der: 1, h: r => Q(r.iva) }, { t: 'Total', der: 1, h: r => Q(r.total) }, { t: '', der: 1, h: r => U.ojo('rec', r.id) }] })}`;
  }
  function retenciones(st, tabs, meses) {
    const en = A.enMes(st.mes); const f = db().recepciones.filter(r => en(r.f) && r.ret.isr > 0).reverse();
    return `${A.cab('Contabilidad y ley', 'Las asociaciones son agentes de retención: 5 % hasta Q 30,000.00 y 7 % sobre el excedente. No se retiene a quien está en pagos trimestrales ni bajo Q 2,500.00 sin IVA.')}${tabs}
      <div class="filtros">${U.mesSel('mes', st.mes, meses)}</div>
      <div class="cifras"><div class="cifra"><span>ISR retenido del mes</span><b>${Q(suma(f, r => r.ret.isr))}</b><small>${U.n(f.length)} constancias</small></div></div>
      ${U.tabla({ filas: f, pag: st.pag_t, vacioT: 'Sin retenciones este mes', cols: [{ t: 'Proveedor', h: r => `${e(db().ix.prov.get(r.prov).nombre)}<span class="t-sub">Factura ${e(r.serie)}-${e(r.factura)}</span>` }, { t: 'Fecha', h: r => U.fecha(r.f) }, { t: 'Base', der: 1, h: r => Q(r.base) }, { t: 'Retenido', der: 1, h: r => Q(r.ret.isr) }, { t: '', der: 1, h: r => U.ojo('con', r.id, 'Ver constancia') }] })}`;
  }
  function inventario(st, tabs) {
    const cats = {}; for (const p of db().productos) { const c = cats[p.cat] = cats[p.cat] || { n: 0, v: 0 }; c.n++; c.v += p.valor; }
    const fondos = {}; for (const l of db().lotes) { const q = Object.values(l.ex).reduce((a, b) => a + b, 0); if (q > 0) fondos[l.fondo] = (fondos[l.fondo] || 0) + q * l.costo; }
    const bods = db().bodegas.map(b => ({ b, v: db().productos.reduce((a, p) => a + (p.ex[b.id] || 0) * M.promedio(p), 0) }));
    const total = suma(Object.values(cats), 'v');
    return `${A.cab('Contabilidad y ley', `Valuado por ${db().cfg.metodo.toLowerCase()}. Cambiar de método necesita autorización de la SAT.`)}${tabs}
      <div class="cifras"><div class="cifra"><span>Inventario total</span><b>${Q(total)}</b></div></div>
      <div class="dos"><section class="seccion"><h2>Por categoría</h2>${U.tabla({ contar: false, filas: Object.entries(cats), id: r => r[0], cols: [{ t: 'Categoría', h: r => e(r[0]) }, { t: 'Productos', der: 1, h: r => U.n(r[1].n) }, { t: 'Valor', der: 1, h: r => Q(r[1].v) }] })}</section>
      <section class="seccion"><h2>Por bodega</h2>${U.tabla({ contar: false, filas: bods, cols: [{ t: 'Bodega', h: r => e(r.b.nombre) }, { t: 'Valor', der: 1, h: r => Q(r.v) }] })}</section></div>
      <section class="seccion"><h2>Por fuente de fondos, a costo de entrada</h2>${U.tabla({ contar: false, filas: Object.entries(fondos), cols: [{ t: 'Fondo', h: r => e(r[0]) }, { t: 'Valor', der: 1, h: r => Q(r[1]) }] })}</section>`;
  }
  function partidas(st, tabs) {
    const d = st.dia ? U.deIso(st.dia) : A.hoy() - M.DIA; const L = partidasDia(d);
    const D = suma(L, 1), H = suma(L, 2);
    return `${A.cab('Contabilidad y ley', 'La partida del día sale sola de ventas, cobros y consumos. Catálogo de cuentas de ejemplo.')}${tabs}
      <div class="filtros"><input type="date" id="dia" data-filtro="dia" aria-label="Día" value="${U.iso(d)}" style="width:auto">${Math.abs(D - H) < .05 ? U.et('Cuadrada', 'bien') : U.et(`Diferencia ${Q(D - H)}`, 'alerta')}</div>
      ${U.tabla({ contar: false, por: 50, filas: L, vacioT: 'Sin movimiento ese día', id: r => r[0], pie: L.length ? pieT(1, [Q(D), Q(H)]) : '', cols: [{ t: 'Cuenta', h: r => e(r[0]) }, { t: 'Debe', der: 1, h: r => r[1] ? Q(r[1]) : '' }, { t: 'Haber', der: 1, h: r => r[2] ? Q(r[2]) : '' }] })}`;
  }
  function donaciones(st, tabs) {
    const f = db().donaciones.slice().sort((a, b) => b.f - a.f);
    return `${A.cab('Contabilidad y ley', 'Exentas de ISR e IVA. Se separan de lo que el hospital cobra por servicios, que sí es renta gravada.', `<button class="btn pri" data-a="dinero">${U.ic('hand-coins')}Recibo por donación</button>`)}${tabs}
      <div class="cifras"><div class="cifra"><span>En dinero</span><b>${Q(suma(f.filter(x => x.tipo === 'Dinero'), 'valor'))}</b></div><div class="cifra"><span>En especie</span><b>${Q(suma(f.filter(x => x.tipo === 'Especie'), 'valor'))}</b></div></div>
      ${U.tabla({ filas: f, pag: st.pag_t, vacioT: 'Sin donaciones', cols: [{ t: 'Recibo', h: d => `RDON ${e(d.serie)}-${d.recibo}<span class="t-sub">${e(d.donante)}</span>` }, { t: 'Fecha', h: d => U.fecha(d.f) }, { t: 'Tipo', h: d => e(d.tipo) }, { t: 'Valor', der: 1, h: d => Q(d.valor) }, { t: '', der: 1, h: d => U.ojo('don', d.id) }] })}`;
  }
  function fondos(st, tabs) {
    const f = db().ocs.filter(o => o.fondo === 'Fondos públicos').reverse();
    return `${A.cab('Contabilidad y ley', 'Las compras con fondos públicos quedan aparte para Guatecompras y la Contraloría.')}${tabs}
      <div class="nota info">${U.ic('landmark')}<span>Decreto 57-92, Art. 54: los patronatos publican en Guatecompras sobre el monto de compra directa. Art. 1: la ley aplica respecto de esos fondos.</span></div>
      <div class="cifras"><div class="cifra"><span>Comprado con fondos públicos</span><b>${Q(suma(f, 'total'))}</b><small>${U.n(f.length)} órdenes</small></div><div class="cifra"><span>Sin NOG registrado</span><b>${U.n(f.filter(o => !o.nog).length)}</b></div></div>
      ${U.tabla({ filas: f, pag: st.pag_t, vacioT: 'Sin compras con fondos públicos', cols: [{ t: 'Orden', h: o => `${e(o.num)}<span class="t-sub">${e(db().ix.prov.get(o.prov).nombre)}</span>` }, { t: 'Fecha', h: o => U.fecha(o.f) }, { t: 'NOG', h: o => o.nog ? e(o.nog) : U.et('Falta', 'ambar') }, { t: 'Estado', h: o => A.etEstado(o.estado) }, { t: 'Total', der: 1, h: o => Q(o.total) }] })}`;
  }
  function cajas(st, tabs) {
    const f = db().turnos.slice().reverse();
    return `${A.cab('Contabilidad y ley', 'Cada turno con lo esperado, lo contado y su diferencia.')}${tabs}${A.tablaTurnos(f)}`;
  }

  /* ---------- reportes ---------- */
  A.vistas.reportes = {
    html(st) {
      const meses = A.meses(); const k = st.mes || meses[0].k, en = A.enMes(k), d = db();
      const f = d.dtes.filter(x => en(x.f) && x.estado !== 'anulada');
      const areas = {}; f.forEach(x => { const a = areas[x.area] = areas[x.area] || { n: 0, v: 0 }; a.n++; a.v += x.total; });
      const prods = new Map(); let costo = 0;
      for (const c of d.cargos) { if (!en(c.f) || !c.prod) continue; const a = prods.get(c.prod) || { c: 0, v: 0, k: 0 }; a.c += c.cant; a.v += c.total; a.k += c.costo; costo += c.costo; prods.set(c.prod, a); }
      const top = [...prods].sort((a, b) => b[1].v - a[1].v);
      const totalV = top.reduce((a, r) => a + r[1].v, 0); let acum = 0;
      const abc = top.map(([id, r]) => { acum += r.v; return { id, ...r, clase: acum / totalV <= .8 ? 'A' : acum / totalV <= .95 ? 'B' : 'C' }; });
      const ingresos = suma(f, 'total');
      const social = suma(f, 'desc');
      return `${A.cab('Reportes', 'Para la Junta: de dónde viene el dinero, qué se mueve y cuánta ayuda se dio.')}
        <div class="filtros">${U.mesSel('mes', k, meses)}</div>
        <div class="cifras"><div class="cifra"><span>Ingresos</span><b>${Q(ingresos)}</b></div><div class="cifra"><span>Costo de productos</span><b>${Q(costo)}</b></div><div class="cifra"><span>Ayuda social</span><b>${Q(social)}</b></div><div class="cifra"><span>Atenciones</span><b>${U.n(f.length)}</b></div></div>
        <section class="seccion"><h2>Por área</h2>${U.tabla({ contar: false, filas: Object.entries(areas).sort((a, b) => b[1].v - a[1].v), id: r => r[0], cols: [{ t: 'Área', h: r => e(r[0]) }, { t: 'Documentos', der: 1, h: r => U.n(r[1].n) }, { t: 'Ingresos', der: 1, h: r => Q(r[1].v) }, { t: 'Promedio', der: 1, h: r => Q(r[1].v / r[1].n) }] })}</section>
        <section class="seccion"><h2>Clasificación ABC de productos</h2>${U.tabla({ filas: abc, pag: st.pag_t, por: 15, id: r => r.id, clic: 'prod', cols: [{ t: 'Producto', h: r => e(d.ix.prod.get(r.id).nombre) }, { t: 'Clase', h: r => U.et(r.clase, r.clase === 'A' ? 'pino' : '') }, { t: 'Unidades', der: 1, h: r => U.n(r.c) }, { t: 'Ventas', der: 1, h: r => Q(r.v) }, { t: 'Costo', der: 1, h: r => Q(r.k) }, { t: 'Margen', der: 1, h: r => r.v ? ((r.v - r.k) / r.v * 100).toFixed(1) + ' %' : '—' }] })}</section>`;
    },
    acc: { prod: id => A.fichaProducto(id) },
  };

  /* ---------- bitácora ---------- */
  A.vistas.bitacora = {
    html(st) {
      const q = U.norm(st.bb || ''), u = st.bu || '';
      let f = db().bitacora.slice().reverse(); if (u) f = f.filter(x => x.u === u); if (st.soloMal) f = f.filter(x => !x.ok); if (q) f = f.filter(x => U.norm(x.txt).includes(q));
      return `${A.cab('Bitácora', 'Nada se borra. Cada acción queda con usuario, dispositivo y hora, incluso las que el sistema detuvo.')}
        <div class="filtros">${U.busca('bb', st.bb, 'Buscar en la bitácora')}<select id="bu" data-filtro="bu" aria-label="Usuario" style="width:auto"><option value="">Todos los usuarios</option>${db().usuarios.map(x => `<option value="${x.id}" ${x.id === u ? 'selected' : ''}>${e(x.nombre)}</option>`).join('')}</select><button class="chip" data-a="mal" aria-pressed="${!!st.soloMal}">Solo rechazadas</button></div>
        ${U.tabla({ filas: f, pag: st.pag_t, por: 30, vacioT: 'Sin registros', vacio: 'Haga algo en el sistema y aparecerá aquí.', cols: [{ t: 'Acción', h: x => `${x.ok ? '' : U.et('Rechazada', 'alerta') + ' '}${e(x.txt)}` }, { t: 'Puesto', h: x => `<span class="con-av">${A.av(x.u, 28)}${e(A.nomU(x.u))}</span>` }, { t: 'Dispositivo', h: x => e(x.disp || '—') }, { t: 'Hora', h: x => U.fh(x.ts) }] })}`;
    },
    acc: { mal() { A.st.bitacora.soloMal = !A.st.bitacora.soloMal; A.repintar(); } },
  };

  /* ---------- usuarios ---------- */
  const PERMISOS = A.PERMISOS = [['inv.ingreso', 'Ingresar mercadería'], ['lote.bloquear', 'Bloquear lotes'], ['paciente', 'Registrar pacientes'], ['cuenta.cargo.servicio', 'Cargar servicios'], ['cuenta.cargo.producto', 'Cargar productos'], ['cuenta.facturar', 'Cobrar y facturar'], ['nota.credito', 'Anular y nota de crédito'], ['descuento.resolver', 'Autorizar descuento social'], ['farmacia', 'Despachar farmacia'], ['inv.enviar', 'Enviar traslados'], ['inv.ajuste', 'Pedir ajustes'], ['ajuste.aprobar', 'Aprobar ajustes'], ['inv.baja', 'Dar de baja'], ['compras.oc', 'Crear órdenes'], ['oc.aprobar', 'Aprobar órdenes'], ['compras.recibir', 'Recibir compras'], ['compras.pagar', 'Pagar proveedores'], ['config', 'Configurar el sistema']];
  A.vistas.usuarios = {
    html() {
      const roles = Object.entries(C.ROLES);
      return `${A.cab('Usuarios', 'Cada persona tiene un rol. El rol decide qué ve y qué puede hacer.', `<button class="btn pri" data-a="nuevo">${U.ic('plus')}Nuevo usuario</button>`)}
        <section class="seccion">${U.tabla({ contar: false, filas: db().usuarios, cols: [{ t: 'Puesto', h: u => `<span class="con-av">${Dibujo.avatar(u.rol, 36)}<span>${e(u.nombre)}<span class="t-sub">${e(u.disp)}</span></span></span>` }, { t: 'Rol', h: u => e(C.ROLES[u.rol].nombre) }, { t: 'Estado', h: u => u.activo ? U.et('Activo', 'bien') : U.et('Inactivo') }, { t: '', der: 1, h: u => U.lapiz('editar', u.id) }] })}</section>
        <section class="seccion"><h2>Quién puede qué</h2>${U.tabla({ contar: false, por: 40, filas: PERMISOS, id: r => r[0], cols: [{ t: 'Permiso', h: r => e(r[1]) }, { t: 'Lo tienen', h: r => roles.filter(([, x]) => x.acciones.includes(r[0])).map(([, x]) => U.et(x.nombre, 'pino')).join(' ') || U.et('Nadie') }] })}</section>`;
    },
    acc: {
      nuevo() {
        const h = U.hoja({ titulo: 'Nuevo usuario', ancho: 460, cuerpo: `<div class="campo"><label for="n">Nombre</label><input id="n" type="text"></div><div class="rejilla"><div class="campo"><label for="r">Rol</label><select id="r">${Object.entries(C.ROLES).map(([k, x]) => `<option value="${k}">${e(x.nombre)}</option>`).join('')}</select></div><div class="campo"><label for="p">PIN de 4 números</label><input id="p" type="text" inputmode="numeric" maxlength="4"></div></div>`, pie: `<button class="btn" data-cerrar>Cancelar</button><button class="btn pri" data-a="ok">Crear usuario</button>`, acciones: { async ok() { const q = s => h.cuerpo.querySelector(s).value.trim(); const r = await U.hacer('usuario.crear', { nombre: q('#n'), rol: q('#r'), pin: q('#p') }, true); if (r.ok) h.cerrar(); } } });
      },
      editar(id) {
        const u = db().ix.usr.get(id);
        const h = U.hoja({ titulo: 'Editar usuario', sub: u.nombre, ancho: 440, cuerpo: `<div class="campo"><label for="r">Rol</label><select id="r">${Object.entries(C.ROLES).map(([k, x]) => `<option value="${k}" ${k === u.rol ? 'selected' : ''}>${e(x.nombre)}</option>`).join('')}</select></div><label class="peq"><input type="checkbox" id="ac" ${u.activo ? 'checked' : ''}> Usuario activo</label>`, pie: `<button class="btn" data-cerrar>Cancelar</button><button class="btn pri" data-a="ok">Guardar</button>`, acciones: { async ok() { const r = await U.hacer('usuario.guardar', { id, rol: h.cuerpo.querySelector('#r').value, activo: h.cuerpo.querySelector('#ac').checked }, 'Usuario actualizado.'); if (r.ok) h.cerrar(); } } });
      },
    },
  };

  /* ---------- configuración ---------- */
  A.vistas.config = {
    html() {
      const c = db().cfg;
      const dato = (t, v) => `<div><span>${e(t)}</span><b>${e(v)}</b></div>`;
      return `${A.cab('Configuración', 'Lo que aquí se cambia afecta a todo el hospital. Se edita solo con el botón.', `<button class="btn pri" data-a="editar">${U.ic('pencil')}Editar</button>`)}
        <h2 style="font-size:1.125rem;margin-bottom:12px">Datos fiscales</h2><div class="ficha">${dato('Nombre', c.nombre)}${dato('NIT', c.nit)}${dato('Dirección', c.direccion)}${dato('Documento de venta', c.doc === 'certificador' ? 'Factura con certificador' : 'Comprobante interno')}</div>
        <div class="nota info">${U.ic('info')}<span>El certificador es opcional. Sin él, el sistema da comprobante interno y la factura legal se hace en la Agencia Virtual de la SAT y se anota en la venta.</span></div>
        <h2 style="font-size:1.125rem;margin-bottom:12px">Reglas</h2><div class="ficha">${dato('IVA', c.ivaPct + ' %')}${dato('Servicios', c.serviciosExentos ? 'Exentos, asistencia social' : 'Gravados')}${dato('Método de inventario', c.metodo)}${dato('Aprobación desde', Q(c.limiteAprobacion))}${dato('Alerta de vencimiento', c.diasVence + ' días')}${dato('Retención ISR', c.retISR ? 'Activa' : 'Inactiva')}${dato('Retención IVA', c.retIVA ? 'Activa' : 'No calificado por SAT')}</div>
        <div class="nota">${U.ic('triangle-alert')}<span>Por confirmar con SAT antes de implementar: si los servicios del hospital entran en la exención de asistencia social (Decreto 27-92, Art. 7 num. 13) y el trato de IVA de la venta de medicinas no genéricas.</span></div>
        <section class="seccion"><h2>Colores del sistema</h2><p class="mudo" style="margin-bottom:12px">Cambia todo el diseño: menú, pantallas, botones, mapa y edificios.</p><div class="tonos"><button class="tono" data-a="tono" data-id="areas" aria-pressed="${Tema.fijo() == null}"><i class="multi"></i>Un color por área</button>${Object.entries(Tema.TONOS).map(([k, t]) => `<button class="tono" data-a="tono" data-id="${t.h}" style="--t:${t.h}" aria-pressed="${Tema.fijo() === t.h}"><i></i>${e(t.nombre)}</button>`).join('')}</div></section>
`;
    },
    acc: {
      tono(h) { Tema.guardar(h === 'areas' ? null : +h); },
      editar() {
        const c = db().cfg;
        const h = U.hoja({
          titulo: 'Editar configuración', ancho: 520, cuerpo: `<div class="rejilla"><div class="campo ancho"><label for="di">Dirección</label><input id="di" type="text" value="${e(c.direccion)}"></div><div class="campo"><label for="li">Aprobación desde</label><input id="li" type="number" step="0.01" value="${c.limiteAprobacion.toFixed(2)}"></div><div class="campo"><label for="dv">Alerta de vencimiento, días</label><input id="dv" type="number" value="${c.diasVence}"></div><div class="campo ancho"><label for="dc">Documento de venta</label><select id="dc"><option value="interno" ${c.doc === 'interno' ? 'selected' : ''}>Comprobante interno, sin certificador</option><option value="certificador" ${c.doc === 'certificador' ? 'selected' : ''}>Factura con certificador (opcional)</option></select></div></div><label class="peq"><input type="checkbox" id="se" ${c.serviciosExentos ? 'checked' : ''}> Servicios exentos de IVA por asistencia social</label>`,
          pie: `<button class="btn" data-cerrar>Cancelar</button><button class="btn pri" data-a="ok">Guardar</button>`,
          acciones: { async ok() { const q = s => h.cuerpo.querySelector(s); const r = await U.hacer('config.guardar', { direccion: q('#di').value, limiteAprobacion: +q('#li').value, diasVence: +q('#dv').value, doc: q('#dc').value, serviciosExentos: q('#se').checked }, 'Configuración guardada.'); if (r.ok) h.cerrar(); } },
        });
      },
      async reiniciar() { if (await U.confirmar({ titulo: 'Reiniciar el demo', texto: 'Se pierde todo lo registrado durante la demostración en este navegador.', si: 'Reiniciar', peligro: true })) M.reiniciar(); },
    },
  };
})(window);
