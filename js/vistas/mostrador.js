/* Mostrador de farmacia: buscar o escanear, baja del inventario, cobra y entrega documento en una sola acción. */
(function (g) {
  const { U, App: A, Motor: M, Docs } = g; const e = U.esc, Q = U.Q;
  const db = () => M.db; const BOD = 'FX';
  let topCache = null, topHora = 0;

  function masVendidos() {
    if (topCache && Date.now() - topHora < 60000) return topCache;
    const n = new Map(), desde = A.hoy() - 7 * M.DIA, cs = db().cargos;
    for (let i = cs.length - 1; i >= 0; i--) { const k = cs[i]; if (k.f < desde) break; if (k.prod && k.bod === BOD) n.set(k.prod, (n.get(k.prod) || 0) + k.cant); }
    topCache = [...n].sort((a, b) => b[1] - a[1]).slice(0, 12).map(x => db().ix.prod.get(x[0])); topHora = Date.now();
    return topCache;
  }
  const molecula = p => U.norm(p.nombre.split(' · ')[0].split(' ').slice(0, 2).join(' '));
  function alternativas(p) { const m = molecula(p); return db().productos.filter(x => x.id !== p.id && molecula(x) === m && M.disponible(db(), x.id, BOD, Date.now()) > 0); }
  const proximoLote = p => { const hoy = A.hoy(); return (db().ix.lotesDe.get(p.id) || []).find(l => l.vence >= hoy && !l.bloqueo && (l.ex[BOD] || 0) > 0); };
  function buscar(q) {
    const out = [];
    for (const p of db().productos) { if (p.cat === 'Uso interno') continue; if ((p._n || (p._n = U.norm(p.nombre + ' ' + p.cod))).includes(q)) out.push(p); if (out.length >= 12) break; }
    return out;
  }
  function tarjeta(p) {
    const hay = M.disponible(db(), p.id, BOD, Date.now()), l = proximoLote(p);
    const vence = l ? U.diasPara(l.vence, A.hoy()) : null;
    if (hay <= 0) {
      const alt = alternativas(p).slice(0, 3);
      return `<div class="prod agotado"><b>${e(p.nombre)}</b><span class="mudo">${e(p.pres)}</span>${U.et('Agotado en farmacia', 'alerta')}${alt.length ? `<span class="peq mudo">Alternativas</span>${alt.map(a => `<button class="btn chico" data-a="madd" data-id="${a.id}">${e(a.nombre)} · ${Q(a.venta)}</button>`).join('')}` : `<span class="peq mudo">En bodega central: ${U.n(M.disponible(db(), p.id, 'BC', Date.now()))}</span>`}</div>`;
    }
    return `<button class="prod" data-a="madd" data-id="${p.id}"><b>${e(p.nombre)}</b><span class="mudo">${e(p.pres)} · ${e(p.cod)}</span><span class="fila"><span class="precio">${Q(p.venta)}</span><span class="mudo num">${U.n(hay)} disp.</span></span><span class="marcas">${p.controlado ? U.et('Con receta', 'alerta') : ''}${p.generico ? U.et('Exento', 'bien') : ''}${p.frio ? U.et('Frío', 'azul') : ''}${vence != null && vence <= 90 ? U.et(`Vence en ${vence} días`, 'ambar') : ''}</span></button>`;
  }
  function totales(st) {
    let total = 0, exento = 0;
    for (const l of st.cart) { const p = db().ix.prod.get(l.prod), t = M.r2(p.venta * l.cant); total += t; if (p.generico) exento += t; }
    const grav = M.r2(total - exento), iva = M.r2(grav - grav / (1 + db().cfg.ivaPct / 100));
    return { total: M.r2(total), exento: M.r2(exento), base: M.r2(grav - iva), iva };
  }
  A.mostrador = function (st, tabs) {
    st.cart = st.cart || []; st.forma = st.forma || 'Efectivo';
    const t = A.turno(); const q = U.norm((st.mq || '').trim());
    const lista = q.length >= 2 ? buscar(q) : masVendidos();
    const tot = totales(st), rec = +st.mrec || 0, vuelto = rec - tot.total;
    const cert = db().cfg.doc === 'certificador';
    const acc = t ? `<button class="btn" data-a="mcerrar">Cerrar caja</button>` : `<button class="btn pri" data-a="mabrir">Abrir caja</button>`;
    const cobrado = t ? Object.values(t.mov).reduce((a, b) => a + b, 0) : 0;
    const ticket = st.cart.length ? st.cart.map((l, i) => {
      const p = db().ix.prod.get(l.prod), lt = proximoLote(p);
      return `<div class="tl"><div class="tl-a"><b>${e(p.nombre)}</b><span class="mudo peq">${lt ? `Sale del lote ${e(lt.num)}, vence ${U.fecha(lt.vence)}` : 'Sin lote disponible'}</span></div>
        <div class="tl-b"><span class="paso"><button data-a="mmenos" data-id="${i}" aria-label="Quitar una unidad">${U.ic('minus')}</button><b class="num">${U.n(l.cant)}</b><button data-a="mmas" data-id="${i}" aria-label="Agregar una unidad">${U.ic('plus')}</button></span><span class="num">${Q(p.venta * l.cant)}</span></div>
        ${p.controlado ? `<div class="rx"><input id="rxn${i}" type="text" data-rx="${i}|num" placeholder="Receta No." aria-label="Número de receta" value="${e(l.receta && l.receta.num || '')}"><input id="rxm${i}" type="text" data-rx="${i}|medico" placeholder="Médico" aria-label="Médico" value="${e(l.receta && l.receta.medico || '')}"><input id="rxc${i}" type="text" data-rx="${i}|colegiado" placeholder="Colegiado" aria-label="Colegiado" value="${e(l.receta && l.receta.colegiado || '')}"></div>` : ''}</div>`;
    }).join('') : `<div class="vacio"><b>Venta vacía</b>Escanee o toque un producto.</div>`;
    const ultima = st.ultima && db().ix.dte.get(st.ultima);
    return `${A.cab('Farmacia', t ? `${t.caja} · cobrado en el turno ${Q(cobrado)}` : 'Abra la caja para empezar a vender.', acc)}${tabs}
      <div class="pos">
        <div class="pos-izq">
          <div class="escaner">${U.ic('scan-barcode')}<input id="mq" type="search" data-filtro="mq" value="${e(st.mq || '')}" placeholder="Escanee o escriba nombre o código" aria-label="Buscar producto" autocomplete="off"></div>
          <div class="sub-cab" style="margin:12px 0 8px"><span class="etq">${q.length >= 2 ? `Resultados` : 'Lo más vendido esta semana'}</span><span class="peq mudo solo-grande">Enter agrega · F9 cobra</span></div>
          <div class="prods">${lista.map(tarjeta).join('') || `<div class="vacio"><b>Nada coincide</b>Revise el nombre o el código.</div>`}</div>
        </div>
        <aside class="pos-der" aria-label="Venta actual">
          ${ultima ? `<div class="nota bien">${U.ic('circle-check')}<span style="flex:1">${e(ultima.serie)}-${ultima.num} cobrada por ${Q(ultima.total)}</span><button class="ojo" data-a="mver" data-id="${ultima.id}" aria-label="Ver documento">${U.ic('eye')}</button></div>` : ''}
          <div class="ticket">${ticket}</div>
          ${st.cart.length ? `<div class="totales" style="width:100%"><div><span>Exento</span><span>${Q(tot.exento)}</span></div><div><span>Gravado</span><span>${Q(tot.base)}</span></div><div><span>IVA ${db().cfg.ivaPct} %</span><span>${Q(tot.iva)}</span></div><div class="gran"><span>Total</span><span>${Q(tot.total)}</span></div></div>
          <div class="rejilla" style="grid-template-columns:1fr 1.6fr;gap:8px"><div class="campo"><label for="mnit">NIT</label><input id="mnit" type="text" data-filtro="mnit" value="${e(st.mnit || 'CF')}"></div><div class="campo"><label for="mnom">Nombre</label><input id="mnom" type="text" data-filtro="mnom" value="${e(st.mnom || 'Consumidor final')}"></div></div>
          <div class="chips">${['Efectivo', 'Tarjeta', 'Transferencia'].map(f => `<button class="chip" data-a="mforma" data-id="${f}" aria-pressed="${f === st.forma}">${f}</button>`).join('')}</div>
          ${st.forma === 'Efectivo' ? `<div class="rejilla" style="grid-template-columns:1fr 1fr;gap:8px;align-items:end"><div class="campo"><label for="mrec">Recibido</label><input id="mrec" type="number" step="0.01" data-filtro="mrec" value="${e(st.mrec || '')}"></div><div class="vuelto"><span>${vuelto >= 0 ? 'Vuelto' : 'Falta'}</span><b class="num">${rec ? Q(Math.abs(vuelto)) : '—'}</b></div></div>` : ''}
          <button class="btn pri cobrar" data-a="mcobrar" ${t ? '' : 'disabled'}>Cobrar ${Q(tot.total)}</button>
          <p class="peq mudo">${cert ? 'Sale factura con certificador.' : 'Sale comprobante interno. La factura SAT se anota después.'}</p>` : ''}
        </aside>
      </div>`;
  };
  A.mostradorListo = function (el, st) {
    const inp = el.querySelector('#mq');
    if (inp) inp.addEventListener('keydown', ev => {
      if (ev.key !== 'Enter') return; ev.preventDefault();
      const v = U.norm(inp.value.trim()); if (!v) return;
      const exacto = db().productos.find(p => U.norm(p.cod) === v); const p = exacto || buscar(v).find(x => M.disponible(db(), x.id, BOD, Date.now()) > 0);
      if (p) agregar(p.id); else U.aviso('No hay existencia de ese producto en farmacia.', 'mal');
    });
    el.querySelectorAll('[data-rx]').forEach(i => i.addEventListener('input', () => { const [n, k] = i.dataset.rx.split('|'); const l = st.cart[+n]; l.receta = l.receta || {}; l.receta[k] = i.value.trim(); }));
    if (!document.activeElement || document.activeElement === document.body) if (inp && matchMedia('(pointer: fine)').matches) inp.focus({ preventScroll: true });
  };
  function agregar(id) {
    const st = A.st.farmacia, ya = st.cart.find(l => l.prod === id);
    const hay = M.disponible(db(), id, BOD, Date.now());
    if ((ya ? ya.cant : 0) + 1 > hay) return U.aviso(`Solo hay ${U.n(hay)} disponibles en farmacia.`, 'mal');
    if (ya) ya.cant++; else st.cart.push({ prod: id, cant: 1 });
    st.mq = ''; A.repintar();
    const i = document.getElementById('mq'); if (i && matchMedia('(pointer: fine)').matches) i.focus({ preventScroll: true });
  }
  async function cobrar() {
    const st = A.st.farmacia, t = A.turno(); if (!t) return U.aviso('Abra la caja antes de vender.', 'mal');
    if (!st.cart.length) return;
    const tot = totales(st);
    if (st.forma === 'Efectivo' && st.mrec && +st.mrec < tot.total) return U.aviso(`Faltan ${Q(tot.total - +st.mrec)} para completar el pago.`, 'mal');
    const r = await U.hacer('venta.directa', { items: st.cart.map(l => ({ prod: l.prod, bod: BOD, cant: l.cant, receta: l.receta })), turno: t.id, nit: st.mnit || 'CF', nombre: st.mnom || 'Consumidor final', pagos: [{ forma: st.forma, monto: tot.total }] }, true);
    if (r.ok) { st.cart = []; st.mrec = ''; st.mnit = ''; st.mnom = ''; st.ultima = r.id; A.repintar(); }
  }
  Object.assign(A.vistas.farmacia.acc, {
    madd: id => agregar(id), mver: id => Docs.dte(id), mabrir() { A.vistas.caja.acc.abrir(); }, mcerrar() { A.vistas.caja.acc.cerrar(); }, mcobrar: cobrar,
    mmas(i) { const st = A.st.farmacia, l = st.cart[+i]; if (l.cant + 1 > M.disponible(db(), l.prod, BOD, Date.now())) return U.aviso('No hay más disponible en farmacia.', 'mal'); l.cant++; A.repintar(); },
    mmenos(i) { const st = A.st.farmacia, l = st.cart[+i]; l.cant--; if (l.cant <= 0) st.cart.splice(+i, 1); A.repintar(); },
    mforma(f) { A.st.farmacia.forma = f; A.repintar(); },
  });
  addEventListener('keydown', ev => {
    if (!M.sesion || !location.hash.startsWith('#/farmacia') || (location.hash.split('/')[2] || 'mostrador') !== 'mostrador' || U.pila.length) return;
    if (ev.key === 'F9') { ev.preventDefault(); cobrar(); }
    if (ev.key === 'F2') { ev.preventDefault(); const i = document.getElementById('mq'); if (i) i.focus({ preventScroll: true }); }
  });
})(window);
