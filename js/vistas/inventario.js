/* Inventario y compras. */
(function (g) {
  const { U, App: A, Motor: M, Docs } = g; const e = U.esc, Q = U.Q;
  const db = () => M.db;

  A.pedirTraslado = function (destino) {
    const bods = db().bodegas;
    A.lineas({
      titulo: 'Pedir traslado', sub: 'Bodega central lo envía y usted confirma al recibir', modo: 'traslado', ok: 'Enviar solicitud',
      arriba: `<div class="rejilla"><div class="campo"><label for="de">De</label><select id="de">${bods.map(b => `<option value="${b.id}">${e(b.nombre)}</option>`).join('')}</select></div><div class="campo"><label for="a">Para</label><select id="a">${bods.map(b => `<option value="${b.id}" ${b.id === destino ? 'selected' : ''}>${e(b.nombre)}</option>`).join('')}</select></div></div>`,
      bod: h => h.cuerpo.querySelector('#de').value,
      async alAceptar(items, h) { const r = await U.hacer('traslado.pedir', { de: h.cuerpo.querySelector('#de').value, a: h.cuerpo.querySelector('#a').value, items: items.map(({ bod, ...x }) => x) }, true); return r.ok; },
    });
  };
  const pideLote = (o) => {
    const ls = db().lotes.filter(l => (o.bod ? (l.ex[o.bod] || 0) > 0 : Object.values(l.ex).some(n => n > 0)));
    return ls;
  };

  /* ---------- inventario ---------- */
  A.vistas.inventario = {
    ruta: p => ({ existencias: 'Existencias', vencimientos: 'Vencimientos', kardex: 'Kárdex', traslados: 'Traslados', ajustes: 'Ajustes y bajas', conteo: 'Conteo físico' }[(p[1] || 'existencias').split('?')[0]]),
    html(st, p) {
      const tab = (p[1] || 'existencias').split('?')[0]; const d = db();
      if ((p[1] || '').includes('?bajo')) st.fb = 'bajo';
      const hoy = A.hoy();
      const nVenc = d.lotes.filter(l => l.vence < hoy + 30 * M.DIA && Object.values(l.ex).some(n => n > 0)).length;
      const nTr = d.traslados.filter(t => t.estado === 'solicitado' || t.estado === 'en camino').length;
      const nAj = d.ajustes.filter(a => a.estado === 'pendiente').length;
      const tabs = U.tabs([{ id: 'existencias', t: 'Existencias' }, { id: 'vencimientos', t: 'Vencimientos', n: nVenc }, { id: 'kardex', t: 'Kárdex' }, { id: 'traslados', t: 'Traslados', n: nTr }, { id: 'ajustes', t: 'Ajustes y bajas', n: nAj }, { id: 'conteo', t: 'Conteo físico' }], tab, 'inventario');
      return ({ existencias, vencimientos, kardex, traslados, ajustes, conteo }[tab])(st, tabs);
    },
    acc: {
      fb(id) { A.st.inventario.fb = id; A.st.inventario.pag_t = 0; A.repintar(); },
      prod: id => A.fichaProducto(id), nuevo() { A.formProducto(null); },
      vk(id) { A.st.inventario.kp = id; location.hash = '#/inventario/kardex'; },
      traslado() { A.pedirTraslado('FX'); }, tver(id) { verTraslado(id); }, bajaLote(id) { formBaja(id); },
      masInv() {
        const h = U.hoja({
          titulo: 'Más acciones', dialogo: true,
          cuerpo: `<div class="pend">${A.puede('donacion') ? `<a class="fila-pend" href="#" data-a="d">${U.ic('gift')}<span class="q">Entrada por donación</span></a>` : ''}${A.puede('producto') ? `<a class="fila-pend" href="#" data-a="n">${U.ic('plus')}<span class="q">Nuevo producto</span></a>` : ''}<a class="fila-pend" href="#" data-a="x">${U.ic('download')}<span class="q">Descargar existencias en Excel</span></a></div>`,
          acciones: { d() { h.cerrar(); formDonacion(); }, n() { h.cerrar(); A.formProducto(null); }, x() { h.cerrar(); A.vistas.inventario.acc.exp(); } },
        });
      },
      don() { formDonacion(); }, ajuste() { formAjuste(); }, baja() { formBaja(); }, conteo() { formConteo(); },
      ajv(id) { resolverAjuste(id); },
      exp() { U.csv('existencias', [['Código', 'Producto', 'Categoría', 'Existencia', 'Costo promedio', 'Valor'], ...db().productos.map(p => [p.cod, p.nombre, p.cat, p.qty, M.r2(M.promedio(p)), M.r2(p.valor)])]); },
      kexp() { const id = A.st.inventario.kp; const p = db().ix.prod.get(id); U.csv('kardex-' + p.cod, [['Fecha', 'Movimiento', 'Documento', 'Bodega', 'Cantidad', 'Saldo', 'Costo', 'Valor'], ...(db().ix.movsDe.get(id) || []).map(m => [U.fh(m.f), m.t, m.d, m.b, m.c, m.s, m.u, m.v])]); },
    },
    despues(el, st) {
      const s = el.querySelector('#kselect'); if (!s) return;
      U.selector(s, { ph: 'Buscar producto', valor: st.kp ? db().ix.prod.get(st.kp).nombre : '', limpiar: false, buscar: q => db().productos.filter(p => (p._n || (p._n = U.norm(p.nombre + ' ' + p.cod))).includes(q)).map(p => ({ txt: p.nombre, sub: p.cod, id: p.id })), alElegir(x) { st.kp = x.id; st.pag_k = 0; A.repintar(); } });
    },
  };
  function existencias(st, tabs) {
    const d = db(), q = U.norm(st.bi || ''), f = st.fb || 'todos', bod = st.bb || '';
    let filas = d.productos.filter(p => {
      if (q && !(p._n || (p._n = U.norm(p.nombre + ' ' + p.cod))).includes(q)) return false;
      if (f === 'bajo' && p.qty >= p.min) return false;
      if (f === 'ctrl' && !p.controlado) return false;
      if (f === 'frio' && !p.frio) return false;
      if (bod && !(p.ex[bod] > 0)) return false;
      return true;
    });
    const valor = d.productos.reduce((a, p) => a + p.valor, 0);
    const pri = A.puede('inv.solicitar') ? `<button class="btn pri" data-a="traslado">${U.ic('arrow-left-right')}Pedir traslado</button>` : '';
    const mas = `<button class="btn" data-a="masInv">${U.ic('ellipsis')}Más</button>`;
    return `${A.cab('Inventario', `${U.n(d.productos.length)} productos en ${d.bodegas.length} bodegas · valor ${Q(valor)} · método: ${d.cfg.metodo.toLowerCase()}`, mas + pri)}${tabs}
      <div class="filtros">${U.busca('bi', st.bi, 'Nombre o código')}<select id="bb" data-filtro="bb" aria-label="Bodega" style="width:auto"><option value="">Todas las bodegas</option>${d.bodegas.map(b => `<option value="${b.id}" ${b.id === bod ? 'selected' : ''}>${e(b.nombre)}</option>`).join('')}</select>${U.chips([['todos', 'Todos'], ['bajo', 'Bajo mínimo'], ['ctrl', 'Controlados'], ['frio', 'Cadena de frío']], f, 'fb')}</div>
      ${U.tabla({ filas, pag: st.pag_t, clic: 'prod', vacioT: 'Ningún producto coincide', cols: [{ t: 'Producto', h: p => `${e(p.nombre)}<span class="t-sub">${e(p.cod)} · ${e(p.pres)}</span>` }, { t: 'Marcas', h: p => (p.controlado ? U.et('Controlado', 'alerta') : '') + (p.frio ? U.et('Frío', 'azul') : '') + (p.qty < p.min ? ' ' + U.et('Bajo mínimo', 'ambar') : '') }, { t: bod ? 'En bodega' : 'Existencia', der: 1, h: p => U.n(bod ? p.ex[bod] : p.qty) }, { t: 'Costo prom.', der: 1, h: p => Q(M.promedio(p)) }, { t: 'Valor', der: 1, h: p => Q(p.valor) }] })}`;
  }
  function vencimientos(st, tabs) {
    const d = db(), hoy = A.hoy(), f = st.fv || 'alerta';
    const lim = hoy + d.cfg.diasVence * M.DIA;
    const filas = d.lotes.filter(l => Object.values(l.ex).some(n => n > 0) && (f === 'vencido' ? l.vence < hoy : l.vence < lim)).sort((a, b) => a.vence - b.vence);
    const valor = filas.reduce((a, l) => a + Object.values(l.ex).reduce((x, y) => x + y, 0) * l.costo, 0);
    return `${A.cab('Inventario', `${U.n(filas.length)} lotes en riesgo por ${Q(valor)}. Lo vencido ya no se despacha ni se traslada.`, A.puede('inv.baja') ? `<button class="btn pri" data-a="baja">Dar de baja</button>` : '')}${tabs}
      <div class="filtros">${U.chips([['alerta', `Próximos ${d.cfg.diasVence} días`], ['vencido', 'Vencidos']], f, 'fvc')}</div>
      ${U.tabla({ filas, pag: st.pag_t, clic: 'lp', id: l => l.prod, vacioT: 'Sin lotes en riesgo', cols: [{ t: 'Producto', h: l => `${e(d.ix.prod.get(l.prod).nombre)}<span class="t-sub">Lote ${e(l.num)} · ${e(l.fondo)}</span>` }, { t: 'Vence', h: l => A.etVence(l.vence) }, { t: 'Dónde', h: l => Object.entries(l.ex).filter(([, n]) => n > 0).map(([b, n]) => `${e(M.nomBod(d, b))} ${U.n(n)}`).join(', ') }, { t: 'Valor', der: 1, h: l => Q(Object.values(l.ex).reduce((x, y) => x + y, 0) * l.costo) }, { t: '', der: 1, h: l => l.vence < hoy && A.puede('inv.baja') ? `<button class="btn chico" data-a="bajaLote" data-id="${l.id}">Baja</button>` : '' }] })}`;
  }
  A.vistas.inventario.acc.fvc = id => { A.st.inventario.fv = id; A.repintar(); };
  A.vistas.inventario.acc.lp = id => A.fichaProducto(id);
  function kardex(st, tabs) {
    const id = st.kp; const p = id ? db().ix.prod.get(id) : null;
    const movs = id ? (db().ix.movsDe.get(id) || []).slice().reverse() : [];
    return `${A.cab('Inventario', 'Cada entrada y salida con documento, usuario, saldo y costo promedio.', id ? `<button class="btn" data-a="kexp">${U.ic('download')}Excel</button>` : '')}${tabs}
      <div class="campo" style="max-width:520px;margin-bottom:16px"><span class="etq">Producto</span><div id="kselect"></div></div>
      ${id ? `<div class="cifras"><div class="cifra"><span>Saldo</span><b>${U.n(p.qty)}</b></div><div class="cifra"><span>Costo promedio</span><b>${Q(M.promedio(p))}</b></div><div class="cifra"><span>Valor</span><b>${Q(p.valor)}</b></div></div>${A.tablaKardex(movs, { pag: st.pag_k, nombre: 'k', por: 30, contar: true })}` : `<div class="tabla-marco"><div class="vacio"><b>Elija un producto</b>El kárdex muestra su historia completa desde la apertura.</div></div>`}`;
  }
  function traslados(st, tabs) {
    const filas = db().traslados.slice().reverse();
    return `${A.cab('Inventario', 'Solicita quien necesita, envía quien tiene y confirma quien recibe.', A.puede('inv.solicitar') ? `<button class="btn pri" data-a="traslado">${U.ic('plus')}Pedir traslado</button>` : '')}${tabs}
      ${U.tabla({ filas, pag: st.pag_t, clic: 'tver', vacioT: 'Sin traslados', cols: [{ t: 'Traslado', h: t => `${e(t.num)}<span class="t-sub">${e(M.nomBod(db(), t.de))} → ${e(M.nomBod(db(), t.a))}</span>` }, { t: 'Pidió', h: t => `${e(A.nomU(t.us))}<span class="t-sub">${U.fh(t.f)}</span>` }, { t: 'Estado', h: t => A.etEstado(t.estado) }, { t: 'Productos', der: 1, h: t => t.items.length }] })}`;
  }
  function verTraslado(id) {
    const t = db().ix.tras.get(id);
    const puedeE = t.estado === 'solicitado' && A.puede('inv.enviar'), puedeR = t.estado === 'en camino' && A.puede('inv.recibir');
    const h = U.hoja({
      titulo: t.num, sub: `${M.nomBod(db(), t.de)} → ${M.nomBod(db(), t.a)}`, ancho: 600,
      cuerpo: `<p>${A.etEstado(t.estado)}</p>${U.tabla({ contar: false, por: 100, filas: t.items, cols: [{ t: 'Producto', h: i => e(db().ix.prod.get(i.prod).nombre) }, { t: 'Disponible en origen', der: 1, h: i => U.n(M.disponible(db(), i.prod, t.de, Date.now())) }, { t: 'Cantidad', der: 1, h: i => U.n(i.cant) }] })}`,
      pie: puedeE ? `<button class="btn pri" data-a="enviar">Enviar</button>` : puedeR ? `<button class="btn pri" data-a="recibir">Confirmar recepción</button>` : '',
      acciones: { async enviar() { const r = await U.hacer('traslado.enviar', { id }, true); if (r.ok) h.cerrar(); }, async recibir() { const r = await U.hacer('traslado.recibir', { id }, true); if (r.ok) h.cerrar(); } },
    });
  }
  function ajustes(st, tabs) {
    const pend = db().ajustes.filter(a => a.estado === 'pendiente'), hechos = db().ajustes.filter(a => a.estado !== 'pendiente').reverse(), bajas = db().bajas.slice().reverse();
    const col = [{ t: 'Ajuste', h: a => `${e(a.num)}<span class="t-sub">${e(db().ix.prod.get(a.prod).nombre)}</span>` }, { t: 'Bodega', h: a => e(M.nomBod(db(), a.bod)) }, { t: 'Motivo', h: a => e(a.motivo) }, { t: 'Pidió', h: a => e(A.nomU(a.us)) }, { t: 'Estado', h: a => A.etEstado(a.estado) }, { t: 'Cantidad', der: 1, h: a => (a.cant > 0 ? '+' : '') + U.n(a.cant) }];
    return `${A.cab('Inventario', 'Ningún ajuste entra sin que otra persona lo apruebe.', `${A.puede('inv.baja') ? `<button class="btn" data-a="baja">Dar de baja</button>` : ''}${A.puede('inv.ajuste') ? `<button class="btn pri" data-a="ajuste">${U.ic('plus')}Pedir ajuste</button>` : ''}`)}${tabs}
      <section class="seccion"><h2>Por aprobar</h2>${U.tabla({ contar: false, filas: pend, clic: A.puede('ajuste.aprobar') ? 'ajv' : null, vacioT: 'Nada por aprobar', cols: col })}</section>
      <section class="seccion"><h2>Bajas con acta</h2>${U.tabla({ contar: false, filas: bajas, vacioT: 'Sin bajas registradas', vacio: 'Vencidos, rotura o deterioro: con acta notarial y respaldo.', cols: [{ t: 'Baja', h: b => `${e(b.num)}<span class="t-sub">${e(db().ix.prod.get(b.prod).nombre)}</span>` }, { t: 'Motivo', h: b => e(b.motivo) + (b.generaIVA ? ' ' + U.et('Genera IVA', 'ambar') : '') }, { t: 'Acta', h: b => e(b.acta) }, { t: 'Cantidad', der: 1, h: b => U.n(b.cant) }, { t: 'Costo', der: 1, h: b => Q(b.costo) }] })}</section>
      <section class="seccion"><h2>Ajustes resueltos</h2>${U.tabla({ filas: hechos, pag: st.pag_h, nombre: 'h', vacioT: 'Sin ajustes resueltos', cols: col })}</section>`;
  }
  function resolverAjuste(id) {
    const a = db().ix.aj.get(id), p = db().ix.prod.get(a.prod);
    const h = U.hoja({ titulo: a.num, sub: p.nombre, ancho: 460, cuerpo: `<div class="ficha" style="margin:0"><div><span>Bodega</span><b>${e(M.nomBod(db(), a.bod))}</b></div><div><span>Diferencia</span><b>${a.cant > 0 ? '+' : ''}${U.n(a.cant)}</b></div><div><span>Efecto</span><b>${Q(a.cant * M.promedio(p))}</b></div></div><p>${e(a.motivo)}</p><p class="peq mudo">Pidió ${e(A.nomU(a.us))}, ${U.fh(a.f)}</p>`, pie: `<button class="btn" data-a="no">Rechazar</button><button class="btn pri" data-a="si">Aprobar</button>`, acciones: { async si() { const r = await U.hacer('ajuste.resolver', { id, aprobar: true }, true); if (r.ok) h.cerrar(); }, async no() { const r = await U.hacer('ajuste.resolver', { id, aprobar: false }, true); if (r.ok) h.cerrar(); } } });
  }
  function selLote(h, bodSel, alElegir, ciego) {
    return U.selector(h.cuerpo.querySelector('#lt'), {
      ph: 'Producto o número de lote', limpiar: false, buscar(q) {
        const b = bodSel(); const out = [];
        for (const l of db().lotes) { if (out.length >= 25) break; if (!(l.ex[b] > 0)) continue; const p = db().ix.prod.get(l.prod); if ((p._n || (p._n = U.norm(p.nombre + ' ' + p.cod))).includes(q) || l.num.toLowerCase().includes(q)) out.push({ txt: `${p.nombre} · lote ${l.num}`, sub: `${ciego ? '' : `Existencia ${U.n(l.ex[b])} · `}vence ${U.fecha(l.vence)}`, id: l.id }); }
        return out;
      }, alElegir,
    });
  }
  function formAjuste() {
    let lote = null;
    const bods = db().bodegas;
    const h = U.hoja({
      titulo: 'Pedir ajuste', sub: 'Otra persona debe aprobarlo', ancho: 520,
      cuerpo: `<div class="campo"><label for="bd">Bodega</label><select id="bd">${bods.map(b => `<option value="${b.id}">${e(b.nombre)}</option>`).join('')}</select></div><div class="campo"><span class="etq">Lote</span><div id="lt"></div></div><div class="campo"><label for="ca">Diferencia (negativa si falta)</label><input id="ca" type="number"></div><div class="campo"><label for="mo">Motivo</label><textarea id="mo"></textarea></div>`,
      pie: `<button class="btn pri" data-a="ok">Enviar para aprobación</button>`,
      acciones: { async ok() { const q = s => h.cuerpo.querySelector(s); const r = await U.hacer('ajuste.pedir', { lote, bod: q('#bd').value, cant: +q('#ca').value, motivo: q('#mo').value.trim() }, true); if (r.ok) h.cerrar(); } },
      alAbrir(hh) { selLote(hh, () => hh.cuerpo.querySelector('#bd').value, x => { lote = x.id; }); },
    });
  }
  function formBaja(idLote) {
    let lote = idLote || null; const l0 = idLote && db().ix.lote.get(idLote);
    const bodIni = l0 ? Object.keys(l0.ex).find(b => l0.ex[b] > 0) : 'BC';
    const h = U.hoja({
      titulo: 'Dar de baja', sub: l0 ? `${db().ix.prod.get(l0.prod).nombre} · lote ${l0.num}` : 'Sale del inventario con acta', ancho: 540,
      cuerpo: `<div class="nota info">${U.ic('info')}<span>Rotura: dictamen de experto y acta notarial. Destrucción o descomposición: auditor de SAT, o acta notarial y declaración jurada si no llega en 30 días hábiles. Un faltante genera IVA.</span></div>
        <div class="campo"><label for="bd">Bodega</label><select id="bd">${db().bodegas.map(b => `<option value="${b.id}" ${b.id === bodIni ? 'selected' : ''}>${e(b.nombre)}</option>`).join('')}</select></div>
        ${l0 ? '' : `<div class="campo"><span class="etq">Lote</span><div id="lt"></div></div>`}
        <div class="rejilla"><div class="campo"><label for="ca">Cantidad</label><input id="ca" type="number" value="${l0 ? l0.ex[bodIni] : ''}"></div><div class="campo"><label for="mo">Motivo</label><select id="mo">${['Vencido', 'Rotura', 'Deterioro', 'Faltante'].map(x => `<option>${x}</option>`).join('')}</select></div></div>
        <div class="campo"><label for="ac">Acta No.</label><input id="ac" type="text"></div>`,
      pie: `<button class="btn peligro" data-a="ok">Dar de baja</button>`,
      acciones: { async ok() { const q = s => h.cuerpo.querySelector(s); const r = await U.hacer('baja.crear', { lote, bod: q('#bd').value, cant: +q('#ca').value, motivo: q('#mo').value, acta: q('#ac').value.trim() }, true); if (r.ok) h.cerrar(); } },
      alAbrir(hh) { if (!l0) selLote(hh, () => hh.cuerpo.querySelector('#bd').value, x => { lote = x.id; }); },
    });
  }
  function formDonacion() {
    A.lineas({
      titulo: 'Entrada por donación', sub: 'Entra a Bodega central con fondo Donación y recibo RDON', modo: 'donacion', ok: 'Registrar', ancho: 680,
      arriba: `<div class="rejilla"><div class="campo"><label for="dn">Donante</label><input id="dn" type="text"></div><div class="campo"><label for="nt">NIT</label><input id="nt" type="text" value="CF"></div></div>`,
      async alAceptar(items, h) { const r = await U.hacer('donacion.entrada', { donante: h.cuerpo.querySelector('#dn').value.trim(), nit: h.cuerpo.querySelector('#nt').value.trim(), items }, true); return r.ok; },
    });
  }
  function conteo(st, tabs) {
    const filas = db().conteos.slice().reverse();
    return `${A.cab('Inventario', 'Conteo a ciegas desde un teléfono: quien cuenta no ve la existencia del sistema.', A.puede('inv.conteo') ? `<button class="btn pri" data-a="conteo">${U.ic('scan-barcode')}Nuevo conteo</button>` : '')}${tabs}
      ${U.tabla({ filas, pag: st.pag_t, vacioT: 'Aún no hay conteos', vacio: 'Las diferencias se convierten en ajustes por aprobar.', cols: [{ t: 'Conteo', h: c => `${e(c.num)}<span class="t-sub">${e(M.nomBod(db(), c.bod))}</span>` }, { t: 'Fecha', h: c => U.fh(c.f) }, { t: 'Contó', h: c => e(A.nomU(c.us)) }, { t: 'Líneas', der: 1, h: c => c.lineas.length }, { t: 'Diferencias', der: 1, h: c => c.lineas.filter(x => x.dif).length }] })}`;
  }
  function formConteo() {
    const L = [];
    const h = U.hoja({
      titulo: 'Nuevo conteo', sub: 'Escriba lo que hay físicamente', ancho: 560,
      cuerpo: `<div class="campo"><label for="bd">Bodega</label><select id="bd">${db().bodegas.map(b => `<option value="${b.id}">${e(b.nombre)}</option>`).join('')}</select></div><div class="campo"><span class="etq">Agregar lote</span><div id="lt"></div></div><div class="lineas" id="ls"></div>`,
      pie: `<button class="btn pri" data-a="ok">Registrar conteo</button>`,
      acciones: { async ok() { h.cuerpo.querySelectorAll('[data-ct]').forEach(i => L[+i.dataset.ct].contado = +i.value); if (!L.length) return U.aviso('Agregue al menos un lote.', 'mal'); const r = await U.hacer('conteo.crear', { bod: h.cuerpo.querySelector('#bd').value, lineas: L.map(l => ({ lote: l.lote, contado: l.contado })) }, true); if (r.ok) h.cerrar(); } },
      alAbrir(hh) { const s = selLote(hh, () => hh.cuerpo.querySelector('#bd').value, x => { hh.cuerpo.querySelectorAll('[data-ct]').forEach(i => L[+i.dataset.ct].contado = +i.value); L.push({ lote: x.id, txt: x.txt, contado: 0 }); s.input.value = ''; hh.cuerpo.querySelector('#ls').innerHTML = L.map((l, i) => `<div class="linea"><div>${e(l.txt)}</div><label class="peq">Contado <input type="number" data-ct="${i}" value="${l.contado}" style="width:96px"></label></div>`).join(''); }, true); },
    });
  }

  /* ---------- compras ---------- */
  A.vistas.compras = {
    ruta: p => ({ solicitudes: 'Solicitudes', ordenes: 'Órdenes', recepcion: 'Recepción', pagar: 'Por pagar', proveedores: 'Proveedores' }[p[1] || 'ordenes']),
    html(st, p) {
      const tab = p[1] || 'ordenes', d = db();
      const tabs = U.tabs([{ id: 'solicitudes', t: 'Solicitudes', n: d.solicitudes.filter(s => s.estado === 'pendiente').length }, { id: 'ordenes', t: 'Órdenes', n: d.ocs.filter(o => o.estado === 'por aprobar').length }, { id: 'recepcion', t: 'Recepción', n: d.ocs.filter(o => ['aprobada', 'parcial'].includes(o.estado)).length }, { id: 'pagar', t: 'Por pagar' }, { id: 'proveedores', t: 'Proveedores' }], tab, 'compras');
      return ({ solicitudes, ordenes, recepcion, pagar, proveedores }[tab])(st, tabs);
    },
    acc: {
      oc: id => verOC(id), rec: id => Docs.rec(id), nuevaOC: () => formOC(), sol: id => verSol(id), nuevaSol: () => formSol(), cxp: id => verCxp(id),
      recibir: id => formRecibir(id), prov: id => formProv(db().ix.prov.get(id)), nuevoProv: () => formProv(), fx(id) { A.st.compras.fx = id; A.st.compras.pag_t = 0; A.repintar(); },
    },
  };
  function solicitudes(st, tabs) {
    const filas = db().solicitudes.slice().reverse();
    return `${A.cab('Compras', 'Las áreas piden; Compras convierte en orden.', A.puede('compras.solicitar') ? `<button class="btn pri" data-a="nuevaSol">${U.ic('plus')}Nueva solicitud</button>` : '')}${tabs}
      ${U.tabla({ filas, pag: st.pag_t, clic: 'sol', vacioT: 'Sin solicitudes', cols: [{ t: 'Solicitud', h: s => `${e(s.num)}<span class="t-sub">${e(s.area)}</span>` }, { t: 'Pidió', h: s => `${e(A.nomU(s.us))}<span class="t-sub">${U.fh(s.f)}</span>` }, { t: 'Nota', h: s => e(s.nota || '—') }, { t: 'Estado', h: s => A.etEstado(s.estado) }, { t: 'Productos', der: 1, h: s => s.items.length }] })}`;
  }
  function verSol(id) {
    const s = db().ix.sol.get(id); const ok = s.estado === 'pendiente' && A.puede('compras.oc');
    const h = U.hoja({ titulo: s.num, sub: `${s.area} · ${A.nomU(s.us)}`, ancho: 600, cuerpo: `${s.nota ? `<p>${e(s.nota)}</p>` : ''}${U.tabla({ contar: false, por: 100, filas: s.items, cols: [{ t: 'Producto', h: i => e(db().ix.prod.get(i.prod).nombre) }, { t: 'Existencia', der: 1, h: i => U.n(db().ix.prod.get(i.prod).qty) }, { t: 'Pide', der: 1, h: i => U.n(i.cant) }] })}`, pie: ok ? `<button class="btn" data-a="no">Rechazar</button><button class="btn pri" data-a="oc">Crear orden de compra</button>` : '', acciones: { oc() { formOC(s, h); }, async no() { const r = await U.hacer('solicitud.rechazar', { id, motivo: '' }, true); if (r.ok) h.cerrar(); } } });
  }
  function formSol() {
    A.lineas({ titulo: 'Nueva solicitud', modo: 'solicitud', ok: 'Enviar a Compras', arriba: `<div class="campo"><label for="nt">Justificación</label><input id="nt" type="text"></div>`, async alAceptar(items, h) { const r = await U.hacer('solicitud.crear', { area: A.rol().nombre, items, nota: h.cuerpo.querySelector('#nt').value }, true); return r.ok; } });
  }
  function ordenes(st, tabs) {
    const f = st.fo || 'todas'; const filas = db().ocs.filter(o => f === 'todas' || o.estado === f).reverse();
    return `${A.cab('Compras', `Desde ${Q(db().cfg.limiteAprobacion)} la orden necesita aprobación de Dirección.`, A.puede('compras.oc') ? `<button class="btn pri" data-a="nuevaOC">${U.ic('plus')}Nueva orden</button>` : '')}${tabs}
      <div class="filtros">${U.chips([['todas', 'Todas'], ['por aprobar', 'Por aprobar'], ['aprobada', 'Aprobadas'], ['recibida', 'Recibidas']], f, 'fo')}</div>
      ${U.tabla({ filas, pag: st.pag_t, clic: 'oc', vacioT: 'Sin órdenes aquí', cols: [{ t: 'Orden', h: o => `${e(o.num)}<span class="t-sub">${e(db().ix.prov.get(o.prov).nombre)}</span>` }, { t: 'Fecha', h: o => U.fecha(o.f) }, { t: 'Fondo', h: o => o.fondo === 'Fondos públicos' ? U.et('Fondos públicos', 'azul') : e(o.fondo) }, { t: 'Estado', h: o => A.etEstado(o.estado) }, { t: 'Total', der: 1, h: o => Q(o.total) }] })}`;
  }
  A.vistas.compras.acc.fo = id => { A.st.compras.fo = id; A.st.compras.pag_t = 0; A.repintar(); };
  function verOC(id) {
    const o = db().ix.oc.get(id);
    if (o.estado === 'por aprobar' && A.puede('oc.aprobar')) {
      const h = U.hoja({ titulo: `Aprobar ${o.num}`, sub: `${db().ix.prov.get(o.prov).nombre} · ${Q(o.total)}`, ancho: 620, cuerpo: `${o.fondo === 'Fondos públicos' ? `<div class="nota info">${U.ic('landmark')}<span>Compra con fondos públicos: publicar en Guatecompras cuando supere el monto de compra directa. Fiscaliza la Contraloría.</span></div>` : ''}${U.tabla({ contar: false, por: 100, filas: o.items, cols: [{ t: 'Producto', h: i => e(db().ix.prod.get(i.prod).nombre) }, { t: 'Cant.', der: 1, h: i => U.n(i.cant) }, { t: 'Costo', der: 1, h: i => Q(i.costo) }, { t: 'Costo anterior', der: 1, h: i => Q(M.promedio(db().ix.prod.get(i.prod))) }, { t: 'Total', der: 1, h: i => Q(i.cant * i.costo) }] })}<p class="peq mudo">Elaboró ${e(A.nomU(o.us))}, ${U.fh(o.f)}</p>`, pie: `<button class="btn" data-a="no">Rechazar</button><button class="btn pri" data-a="si">Aprobar orden</button>`, acciones: { async si() { const r = await U.hacer('oc.resolver', { id, aprobar: true }, true); if (r.ok) h.cerrar(); }, async no() { const r = await U.hacer('oc.resolver', { id, aprobar: false }, true); if (r.ok) h.cerrar(); } } });
    } else Docs.oc(id);
  }
  function formOC(sol, hSol) {
    let prov = null;
    A.lineas({
      titulo: 'Nueva orden de compra', sub: sol ? `Desde ${sol.num}` : '', modo: 'oc', ok: 'Crear orden', ancho: 680,
      arriba: `<div class="campo"><span class="etq">Proveedor</span><div id="pv"></div></div><div class="rejilla"><div class="campo"><label for="fo">Fuente de fondos</label><select id="fo"><option>Propio</option><option>Fondos públicos</option><option>Donación</option></select></div><div class="campo"><label for="ng">NOG de Guatecompras</label><input id="ng" type="text"><span class="ayuda">Solo con fondos públicos.</span></div></div><button class="btn chico" data-a="extra" data-id="bajos" style="align-self:flex-start">Agregar lo que está bajo el mínimo</button>`,
      extra(id, x) { db().productos.filter(p => p.qty < p.min && p.cat !== 'Uso interno').slice(0, 30).forEach(p => x.agregar({ prod: p.id, cant: Math.max(1, p.max - p.qty), costo: p.costoRef })); },
      iniciales: sol ? sol.items.map(i => ({ prod: i.prod, cant: i.cant, costo: db().ix.prod.get(i.prod).costoRef })) : null,
      async alAceptar(items, h) {
        const q = s => h.cuerpo.querySelector(s);
        const r = await U.hacer('oc.crear', { prov, items, fondo: q('#fo').value, nog: q('#ng').value.trim(), sol: sol ? sol.id : null });
        if (r.ok) { U.aviso(r.estado === 'por aprobar' ? 'Orden creada. Pasa a Dirección por el monto.' : 'Orden creada y lista para recibir.'); if (hSol) hSol.cerrar(); }
        return r.ok;
      },
    });
    const h = U.pila[U.pila.length - 1];
    U.selector(h.cuerpo.querySelector('#pv'), { ph: 'Nombre o NIT', limpiar: false, buscar: q => db().proveedores.filter(p => U.norm(p.nombre + ' ' + p.nit).includes(q)).map(p => ({ txt: p.nombre, sub: `NIT ${p.nit} · ${p.rubro} · ${p.regimen}`, id: p.id })), alElegir(x) { prov = x.id; } });
  }
  function recepcion(st, tabs) {
    const espera = db().ocs.filter(o => ['aprobada', 'parcial'].includes(o.estado)).reverse(), hechas = db().recepciones.slice().reverse();
    return `${A.cab('Compras', 'Bodega compara lo que llegó con la orden y registra lote y vencimiento.')}${tabs}
      <section class="seccion"><h2>Por recibir</h2>${U.tabla({ contar: false, filas: espera, clic: A.puede('compras.recibir') ? 'recibir' : 'oc', vacioT: 'Nada por recibir', cols: [{ t: 'Orden', h: o => `${e(o.num)}<span class="t-sub">${e(db().ix.prov.get(o.prov).nombre)}</span>` }, { t: 'Fecha', h: o => U.fecha(o.f) }, { t: 'Estado', h: o => A.etEstado(o.estado) }, { t: 'Líneas', der: 1, h: o => o.items.length }, { t: 'Total', der: 1, h: o => Q(o.total) }] })}</section>
      <section class="seccion"><h2>Recibidas</h2>${U.tabla({ filas: hechas, pag: st.pag_t, vacioT: 'Sin recepciones', cols: [{ t: 'Recepción', h: r => `${e(r.num)}<span class="t-sub">${e(db().ix.prov.get(r.prov).nombre)}</span>` }, { t: 'Fecha', h: r => U.fecha(r.f) }, { t: 'Factura', h: r => `${e(r.serie)}-${e(r.factura)}` }, { t: 'Total', der: 1, h: r => Q(r.total) }, { t: '', der: 1, h: r => U.ojo('rec', r.id) }] })}</section>`;
  }
  function formRecibir(id) {
    const o = db().ix.oc.get(id); const falta = o.items.filter(i => (i.recibido || 0) < i.cant);
    const h = U.hoja({
      titulo: `Recibir ${o.num}`, sub: db().ix.prov.get(o.prov).nombre, ancho: 720,
      cuerpo: `<div class="rejilla"><div class="campo"><label for="se">Serie de factura</label><input id="se" type="text"></div><div class="campo"><label for="nu">Número de factura</label><input id="nu" type="text" inputmode="numeric"></div></div>
        <div class="lineas">${falta.map((i, n) => { const p = db().ix.prod.get(i.prod); return `<div class="linea" data-n="${n}"><div>${e(p.nombre)}<span class="t-sub">Pedido ${U.n(i.cant - (i.recibido || 0))} · ${Q(i.costo)}</span></div><span></span><div class="campos"><label>Recibido<input type="number" class="c" value="${i.cant - (i.recibido || 0)}"></label><label>Lote<input type="text" class="l"></label><label>Vence<input type="date" class="v"></label></div></div>`; }).join('')}</div>`,
      pie: `<button class="btn" data-a="llenar">Llenar lotes de ejemplo</button><button class="btn pri" data-a="ok">Registrar recepción</button>`,
      acciones: {
        llenar() { h.cuerpo.querySelector('#se').value ||= 'A1'; h.cuerpo.querySelector('#nu').value ||= String(10000000 + Math.floor(Math.random() * 8e7)); h.cuerpo.querySelectorAll('.linea').forEach(l => { l.querySelector('.l').value ||= 'L' + (10000 + Math.floor(Math.random() * 9e4)); l.querySelector('.v').value ||= U.iso(Date.now() + 400 * M.DIA); }); },
        async ok() {
          const q = s => h.cuerpo.querySelector(s);
          const items = [...h.cuerpo.querySelectorAll('.linea')].map((l, n) => ({ prod: falta[n].prod, costo: falta[n].costo, cant: +l.querySelector('.c').value, lote: l.querySelector('.l').value.trim(), vence: l.querySelector('.v').value ? U.deIso(l.querySelector('.v').value) : null }));
          const r = await U.hacer('compra.recibir', { oc: id, factura: { serie: q('#se').value.trim(), num: q('#nu').value.trim() }, items }, true);
          if (r.ok) { h.cerrar(); Docs.rec(r.id); }
        },
      },
    });
  }
  function pagar(st, tabs) {
    const hoy = A.hoy(), f = st.fx || 'pendiente'; const filas = db().cxp.filter(x => x.estado === f).sort((a, b) => f === 'pendiente' ? a.vence - b.vence : b.f - a.f);
    const tot = db().cxp.filter(x => x.estado === 'pendiente').reduce((a, x) => a + x.aPagar, 0);
    return `${A.cab('Compras', `Saldo con proveedores: ${Q(tot)}, ya neto de retenciones.`)}${tabs}
      <div class="filtros">${U.chips([['pendiente', 'Pendientes'], ['pagado', 'Pagados']], f, 'fx')}</div>
      ${U.tabla({ filas, pag: st.pag_t, clic: 'cxp', vacioT: 'Sin documentos aquí', cols: [{ t: 'Proveedor', h: x => `${e(db().ix.prov.get(x.prov).nombre)}<span class="t-sub">Recepción ${e(db().ix.rec.get(x.rec).num)}</span>` }, { t: 'Vence', h: x => x.estado === 'pagado' ? U.fecha(x.vence) : (x.vence < hoy ? U.et(`Venció ${U.fecha(x.vence)}`, 'alerta') : U.fecha(x.vence)) }, { t: 'Factura', der: 1, h: x => Q(x.total) }, { t: 'Retención ISR', der: 1, h: x => Q(x.ret.isr) }, { t: 'A pagar', der: 1, h: x => Q(x.aPagar) }] })}`;
  }
  function verCxp(id) {
    const x = db().ix.cxp.get(id), r = db().ix.rec.get(x.rec), p = db().ix.prov.get(x.prov); const puede = x.estado === 'pendiente' && A.puede('compras.pagar');
    const h = U.hoja({
      titulo: p.nombre, sub: `Factura ${r.serie}-${r.factura}`, ancho: 500,
      cuerpo: `<div class="ficha" style="margin:0"><div><span>Régimen</span><b>${e(p.regimen)}</b></div><div><span>Total factura</span><b>${Q(x.total)}</b></div><div><span>Retención ISR</span><b>${Q(x.ret.isr)}</b></div><div><span>A pagar</span><b>${Q(x.aPagar)}</b></div></div><div class="acciones"><button class="btn chico" data-a="rec">${U.ic('eye')}Recepción</button>${x.ret.isr ? `<button class="btn chico" data-a="con">${U.ic('eye')}Constancia</button>` : ''}</div>
        ${puede ? `<div class="rejilla"><div class="campo"><label for="fp">Forma</label><select id="fp"><option>Transferencia</option><option>Cheque</option></select></div><div class="campo"><label for="rf">Número</label><input id="rf" type="text"></div></div>` : (x.pago ? `<p>Pagado el ${U.fecha(x.pago.f)} con ${e(x.pago.forma)} ${e(x.pago.ref)}</p>` : '')}`,
      pie: puede ? `<button class="btn pri" data-a="ok">Registrar pago</button>` : '',
      acciones: { rec() { Docs.rec(r.id); }, con() { Docs.constancia(r.id); }, async ok() { const q = s => h.cuerpo.querySelector(s); const res = await U.hacer('cxp.pagar', { id, forma: q('#fp').value, ref: q('#rf').value.trim() }, true); if (res.ok) h.cerrar(); } },
    });
  }
  function proveedores(st, tabs) {
    const q = U.norm(st.bp || ''); const filas = db().proveedores.filter(p => !q || U.norm(p.nombre + ' ' + p.nit).includes(q));
    return `${A.cab('Compras', 'El régimen del proveedor define si se le retiene ISR.', A.puede('proveedor') ? `<button class="btn pri" data-a="nuevoProv">${U.ic('plus')}Nuevo proveedor</button>` : '')}${tabs}
      <div class="filtros">${U.busca('bp', st.bp, 'Nombre o NIT')}</div>
      ${U.tabla({ filas, pag: st.pag_t, vacioT: 'Sin proveedores', cols: [{ t: 'Proveedor', h: p => `${e(p.nombre)}<span class="t-sub">${e(p.cod)} · NIT ${e(p.nit)}</span>` }, { t: 'Rubro', h: p => e(p.rubro) }, { t: 'Régimen', h: p => e(p.regimen) }, { t: 'Crédito', der: 1, h: p => p.dias ? p.dias + ' días' : 'Contado' }, { t: '', der: 1, h: p => A.puede('proveedor') ? U.lapiz('prov', p.id) : '' }] })}`;
  }
  function formProv(p) {
    const v = p || { regimen: 'Sujeto a pagos trimestrales', dias: 30 };
    const h = U.hoja({
      titulo: p ? 'Editar proveedor' : 'Nuevo proveedor', ancho: 500,
      cuerpo: `<div class="rejilla"><div class="campo ancho"><label for="n">Nombre</label><input id="n" type="text" value="${e(v.nombre || '')}"></div><div class="campo"><label for="ni">NIT</label><input id="ni" type="text" value="${e(v.nit || '')}"></div><div class="campo"><label for="te">Teléfono</label><input id="te" type="tel" value="${e(v.tel || '')}"></div><div class="campo"><label for="ru">Rubro</label><input id="ru" type="text" value="${e(v.rubro || '')}"></div><div class="campo"><label for="di">Días de crédito</label><input id="di" type="number" value="${v.dias}"></div><div class="campo ancho"><label for="re">Régimen</label><select id="re">${['Sujeto a pagos trimestrales', 'Opcional simplificado', 'Pequeño contribuyente'].map(x => `<option ${x === v.regimen ? 'selected' : ''}>${x}</option>`).join('')}</select></div></div>`,
      pie: `<button class="btn" data-cerrar>Cancelar</button><button class="btn pri" data-a="ok">Guardar</button>`,
      acciones: { async ok() { const q = s => h.cuerpo.querySelector(s).value.trim(); const d = { nombre: q('#n'), nit: q('#ni'), tel: q('#te'), rubro: q('#ru'), dias: +q('#di'), regimen: q('#re') }; if (p) d.id = p.id; const r = await U.hacer('proveedor.guardar', d, 'Proveedor guardado.'); if (r.ok) h.cerrar(); } },
    });
  }
})(window);
