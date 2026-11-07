/* Ingresar mercadería por pasos. Un solo camino, sin importar de dónde vengan los datos. Solo Bodega central. */
(function (g) {
  const { U, App: A, Motor: M, Docs } = g; const e = U.esc, Q = U.Q;
  const db = () => M.db;
  const PASOS = ['Origen', 'Datos', 'Productos', 'Revisar'];
  const ORIGEN = {
    factura: ['file-text', 'Factura en mano', 'Se escribe la factura y se escanean los productos.'],
    xml: ['download', 'XML de la factura', 'Se sube el XML y el sistema llena casi todo.'],
    excel: ['clipboard-list', 'Excel', 'Para saldos iniciales o compras grandes.'],
    oc: ['shopping-cart', 'Orden de compra', 'La orden ya trae productos y costos.'],
    donacion: ['gift', 'Donación', 'Entra con fondo Donación y su recibo.'],
  };
  const nuevo = () => ({ paso: 0, origen: null, prov: null, serie: '', num: '', fecha: U.iso(Date.now()), fondo: 'Propio', uuid: null, oc: null, donante: '', nit: 'CF', tipoExcel: 'saldo', lineas: [], archivo: null, listo: null });
  const ig = st => st.ig || (st.ig = nuevo());
  const pulir = l => {
    const m = [];
    if (!l.prod) m.push('Sin relacionar con un producto');
    if (!(l.cant > 0)) m.push('Falta cantidad');
    if (!l.lote) m.push('Falta lote');
    if (!l.vence) m.push('Falta vencimiento');
    else if (U.deIso(l.vence) < A.hoy()) m.push('Ya viene vencido');
    return m;
  };
  function relacionar(txt, cod) {
    const v = U.norm(txt); if (cod) { const c = U.norm(cod); const p = db().productos.find(x => U.norm(x.cod) === c); if (p) return p; }
    const exacto = db().productos.find(p => U.norm(p.nombre) === v); if (exacto) return exacto;
    const clave = v.split(' ').filter(w => w.length > 2).slice(0, 2).join(' ');
    return clave ? db().productos.find(p => U.norm(p.nombre).startsWith(clave)) : null;
  }
  const linea = (p, x = {}) => ({ prod: p ? p.id : null, desc: x.desc || (p ? p.nombre : ''), cant: x.cant || 1, costo: x.costo != null ? x.costo : (p ? p.costoRef : 0), lote: x.lote || '', vence: x.vence || '' });

  /* ---------- lectura de archivos ---------- */
  function leerXML(txt) {
    const d = new DOMParser().parseFromString(txt, 'application/xml');
    if (d.querySelector('parsererror')) throw new Error('El archivo no es un XML válido.');
    const t = n => d.getElementsByTagNameNS('*', n)[0];
    const em = t('Emisor'), gen = t('DatosGenerales'), aut = t('NumeroAutorizacion');
    if (!em) throw new Error('El XML no parece una factura electrónica: no trae emisor.');
    const items = [...d.getElementsByTagNameNS('*', 'Item')].map(i => { const v = n => (i.getElementsByTagNameNS('*', n)[0] || {}).textContent || ''; return { desc: v('Descripcion'), cant: +v('Cantidad'), precio: +v('PrecioUnitario') }; });
    return { nit: em.getAttribute('NITEmisor'), nombre: em.getAttribute('NombreEmisor'), fecha: (gen && gen.getAttribute('FechaHoraEmision') || '').slice(0, 10), serie: aut ? aut.getAttribute('Serie') : '', num: aut ? aut.getAttribute('Numero') : '', uuid: aut ? aut.textContent.trim() : null, items };
  }
  function aplicarXML(s, x, nombre) {
    const nitL = String(x.nit).replace(/\W/g, '').toLowerCase();
    const pv = db().proveedores.find(p => p.nit.replace(/\W/g, '').toLowerCase() === nitL);
    Object.assign(s, { archivo: nombre, prov: pv ? pv.id : null, xmlProv: pv ? null : { nombre: x.nombre, nit: x.nit }, serie: x.serie || '', num: x.num || '', fecha: x.fecha || s.fecha, uuid: x.uuid });
    s.lineas = x.items.map(i => linea(relacionar(i.desc), { desc: i.desc, cant: i.cant, costo: i.precio }));
    s.paso = 2; A.repintar();
    U.aviso(`Leído: ${x.items.length} productos. Faltan lote y vencimiento.`);
  }
  function xmlEjemplo() {
    const pv = db().proveedores[0], ps = db().productos.filter(p => p.cat === 'Medicamento').slice(0, 3);
    if (!pv || !ps.length) return null;
    const it = [...ps.map(p => [p.nombre, 50, p.costoRef]), ['Producto que no está en el catálogo', 10, 12.5]];
    return `<?xml version="1.0"?><dte:GTDocumento xmlns:dte="http://www.sat.gob.gt/dte/fel/0.2.0"><dte:DatosEmision><dte:DatosGenerales FechaHoraEmision="${U.iso(Date.now())}T09:00:00"/><dte:Emisor NITEmisor="${e(pv.nit)}" NombreEmisor="${e(pv.nombre)}"/><dte:Items>${it.map(([d, c, p]) => `<dte:Item><dte:Cantidad>${c}</dte:Cantidad><dte:Descripcion>${e(d)}</dte:Descripcion><dte:PrecioUnitario>${p}</dte:PrecioUnitario></dte:Item>`).join('')}</dte:Items></dte:DatosEmision><dte:Certificacion><dte:NumeroAutorizacion Serie="EJ${Math.floor(Math.random() * 90 + 10)}" Numero="${Math.floor(Math.random() * 9e8 + 1e8)}">ABCD1234-0000-4000-A000-000000000000</dte:NumeroAutorizacion></dte:Certificacion></dte:GTDocumento>`;
  }
  const hojaLista = () => new Promise((ok, mal) => { if (window.XLSX) return ok(); const s = document.createElement('script'); s.src = 'js/vendor/xlsx.full.min.js'; s.onload = ok; s.onerror = () => mal(new Error('No se pudo cargar el lector de Excel.')); document.head.append(s); });
  const COLS = ['Código', 'Producto', 'Cantidad', 'Costo', 'Lote', 'Vence'];
  function aplicarFilas(s, filas, nombre) {
    s.archivo = nombre;
    s.lineas = filas.filter(r => Object.values(r).some(v => v !== '' && v != null)).map(r => {
      const k = {}; for (const c in r) k[U.norm(c)] = r[c];
      const v = k.vence; const iso = v instanceof Date ? U.iso(v.getTime()) : (v ? String(v).slice(0, 10) : '');
      const p = relacionar(k.producto || '', k.codigo);
      return linea(p, { desc: String(k.producto || k.codigo || ''), cant: +k.cantidad || 0, costo: +k.costo || 0, lote: String(k.lote || ''), vence: /^\d{4}-\d{2}-\d{2}$/.test(iso) ? iso : '' });
    });
    if (!s.lineas.length) return U.aviso('El archivo no trae filas.', 'mal');
    s.paso = 2; A.repintar();
    U.aviso(`Leído: ${s.lineas.length} filas.`);
  }

  /* ---------- pantallas ---------- */
  A.ingreso = function (st, tabs) {
    const s = ig(st);
    if (!A.puede('inv.ingreso')) return `${A.cab('Inventario', 'Solo Bodega central ingresa mercadería.')}${tabs}`;
    const cab = `${A.cab('Inventario', 'Todo entra por Bodega central, y de ahí se traslada a Farmacia y a las salas.', s.paso || s.listo ? `<button class="btn" data-a="igNuevo">Empezar de nuevo</button>` : '')}${tabs}`;
    if (s.listo) return `${cab}${U.flujo(PASOS, 4)}<div class="nota bien">${U.ic('circle-check')}<span style="flex:1">Ingreso guardado: ${e(s.listo.doc)}. La existencia ya subió en Bodega central.</span>${s.listo.id ? U.ojo('igVer', s.listo.id) : ''}</div><button class="btn pri" data-a="igNuevo">${U.ic('plus')}Nuevo ingreso</button>`;
    return cab + U.flujo(PASOS, s.paso) + [paso0, paso1, paso2, paso3][s.paso](s);
  };
  const paso0 = () => `<h2 class="paso-t">¿De dónde viene la mercadería?</h2><div class="fichas origen">${Object.entries(ORIGEN).map(([k, [ic, t, d]]) => `<button class="fp" data-a="igOrigen" data-id="${k}"><i class="mi">${U.ic(ic)}</i><b>${e(t)}</b><span>${e(d)}</span></button>`).join('')}</div>`;
  function paso1(s) {
    const pie = (extra = '') => `<div class="acciones pie-paso"><button class="btn" data-a="igAtras">Atrás</button>${extra}</div>`;
    if (s.origen === 'xml') return `<h2 class="paso-t">Suba el XML de la factura</h2><label class="suelta"><input type="file" id="igXml" accept=".xml,text/xml" hidden>${U.ic('download')}<b>Elegir archivo XML</b><span>El sistema lee proveedor, número, productos, cantidades y costos.</span></label>${pie(`<button class="btn" data-a="igXmlEj">Usar XML de ejemplo</button>`)}`;
    if (s.origen === 'excel') return `<h2 class="paso-t">Suba el Excel</h2><div class="campo" style="max-width:320px;margin-bottom:12px"><label for="igTipo">Es para</label><select id="igTipo" data-ig="tipoExcel"><option value="saldo" ${s.tipoExcel === 'saldo' ? 'selected' : ''}>Saldos iniciales, al arrancar</option><option value="compra" ${s.tipoExcel === 'compra' ? 'selected' : ''}>Una compra con factura</option></select></div><label class="suelta"><input type="file" id="igXls" accept=".xlsx,.xls,.csv" hidden>${U.ic('clipboard-list')}<b>Elegir archivo</b><span>Columnas: ${COLS.join(', ')}.</span></label>${pie(`<button class="btn" data-a="igPlantilla">${U.ic('download')}Descargar plantilla</button><button class="btn" data-a="igXlsEj">Usar datos de ejemplo</button>`)}`;
    if (s.origen === 'oc') {
      const l = db().ocs.filter(o => ['aprobada', 'parcial'].includes(o.estado)).reverse();
      return `<h2 class="paso-t">Elija la orden que llegó</h2>${l.length ? `<div class="fichas">${l.map(o => `<button class="fp" data-a="igOC" data-id="${o.id}"><b>${e(o.num)}</b><span>${e(db().ix.prov.get(o.prov).nombre)} · ${o.items.length} productos</span><span class="num">${Q(o.total)}</span></button>`).join('')}</div>` : `<div class="tabla-marco"><div class="vacio"><b>No hay órdenes por recibir</b>Use otro origen o pida a Compras que cree la orden.</div></div>`}${pie()}`;
    }
    if (s.origen === 'donacion') return `<h2 class="paso-t">¿Quién dona?</h2><div class="rejilla" style="max-width:640px"><div class="campo"><label for="igDon">Donante</label><input id="igDon" type="text" data-ig="donante" value="${e(s.donante)}"></div><div class="campo"><label for="igNit">NIT</label><input id="igNit" type="text" data-ig="nit" value="${e(s.nit)}"></div></div>${pie(`<button class="btn pri" data-a="igSig">Siguiente</button>`)}`;
    const pv = s.prov ? db().ix.prov.get(s.prov) : null;
    return `<h2 class="paso-t">Datos de la factura</h2><div class="rejilla" style="max-width:760px"><div class="campo ancho"><span class="etq">Proveedor</span><div id="igProv"></div>${pv ? `<span class="ayuda">${e(pv.regimen)} · crédito ${pv.dias} días</span>` : ''}</div><div class="campo"><label for="igSe">Serie</label><input id="igSe" type="text" data-ig="serie" value="${e(s.serie)}"></div><div class="campo"><label for="igNu">Número</label><input id="igNu" type="text" inputmode="numeric" data-ig="num" value="${e(s.num)}"></div><div class="campo"><label for="igFe">Fecha</label><input id="igFe" type="date" data-ig="fecha" value="${e(s.fecha)}"></div><div class="campo"><label for="igFo">Fondo</label><select id="igFo" data-ig="fondo">${['Propio', 'Fondos públicos', 'Donación'].map(f => `<option ${f === s.fondo ? 'selected' : ''}>${f}</option>`).join('')}</select></div></div>${pie(`<button class="btn pri" data-a="igSig">Siguiente</button>`)}`;
  }
  function paso2(s) {
    const provFalta = s.origen === 'xml' && !s.prov && s.xmlProv;
    return `<h2 class="paso-t">Productos${s.archivo ? ` <span class="mudo peq">de ${e(s.archivo)}</span>` : ''}</h2>
      ${provFalta ? `<div class="nota">${U.ic('info')}<span style="flex:1">El proveedor ${e(s.xmlProv.nombre)} (NIT ${e(s.xmlProv.nit)}) no está en el catálogo.</span><button class="btn chico" data-a="igCrearProv">Crearlo</button></div>` : ''}
      <div class="escaner" style="margin-bottom:12px">${U.ic('scan-barcode')}<div id="igSel"></div></div>
      <div class="ig-lineas">${s.lineas.map((l, i) => {
      const p = l.prod ? db().ix.prod.get(l.prod) : null, m = pulir(l);
      return `<div class="ig-l ${m.length ? 'revisar' : ''}"><div class="ig-c"><div><b>${e(p ? p.nombre : l.desc || 'Sin relacionar')}</b>${p ? `<span class="peq mudo">${e(p.cod)} · ${e(p.pres)}</span>` : `<div id="igRel${i}" data-rel="${i}" class="ig-rel"></div>`}</div>${m.length ? U.et('Revisar', 'ambar') : U.et('Lista', 'bien')}<button class="ojo" data-a="igQuitar" data-id="${i}" aria-label="Quitar línea">${U.ic('x')}</button></div>
        <div class="ig-f"><label>Cantidad<input id="igc${i}" type="number" min="0" data-ln="${i}|cant" value="${l.cant}"></label><label>Costo con IVA<input id="igk${i}" type="number" step="0.01" data-ln="${i}|costo" value="${(+l.costo).toFixed(2)}"></label><label>Lote<input id="igl${i}" type="text" data-ln="${i}|lote" value="${e(l.lote)}"></label><label>Vence<input id="igv${i}" type="date" data-ln="${i}|vence" value="${e(l.vence)}"></label></div>
        ${m.length ? `<span class="peq ig-m">${e(m.join(' · '))}</span>` : ''}</div>`;
    }).join('') || `<div class="tabla-marco"><div class="vacio"><b>Aún sin productos</b>Escanee o escriba arriba. Si no existe, lo puede crear ahí mismo.</div></div>`}</div>
      <div class="acciones pie-paso"><button class="btn" data-a="igAtras">Atrás</button>${s.lineas.length ? `<button class="btn" data-a="igLlenar">Llenar lotes de ejemplo</button>` : ''}<button class="btn pri" data-a="igSig">Revisar</button></div>`;
  }
  function paso3(s) {
    const r = s.lineas.filter(l => pulir(l).length), ok = s.lineas.length - r.length;
    const total = s.lineas.reduce((a, l) => a + l.cant * l.costo, 0), un = s.lineas.reduce((a, l) => a + (+l.cant || 0), 0);
    const pv = s.prov ? db().ix.prov.get(s.prov) : null;
    const sinFactura = s.origen === 'donacion' || (s.origen === 'excel' && s.tipoExcel === 'saldo');
    const pq = pv && pv.regimen === 'Pequeño contribuyente', iva = !pv || pq ? 0 : M.r2(total - total / 1.12), ret = pv && !sinFactura ? M.retenciones(db(), M.r2(total - iva), iva, pv).isr : 0;
    return `<h2 class="paso-t">Revise antes de guardar</h2>
      <div class="cifras"><div class="cifra" style="--c:155"><span>Listas</span><b>${U.n(ok)}</b></div><div class="cifra" style="--c:85"><span>Por revisar</span><b>${U.n(r.length)}</b></div><div class="cifra"><span>Unidades</span><b>${U.n(un)}</b></div><div class="cifra"><span>Total</span><b>${Q(total)}</b></div></div>
      ${r.length ? `<div class="nota">${U.ic('triangle-alert')}<span>Hay ${r.length} ${r.length === 1 ? 'línea' : 'líneas'} por revisar. Regrese a Productos para completarlas.</span></div>` : ''}
      <div class="ficha">${s.origen === 'donacion' ? `<div><span>Donante</span><b>${e(s.donante)}</b></div>` : sinFactura ? `<div><span>Tipo</span><b>Saldos iniciales</b></div>` : `<div><span>Proveedor</span><b>${e(pv ? pv.nombre : 'Sin elegir')}</b></div><div><span>Factura</span><b>${e(s.serie)} ${e(s.num)}</b></div><div><span>IVA crédito</span><b>${Q(iva)}</b></div><div><span>Retención ISR</span><b>${Q(ret)}</b></div><div><span>Fondo</span><b>${e(s.fondo)}</b></div>`}<div><span>Entra a</span><b>Bodega central</b></div></div>
      <div class="acciones pie-paso"><button class="btn" data-a="igAtras">Atrás</button><button class="btn pri" data-a="igGuardar" ${r.length ? 'disabled' : ''}>Guardar ingreso</button></div>`;
  }
  A.ingresoListo = function (el, st) {
    if (!el.querySelector('.flujo') || !st.ig) return; const s = st.ig;
    el.querySelectorAll('[data-ig]').forEach(i => i.addEventListener('input', () => { s[i.dataset.ig] = i.value; }));
    el.querySelectorAll('[data-ln]').forEach(i => {
      i.addEventListener('input', () => { const [n, k] = i.dataset.ln.split('|'); s.lineas[+n][k] = k === 'cant' || k === 'costo' ? +i.value : i.value; });
      i.addEventListener('change', () => A.repintar());
    });
    const pv = el.querySelector('#igProv');
    if (pv) U.selector(pv, { ph: 'Nombre o NIT', limpiar: false, valor: s.prov ? db().ix.prov.get(s.prov).nombre : '', buscar(q) { const l = db().proveedores.filter(p => U.norm(p.nombre + ' ' + p.nit).includes(q)).slice(0, 20).map(p => ({ txt: p.nombre, sub: `NIT ${p.nit} · ${p.regimen}`, id: p.id })); return [...l, { txt: 'Crear proveedor nuevo', sub: 'Se abre encima, sin perder lo escrito', nuevo: true }]; }, alElegir(x) { if (x.nuevo) return A.formProv(null, id => { s.prov = id; A.repintar(); }); s.prov = x.id; A.repintar(); } });
    const sel = el.querySelector('#igSel');
    if (sel) {
      const b = U.selector(sel, { ph: 'Escanee o escriba nombre o código', max: 12, alEnfocar: false, buscar(q) { if (!q) return []; const l = db().productos.filter(p => (p._n || (p._n = U.norm(p.nombre + ' ' + p.cod))).includes(q)).slice(0, 10).map(p => ({ txt: p.nombre, sub: `${p.cod} · ${p.pres}`, id: p.id })); return [...l, { txt: `Crear producto «${b.input.value.trim()}»`, sub: 'Se abre encima, sin perder lo escrito', nuevo: b.input.value.trim() }]; }, alElegir(x) { if (x.nuevo) return A.formProducto(null, id => { s.lineas.push(linea(db().ix.prod.get(id))); A.repintar(); }, { nombre: x.nuevo }); s.lineas.push(linea(db().ix.prod.get(x.id))); A.repintar(); } });
      if (matchMedia('(pointer: fine)').matches) b.input.focus({ preventScroll: true });
    }
    el.querySelectorAll('[data-rel]').forEach(c => { const i = +c.dataset.rel; U.selector(c, { ph: 'Relacionar con un producto', alEnfocar: false, buscar: q => db().productos.filter(p => (p._n || (p._n = U.norm(p.nombre + ' ' + p.cod))).includes(q)).slice(0, 8).map(p => ({ txt: p.nombre, sub: p.cod, id: p.id })).concat([{ txt: 'Crear producto nuevo', nuevo: true }]), alElegir(x) { if (x.nuevo) return A.formProducto(null, id => { s.lineas[i].prod = id; A.repintar(); }, { nombre: s.lineas[i].desc }); s.lineas[i].prod = x.id; A.repintar(); } }); });
    const fx = el.querySelector('#igXml');
    if (fx) fx.addEventListener('change', async () => { const f = fx.files[0]; if (!f) return; try { aplicarXML(s, leerXML(await f.text()), f.name); } catch (err) { U.aviso(err.message, 'mal'); } });
    const fl = el.querySelector('#igXls');
    if (fl) fl.addEventListener('change', async () => { const f = fl.files[0]; if (!f) return; try { await hojaLista(); const w = XLSX.read(await f.arrayBuffer(), { cellDates: true }); aplicarFilas(s, XLSX.utils.sheet_to_json(w.Sheets[w.SheetNames[0]], { defval: '' }), f.name); } catch (err) { U.aviso(err.message || 'No se pudo leer el archivo.', 'mal'); } });
  };
  A.ingresoDesdeOC = function (id) { A.st.inventario = A.st.inventario || {}; const s = A.st.inventario.ig = nuevo(); s.origen = 'oc'; cargarOC(s, id); location.hash = '#/inventario/ingreso'; };
  function cargarOC(s, id) {
    const o = db().ix.oc.get(id); s.oc = id; s.prov = o.prov; s.fondo = o.fondo;
    s.lineas = o.items.filter(i => (i.recibido || 0) < i.cant).map(i => linea(db().ix.prod.get(i.prod), { cant: i.cant - (i.recibido || 0), costo: i.costo }));
    s.paso = 2; s.pideFactura = true;
  }
  const S = () => ig(A.st.inventario);
  Object.assign(A.vistas.inventario.acc, {
    igOrigen(k) { const s = S(); s.origen = k; s.paso = 1; A.repintar(); },
    igAtras() { const s = S(); s.paso = Math.max(0, s.paso - 1); A.repintar(); },
    igNuevo() { A.st.inventario.ig = nuevo(); A.repintar(); },
    igVer: id => Docs.rec(id),
    igQuitar(i) { S().lineas.splice(+i, 1); A.repintar(); },
    igOC(id) { cargarOC(S(), id); A.repintar(); },
    igXmlEj() { const x = xmlEjemplo(); if (!x) return U.aviso('Primero cree un proveedor y productos.', 'mal'); aplicarXML(S(), leerXML(x), 'factura-ejemplo.xml'); },
    async igPlantilla() { await hojaLista(); const w = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(w, XLSX.utils.aoa_to_sheet([COLS, ['MED-0001', 'Acetaminofén 500 mg', 500, 0.28, 'L12345', '2028-03-31']]), 'Inventario'); XLSX.writeFile(w, 'plantilla-inventario.xlsx'); },
    igXlsEj() { const ps = db().productos.slice(0, 4); if (!ps.length) return U.aviso('Primero cree productos o suba su Excel.', 'mal'); aplicarFilas(S(), [...ps.map((p, i) => ({ 'Código': p.cod, Producto: p.nombre, Cantidad: 100 + i * 20, Costo: p.costoRef, Lote: 'E' + (1000 + i), Vence: U.iso(Date.now() + 500 * M.DIA) })), { 'Código': '', Producto: 'Producto sin código', Cantidad: 5, Costo: 3, Lote: '', Vence: '' }], 'datos-ejemplo.xlsx'); },
    igCrearProv() { const s = S(); A.formProv(null, id => { s.prov = id; s.xmlProv = null; A.repintar(); }, { ...s.xmlProv }); },
    igLlenar() { const s = S(); s.lineas.forEach(l => { l.lote ||= 'L' + (10000 + Math.floor(Math.random() * 9e4)); l.vence ||= U.iso(Date.now() + 500 * M.DIA); }); A.repintar(); },
    igSig() {
      const s = S();
      if (s.paso === 1) {
        if (s.origen === 'factura' && !s.prov) return U.aviso('Elija el proveedor.', 'mal');
        if (s.origen === 'factura' && !s.num) return U.aviso('Escriba el número de factura.', 'mal');
        if (s.origen === 'donacion' && !s.donante.trim()) return U.aviso('Indique el donante.', 'mal');
      }
      if (s.paso === 2 && !s.lineas.length) return U.aviso('Agregue al menos un producto.', 'mal');
      if (s.paso === 2 && (s.pideFactura || (s.origen === 'excel' && s.tipoExcel === 'compra') || s.origen === 'xml') && (!s.prov || !s.num)) return pedirFactura(s);
      s.paso++; A.repintar();
    },
    async igGuardar() {
      const s = S(), items = s.lineas.map(l => ({ prod: l.prod, cant: +l.cant, costo: +l.costo, lote: l.lote.trim(), vence: l.vence ? U.deIso(l.vence) : null }));
      const factura = { serie: s.serie, num: s.num, fecha: s.fecha ? U.deIso(s.fecha) : Date.now(), uuid: s.uuid };
      const r = s.origen === 'oc' ? await U.hacer('compra.recibir', { oc: s.oc, factura, items }, true)
        : s.origen === 'donacion' ? await U.hacer('donacion.entrada', { donante: s.donante, nit: s.nit, items }, true)
          : await U.hacer('ingreso.registrar', { origen: s.origen === 'excel' && s.tipoExcel === 'saldo' ? 'saldo' : s.origen, prov: s.prov, factura, fondo: s.fondo, items }, true);
      if (r.ok) { const v = nuevo(); v.listo = { doc: r.doc || r.txt, id: s.origen === 'donacion' ? null : r.id }; A.st.inventario.ig = v; A.repintar(); }
    },
  });
  function pedirFactura(s) {
    const h = U.hoja({
      titulo: 'Datos de la factura', sub: 'Falta para seguir', ancho: 480,
      cuerpo: `<div class="campo"><span class="etq">Proveedor</span><div id="pf"></div></div><div class="rejilla"><div class="campo"><label for="fs">Serie</label><input id="fs" type="text" value="${e(s.serie)}"></div><div class="campo"><label for="fn">Número</label><input id="fn" type="text" value="${e(s.num)}"></div></div>`,
      pie: `<button class="btn pri" data-a="ok">Continuar</button>`,
      acciones: { ok() { s.serie = h.cuerpo.querySelector('#fs').value.trim(); s.num = h.cuerpo.querySelector('#fn').value.trim(); if (!s.prov || !s.num) return U.aviso('Faltan proveedor y número.', 'mal'); h.cerrar(); s.paso = 3; A.repintar(); } },
      alAbrir(hh) { U.selector(hh.cuerpo.querySelector('#pf'), { ph: 'Nombre o NIT', limpiar: false, valor: s.prov ? db().ix.prov.get(s.prov).nombre : '', buscar: q => db().proveedores.filter(p => U.norm(p.nombre + ' ' + p.nit).includes(q)).slice(0, 20).map(p => ({ txt: p.nombre, sub: p.nit, id: p.id })), alElegir(x) { s.prov = x.id; } }); },
    });
  }
})(window);
