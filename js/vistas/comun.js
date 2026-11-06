/* Lo que varias pantallas comparten: documentos, fichas y el armador de líneas. */
(function (g) {
  const { U, App: A, Motor: M, Catalogo: C } = g; const e = U.esc, Q = U.Q;
  const db = () => M.db;

  A.etVence = function (t) {
    const d = U.diasPara(t, A.hoy());
    if (d < 0) return U.et('Vencido', 'alerta');
    if (d <= 30) return U.et(`${d} días`, 'alerta');
    if (d <= db().cfg.diasVence) return U.et(`${d} días`, 'ambar');
    return U.et(U.fecha(t), '');
  };
  A.etEstado = function (s) {
    const m = { abierta: 'azul', pagada: 'bien', 'por cobrar': 'ambar', anulada: 'alerta', vigente: 'bien', acreditada: 'ambar', pendiente: 'ambar', despachado: 'bien', rechazado: 'alerta', rechazada: 'alerta', solicitado: 'ambar', 'en camino': 'azul', recibido: 'bien', recibida: 'bien', aprobada: 'azul', 'por aprobar': 'ambar', parcial: 'ambar', atendida: 'bien', aprobado: 'bien', pagado: 'bien' };
    return U.et(s.charAt(0).toUpperCase() + s.slice(1), m[s] || '');
  };
  A.nomU = id => (db().ix.usr.get(id) || { nombre: 'Sistema' }).nombre;
  A.meses = function () {
    const out = []; const d = new Date(); d.setDate(1);
    for (let i = 0; i < 3; i++) { out.push({ k: `${d.getFullYear()}-${d.getMonth()}`, t: `${U.MESES_L[d.getMonth()]} ${d.getFullYear()}` }); d.setMonth(d.getMonth() - 1); }
    return out;
  };
  A.enMes = function (k) { const [y, m] = k.split('-').map(Number); const a = new Date(y, m, 1).getTime(), b = new Date(y, m + 1, 1).getTime(); return t => t >= a && t < b; };

  /* ---------- documentos ---------- */
  const cabDoc = (titulo, num, extra = '') => `<header><div><b>${e(db().cfg.nombre)}</b>NIT ${e(db().cfg.nit)} · ${e(db().cfg.direccion)}</div><div class="der"><b>${e(titulo)}</b>${e(num)}${extra}<br><span class="sello">DEMOSTRACIÓN · SIN VALIDEZ</span></div></header>`;
  const imprimir = `<button class="btn" data-a="imprimir">${U.ic('printer')}Imprimir</button>`;
  const accImp = { imprimir() { print(); } };
  const Docs = g.Docs = {};

  Docs.dte = function (id) {
    const d = db().ix.dte.get(id), c = db().ix.cuenta.get(d.cuenta), pac = db().ix.pac.get(c.pac);
    const lineas = db().ix.cargosDe.get(c.id).filter(k => !k.rev);
    const titulo = { FACT: 'Factura electrónica', NCRE: 'Nota de crédito electrónica', COMP: 'Comprobante de venta', DEV: 'Devolución' }[d.tipo];
    const mismoMes = new Date(d.f).getMonth() === new Date().getMonth() && new Date(d.f).getFullYear() === new Date().getFullYear();
    const puede = A.puede('nota.credito') && (d.tipo === 'FACT' || d.tipo === 'COMP') && d.estado === 'vigente';
    const anota = d.tipo === 'COMP' && !d.sat && d.estado === 'vigente' && (A.puede('cuenta.facturar') || A.puede('nota.credito'));
    const h = U.hoja({
      titulo, sub: `${d.serie}-${d.num} · ${U.fh(d.f)}`, ancho: 640, cuerpo: `<div class="doc">${cabDoc(titulo, `Serie ${d.serie} · No. ${d.num}`)}
      <dl>${d.uuid ? `<dt>Autorización</dt><dd class="num">${e(d.uuid)}</dd><dt>Certificador</dt><dd>Certificador de demostración</dd>` : ''}${d.sat ? `<dt>Factura SAT</dt><dd>${e(d.sat.serie)} ${e(d.sat.num)}</dd>` : ''}<dt>Fecha</dt><dd>${U.fh(d.f)}</dd><dt>Receptor</dt><dd>${e(d.nombre)}</dd><dt>NIT o CUI</dt><dd>${e(d.nit)}</dd><dt>Paciente</dt><dd>${e(pac.nombre)} · ${e(pac.exp)}</dd><dt>Cuenta</dt><dd>${e(c.num)}</dd>${d.motivo ? `<dt>Motivo</dt><dd>${e(d.motivo)}</dd>` : ''}${d.estado !== 'vigente' ? `<dt>Estado</dt><dd>${A.etEstado(d.estado)}</dd>` : ''}</dl>
      ${U.tabla({ contar: false, por: 500, filas: lineas, cols: [{ t: 'Descripción', h: k => e(k.nombre) }, { t: 'Cant.', der: 1, h: k => U.n(k.cant) }, { t: 'Precio', der: 1, h: k => Q(k.precio) }, { t: 'Total', der: 1, h: k => Q(k.total) }] })}
      <div class="totales">${d.desc ? `<div><span>Subtotal</span><span>${Q(d.bruto)}</span></div><div><span>Descuento social</span><span>-${Q(d.desc)}</span></div>` : ''}<div><span>Exento</span><span>${Q(d.exento)}</span></div><div><span>Gravado</span><span>${Q(d.base)}</span></div><div><span>IVA ${db().cfg.ivaPct} %</span><span>${Q(d.iva)}</span></div><div class="gran"><span>Total</span><span>${Q(d.total)}</span></div></div></div>`,
      pie: `${puede ? `<button class="btn" data-a="corregir">${mismoMes ? 'Anular o devolver' : 'Devolución'}</button>` : ''}${anota ? `<button class="btn" data-a="anotar">Anotar factura SAT</button>` : ''}${imprimir}`,
      acciones: {
        ...accImp,
        anotar() { A.anotarFactura(id, () => h.cerrar()); },
        corregir() {
          const v = U.hoja({
            titulo: mismoMes ? 'Corregir documento' : 'Devolución', sub: `${d.serie}-${d.num} · ${Q(d.total)}`, ancho: 480,
            cuerpo: `<div class="nota info">${U.ic('info')}<span>La anulación solo procede dentro del mes de emisión. Después se registra la devolución.</span></div>
              <div class="campo"><label for="mot">Motivo</label><textarea id="mot"></textarea></div>
              <label class="peq"><input type="checkbox" id="rein"> Reingresar los productos al inventario</label>`,
            pie: `${mismoMes ? `<button class="btn" data-a="anular">Anular</button>` : ''}<button class="btn pri" data-a="nc">${d.tipo === 'FACT' ? 'Emitir nota de crédito' : 'Registrar devolución'}</button>`,
            acciones: {
              async anular() { const r = await U.hacer('dte.anular', { dte: id, motivo: v.cuerpo.querySelector('#mot').value }, true); if (r.ok) { v.cerrar(); h.cerrar(); A.repintar(); } },
              async nc() { const r = await U.hacer('dte.notaCredito', { dte: id, motivo: v.cuerpo.querySelector('#mot').value, reingresar: v.cuerpo.querySelector('#rein').checked }, true); if (r.ok) { v.cerrar(); h.cerrar(); Docs.dte(r.id); A.repintar(); } },
            },
          });
        },
      },
    });
  };
  Docs.oc = function (id) {
    const o = db().ix.oc.get(id), p = db().ix.prov.get(o.prov);
    U.hoja({
      titulo: 'Orden de compra', sub: `${o.num} · ${U.fecha(o.f)}`, ancho: 680, pie: imprimir, acciones: accImp, cuerpo: `<div class="doc">${cabDoc('Orden de compra', o.num)}
      <dl><dt>Proveedor</dt><dd>${e(p.nombre)} · NIT ${e(p.nit)}</dd><dt>Fuente de fondos</dt><dd>${e(o.fondo)}${o.nog ? ` · NOG ${e(o.nog)}` : ''}</dd><dt>Elaboró</dt><dd>${e(A.nomU(o.us))}</dd><dt>Aprobó</dt><dd>${o.aprueba ? `${e(A.nomU(o.aprueba))}, ${U.fh(o.fa)}` : (o.estado === 'por aprobar' ? 'Pendiente' : 'Bajo el límite de aprobación')}</dd><dt>Estado</dt><dd>${A.etEstado(o.estado)}</dd></dl>
      ${U.tabla({ contar: false, por: 500, filas: o.items, cols: [{ t: 'Producto', h: i => e(db().ix.prod.get(i.prod).nombre) }, { t: 'Pedido', der: 1, h: i => U.n(i.cant) }, { t: 'Recibido', der: 1, h: i => U.n(i.recibido || 0) }, { t: 'Costo', der: 1, h: i => Q(i.costo) }, { t: 'Total', der: 1, h: i => Q(i.cant * i.costo) }] })}
      <div class="totales"><div class="gran"><span>Total</span><span>${Q(o.total)}</span></div></div></div>`,
    });
  };
  Docs.rec = function (id) {
    const r = db().ix.rec.get(id), p = db().ix.prov.get(r.prov);
    U.hoja({
      titulo: 'Recepción de compra', sub: `${r.num} · ${U.fecha(r.f)}`, ancho: 680, pie: imprimir, acciones: accImp, cuerpo: `<div class="doc">${cabDoc('Recepción', r.num)}
      <dl><dt>Proveedor</dt><dd>${e(p.nombre)} · NIT ${e(p.nit)}</dd><dt>Factura</dt><dd>${e(r.tipoDoc)} ${e(r.serie)}-${e(r.factura)}</dd><dt>Fuente de fondos</dt><dd>${e(r.fondo)}</dd><dt>Recibió</dt><dd>${e(A.nomU(r.us))}</dd></dl>
      ${U.tabla({ contar: false, por: 500, filas: r.lineas, cols: [{ t: 'Producto', h: i => e(db().ix.prod.get(i.prod).nombre) }, { t: 'Lote', h: i => e(db().ix.lote.get(i.lote).num) }, { t: 'Vence', h: i => U.fecha(db().ix.lote.get(i.lote).vence) }, { t: 'Cant.', der: 1, h: i => U.n(i.cant) }, { t: 'Total', der: 1, h: i => Q(i.cant * i.costo) }] })}
      <div class="totales"><div><span>Base</span><span>${Q(r.base)}</span></div><div><span>IVA</span><span>${Q(r.iva)}</span></div><div><span>Retención ISR</span><span>-${Q(r.ret.isr)}</span></div><div class="gran"><span>Total factura</span><span>${Q(r.total)}</span></div></div></div>`,
    });
  };
  Docs.constancia = function (id) {
    const r = db().ix.rec.get(id), p = db().ix.prov.get(r.prov);
    U.hoja({
      titulo: 'Constancia de retención', sub: `ISR · ${r.num}`, ancho: 520, pie: imprimir, acciones: accImp, cuerpo: `<div class="doc">${cabDoc('Constancia de retención ISR', r.num)}
      <dl><dt>Retenido a</dt><dd>${e(p.nombre)}</dd><dt>NIT</dt><dd>${e(p.nit)}</dd><dt>Factura</dt><dd>${e(r.serie)}-${e(r.factura)}</dd><dt>Fecha</dt><dd>${U.fecha(r.f)}</dd><dt>Base sin IVA</dt><dd>${Q(r.base)}</dd><dt>Tarifa</dt><dd>5 % hasta Q 30,000.00 y 7 % sobre el excedente</dd><dt>Retenido</dt><dd><b>${Q(r.ret.isr)}</b></dd></dl></div>`,
    });
  };
  Docs.donacion = function (id) {
    const d = db().donaciones.find(x => x.id === id);
    U.hoja({
      titulo: 'Recibo por donación', sub: `${d.serie}-${d.recibo}`, ancho: 600, pie: imprimir, acciones: accImp, cuerpo: `<div class="doc">${cabDoc('Recibo por donación', `Serie ${d.serie} · No. ${d.recibo}`)}
      <dl><dt>Autorización</dt><dd class="num">${e(d.uuid)}</dd><dt>Donante</dt><dd>${e(d.donante)}</dd><dt>NIT</dt><dd>${e(d.nit)}</dd><dt>Fecha</dt><dd>${U.fecha(d.f)}</dd><dt>Tipo</dt><dd>${e(d.tipo)}</dd><dt>Valor</dt><dd><b>${Q(d.valor)}</b></dd>${d.nota ? `<dt>Nota</dt><dd>${e(d.nota)}</dd>` : ''}</dl>
      ${d.lineas.length ? U.tabla({ contar: false, por: 200, filas: d.lineas, cols: [{ t: 'Producto', h: i => e(db().ix.prod.get(i.prod).nombre) }, { t: 'Lote', h: i => e(db().ix.lote.get(i.lote).num) }, { t: 'Cant.', der: 1, h: i => U.n(i.cant) }, { t: 'Valor', der: 1, h: i => Q(i.cant * i.costo) }] }) : ''}</div>`,
    });
  };

  A.anotarFactura = function (id, listo) {
    const v = U.hoja({ titulo: 'Anotar factura SAT', sub: 'Factura hecha en Agencia Virtual u otro sistema', dialogo: true, cuerpo: `<div class="rejilla"><div class="campo"><label for="fs">Serie</label><input id="fs" type="text"></div><div class="campo"><label for="fn">Número</label><input id="fn" type="text" inputmode="numeric"></div></div>`, pie: `<button class="btn pri" data-a="ok">Guardar</button>`, acciones: { async ok() { const r = await U.hacer('dte.anotar', { dte: id, serie: v.cuerpo.querySelector('#fs').value.trim(), num: v.cuerpo.querySelector('#fn').value.trim() }, 'Factura anotada.'); if (r.ok) { v.cerrar(); if (listo) listo(); } } } });
  };

  /* ---------- fichas ---------- */
  A.fichaPaciente = function (id) {
    const p = db().ix.pac.get(id);
    const cuentas = []; for (let i = db().cuentas.length - 1; i >= 0 && cuentas.length < 8; i--) if (db().cuentas[i].pac === id) cuentas.push(db().cuentas[i]);
    const edad = p.nac ? Math.floor((Date.now() - p.nac) / (365.25 * 86400000)) + ' años' : '—';
    const h = U.hoja({
      titulo: p.nombre, sub: `Expediente ${p.exp}`, ancho: 640,
      cuerpo: `<div class="sub-cab"><span class="etq">Datos</span>${A.puede('paciente') ? U.lapiz('editar', id, 'Editar paciente') : ''}</div>
        <div class="ficha" style="margin:0"><div><span>DPI</span><b>${e(p.dpi || '—')}</b></div><div><span>NIT</span><b>${e(p.nit)}</b></div><div><span>Edad</span><b>${edad}</b></div><div><span>Teléfono</span><b>${e(p.tel || '—')}</b></div><div><span>Municipio</span><b>${e(p.muni || '—')}</b></div></div>
        <h3>Últimas cuentas</h3>
        ${U.tabla({ contar: false, filas: cuentas, clic: 'cuenta', vacioT: 'Sin cuentas todavía', vacio: 'Abra la primera con el botón de abajo.', cols: [{ t: 'Cuenta', h: c => e(c.num) }, { t: 'Fecha', h: c => U.fecha(c.abierta) }, { t: 'Tipo', h: c => e(C.TIPOS_CUENTA[c.tipo].nombre) }, { t: 'Estado', h: c => A.etEstado(c.estado) }, { t: 'Total', der: 1, h: c => Q(c.total) }] })}`,
      pie: A.puede('cuenta.abrir') ? `<button class="btn pri" data-a="abrir">Abrir cuenta</button>` : '',
      acciones: {
        cuenta(cid) { U.pila.slice().forEach(x => x.cerrar()); location.hash = '#/cuentas/' + cid; },
        abrir() { A.abrirCuenta(id); },
        editar() { A.formPaciente(p); },
      },
    });
  };
  A.formPaciente = function (p, alCrear) {
    const v = p || {};
    const h = U.hoja({
      titulo: p ? 'Editar paciente' : 'Nuevo paciente', sub: p ? p.exp : 'Busque antes para no duplicar el expediente', ancho: 520,
      cuerpo: `<div class="rejilla"><div class="campo ancho"><label for="nom">Nombre completo</label><input id="nom" type="text" value="${e(v.nombre || '')}"></div>
        <div class="campo"><label for="dpi">DPI</label><input id="dpi" type="text" inputmode="numeric" maxlength="13" value="${e(v.dpi || '')}"></div><div class="campo"><label for="nit">NIT</label><input id="nit" type="text" value="${e(v.nit || 'CF')}"></div>
        <div class="campo"><label for="tel">Teléfono</label><input id="tel" type="tel" value="${e(v.tel || '')}"></div>
        <div class="campo"><label for="sex">Sexo</label><select id="sex"><option value="F" ${v.sexo === 'F' ? 'selected' : ''}>Femenino</option><option value="M" ${v.sexo === 'M' ? 'selected' : ''}>Masculino</option></select></div>
        <div class="campo ancho"><label for="mun">Municipio</label><select id="mun">${C.MUNICIPIOS.map(m => `<option ${m === v.muni ? 'selected' : ''}>${e(m)}</option>`).join('')}</select></div></div>`,
      pie: `<button class="btn" data-cerrar>Cancelar</button><button class="btn pri" data-a="ok">Guardar</button>`,
      acciones: {
        async ok() {
          const c = h.cuerpo, val = s => c.querySelector(s).value.trim();
          const d = { nombre: val('#nom'), dpi: val('#dpi'), nit: val('#nit') || 'CF', tel: val('#tel'), sexo: val('#sex'), muni: val('#mun') };
          const r = p ? await U.hacer('paciente.editar', { id: p.id, datos: { ...d, _b: null } }, 'Paciente actualizado.') : await U.hacer('paciente.crear', d, true);
          if (r.ok) { h.cerrar(); if (alCrear) alCrear(r.id); }
        },
      },
    });
  };
  A.abrirCuenta = function (pac) {
    const tipos = Object.entries(C.TIPOS_CUENTA);
    const h = U.hoja({
      titulo: 'Abrir cuenta', sub: db().ix.pac.get(pac).nombre, ancho: 460,
      cuerpo: `<div class="campo"><label for="ti">Tipo de atención</label><select id="ti">${tipos.map(([k, t]) => `<option value="${k}">${e(t.nombre)}</option>`).join('')}</select></div>
        <div class="campo"><label for="me">Médico tratante</label><select id="me">${C.MEDICOS.map(m => `<option>${e(m[0])}</option>`).join('')}</select></div>
        <div class="campo"><label for="ca">Cama (si aplica)</label><input id="ca" type="text"></div>`,
      pie: `<button class="btn pri" data-a="ok">Abrir cuenta</button>`,
      acciones: {
        async ok() {
          const c = h.cuerpo; const r = await U.hacer('cuenta.abrir', { pac, tipo: c.querySelector('#ti').value, medico: c.querySelector('#me').value, cama: c.querySelector('#ca').value });
          if (r.ok) { U.pila.slice().forEach(x => x.cerrar()); location.hash = '#/cuentas/' + r.id; }
        },
      },
    });
  };
  A.fichaProducto = function (id) {
    const p = db().ix.prod.get(id); const hoy = A.hoy();
    const lotes = (db().ix.lotesDe.get(id) || []).filter(l => Object.values(l.ex).some(n => n > 0));
    const bods = db().bodegas.filter(b => p.ex[b.id] > 0);
    const movs = (db().ix.movsDe.get(id) || []).slice(-12).reverse();
    const h = U.hoja({
      titulo: p.nombre, sub: `${p.cod} · ${p.pres}`, ancho: 760,
      cuerpo: `<div class="sub-cab"><span class="acciones">${U.et(p.cat, 'pino')}${p.controlado ? U.et('Controlado', 'alerta') : ''}${p.frio ? U.et('Cadena de frío', 'azul') : ''}${p.generico ? U.et('Genérico, exento de IVA', 'bien') : ''}</span>${A.puede('producto') ? U.lapiz('editar', id, 'Editar producto') : ''}</div>
        <div class="ficha" style="margin:0"><div><span>Existencia</span><b>${U.n(p.qty)}</b></div><div><span>Costo promedio</span><b>${Q(M.promedio(p))}</b></div><div><span>Valor</span><b>${Q(p.valor)}</b></div><div><span>Precio de venta</span><b>${Q(p.venta)}</b></div><div><span>Mínimo y máximo</span><b>${U.n(p.min)} / ${U.n(p.max)}</b></div><div><span>Registro sanitario</span><b>${e(p.registro || 'No aplica')}</b></div></div>
        <h3>Por bodega</h3><div class="acciones">${bods.map(b => U.et(`${b.nombre}: ${U.n(p.ex[b.id])}`)).join('') || '<span class="mudo">Sin existencia</span>'}</div>
        <h3>Lotes, primero lo que vence primero</h3>
        ${U.tabla({ contar: false, por: 50, filas: lotes, vacioT: 'Sin lotes con existencia', cols: [{ t: 'Lote', h: l => `${e(l.num)}${l.bloqueo ? ' ' + U.et('Bloqueado', 'alerta') : ''}` }, { t: 'Vence', h: l => A.etVence(l.vence) }, { t: 'Fondo', h: l => e(l.fondo) }, { t: 'Existencia', der: 1, h: l => U.n(Object.values(l.ex).reduce((a, b) => a + b, 0)) }, { t: '', der: 1, h: l => `<button class="ojo" data-a="rastro" data-id="${l.id}" aria-label="Rastrear lote" title="Rastrear lote">${U.ic('route')}</button>` }] })}
        <h3>Últimos movimientos</h3>
        ${A.tablaKardex(movs)}`,
      acciones: { editar() { A.formProducto(p, () => { h.cerrar(); A.fichaProducto(id); }); }, rastro(l) { U.pila.slice().forEach(x => x.cerrar()); A.st.inventario = A.st.inventario || {}; A.st.inventario.rl = l; location.hash = '#/inventario/rastreo'; } },
    });
  };
  A.tablaKardex = (filas, o = {}) => U.tabla({
    contar: false, ...o, filas, vacioT: 'Sin movimientos', cols: [
      { t: 'Fecha', h: m => U.fh(m.f) }, { t: 'Movimiento', h: m => e(m.t) }, { t: 'Documento', h: m => e(m.d) }, { t: 'Bodega', h: m => m.b === 'TR' ? 'En tránsito' : e(M.nomBod(db(), m.b)) },
      { t: 'Entra', der: 1, h: m => m.c > 0 ? U.n(m.c) : '' }, { t: 'Sale', der: 1, h: m => m.c < 0 ? U.n(-m.c) : '' }, { t: 'Saldo', der: 1, h: m => U.n(m.s) }, { t: 'Costo', der: 1, h: m => Q(m.u) }, { t: 'Valor', der: 1, h: m => Q(m.v) }],
  });
  A.formProducto = function (p, listo) {
    const v = p || { cat: 'Medicamento', pres: 'Unidad' };
    const cats = ['Medicamento', 'Insumo médico', 'Laboratorio e imagen', 'Uso interno'];
    const h = U.hoja({
      titulo: p ? 'Editar producto' : 'Nuevo producto', sub: p ? p.cod : '', ancho: 520,
      cuerpo: `<div class="rejilla"><div class="campo ancho"><label for="n">Nombre</label><input id="n" type="text" value="${e(v.nombre || '')}"></div>
        <div class="campo"><label for="pr">Presentación</label><input id="pr" type="text" value="${e(v.pres)}"></div><div class="campo"><label for="ca">Categoría</label><select id="ca">${cats.map(c => `<option ${c === v.cat ? 'selected' : ''}>${c}</option>`).join('')}</select></div>
        <div class="campo"><label for="ve">Precio de venta</label><input id="ve" type="number" step="0.01" value="${(+v.venta || 0).toFixed(2)}"></div><div class="campo"><label for="rs">Registro sanitario</label><input id="rs" type="text" value="${e(v.registro || '')}"></div>
        <div class="campo"><label for="mi">Mínimo</label><input id="mi" type="number" value="${v.min || 0}"></div><div class="campo"><label for="ma">Máximo</label><input id="ma" type="number" value="${v.max || 0}"></div>
        <div class="campo ancho"><label for="ct">Control especial</label><select id="ct"><option value="">Ninguno</option><option value="psicotropico" ${v.controlado === 'psicotropico' ? 'selected' : ''}>Psicotrópico</option><option value="estupefaciente" ${v.controlado === 'estupefaciente' ? 'selected' : ''}>Estupefaciente</option></select></div>
        <label class="peq ancho"><input type="checkbox" id="ge" ${v.generico ? 'checked' : ''}> Inscrito como genérico (exento de IVA)</label></div>`,
      pie: `<button class="btn" data-cerrar>Cancelar</button><button class="btn pri" data-a="ok">Guardar</button>`,
      acciones: {
        async ok() {
          const q = s => h.cuerpo.querySelector(s);
          const d = { nombre: q('#n').value.trim(), pres: q('#pr').value, cat: q('#ca').value, venta: +q('#ve').value, registro: q('#rs').value || null, min: +q('#mi').value, max: +q('#ma').value, controlado: q('#ct').value || null, generico: q('#ge').checked };
          const r = await U.hacer('producto.guardar', p ? { id: p.id, nombre: d.nombre, datos: d } : d, p ? 'Producto actualizado.' : true);
          if (r.ok) { h.cerrar(); if (listo) listo(); }
        },
      },
    });
  };

  /* ---------- armador de líneas ----------
     modo: cargo | pedido | traslado | solicitud | oc | donacion */
  A.lineas = function (o) {
    const L = [];
    const usaCosto = o.modo === 'oc' || o.modo === 'donacion', usaLote = o.modo === 'donacion', usaReceta = o.modo === 'cargo' || o.modo === 'pedido';
    const bod = () => o.bod ? (typeof o.bod === 'function' ? o.bod(h) : o.bod) : null;
    const h = U.hoja({
      titulo: o.titulo, sub: o.sub, ancho: o.ancho || 640,
      cuerpo: `${o.arriba || ''}<div class="campo"><span class="etq">Agregar</span><div id="sel"></div></div><div class="lineas" id="ls"></div><div class="totales oculto" id="tot"></div>`,
      pie: `<button class="btn" data-cerrar>Cancelar</button><button class="btn pri" data-a="ok">${e(o.ok || 'Guardar')}</button>`,
      acciones: {
        quitar(i) { L.splice(+i, 1); pintar(); },
        extra(id) { if (o.extra) { o.extra(id, { agregar, L, pintar, h }); } },
        async ok() {
          leer();
          if (!L.length) return U.aviso('Agregue al menos una línea.', 'mal');
          const lista = L.map(x => { const r = { cant: x.cant }; if (x.serv) r.serv = x.serv; else r.prod = x.prod; if (bod() && x.prod) r.bod = bod(); if (usaCosto) r.costo = x.costo; if (usaLote) { r.lote = x.lote; r.vence = x.vence ? U.deIso(x.vence) : null; } if (x.receta) r.receta = x.receta; return r; });
          const fin = await o.alAceptar(lista, h); if (fin) h.cerrar();
        },
      },
      alAbrir(hh) {
        U.selector(hh.cuerpo.querySelector('#sel'), {
          ph: o.modo === 'cargo' ? 'Servicio o producto: nombre o código' : 'Producto: nombre o código', max: 25,
          buscar(q) {
            const out = [], b = bod();
            if (o.conServicios) for (const s of db().servicios) if (out.length < 12 && U.norm(s.nombre + ' ' + s.cod).includes(q)) out.push({ txt: s.nombre, sub: `${s.area} · ${Q(s.precio)}`, serv: s.id });
            if (o.soloServicios) return out;
            for (const p of db().productos) {
              if (out.length >= 25) break;
              if (!(p._n || (p._n = U.norm(p.nombre + ' ' + p.cod))).includes(q)) continue;
              const hay = b ? M.disponible(db(), p.id, b, Date.now()) : p.qty;
              if ((o.modo === 'cargo' || o.modo === 'pedido' || o.modo === 'traslado') && hay <= 0) continue;
              out.push({ txt: p.nombre, sub: `${p.cod} · ${p.pres} · ${b ? 'disponible en ' + M.nomBod(db(), b) : 'existencia total'}: ${U.n(hay)}${o.modo === 'cargo' ? ' · ' + Q(p.venta) : ''}${p.controlado ? ' · CONTROLADO' : ''}`, prod: p.id });
            }
            return out;
          },
          alElegir: x => agregar(x.serv ? { serv: x.serv } : { prod: x.prod }),
        });
        if (o.iniciales) o.iniciales.forEach(agregar);
      },
    });
    function agregar(x) {
      leer();
      const ya = L.find(l => (x.prod && l.prod === x.prod) || (x.serv && l.serv === x.serv));
      if (ya && !usaLote) { ya.cant += x.cant || 1; return pintar(); }
      if (x.prod) { const p = db().ix.prod.get(x.prod); L.push({ prod: x.prod, nombre: p.nombre, cant: x.cant || 1, costo: x.costo != null ? x.costo : M.r2(M.promedio(p)), lote: '', vence: '', precio: p.venta, ctrl: usaReceta && p.controlado, receta: x.receta || null }); }
      else { const s = db().ix.serv.get(x.serv); L.push({ serv: x.serv, nombre: s.nombre, cant: x.cant || 1, precio: s.precio }); }
      pintar();
    }
    function leer() {
      h.cuerpo.querySelectorAll('[data-l]').forEach(i => {
        const [n, k] = i.dataset.l.split('|'); const l = L[+n]; if (!l) return;
        if (k === 'cant') l.cant = +i.value; else if (k === 'costo') l.costo = +i.value; else if (k.startsWith('rx.')) { l.receta = l.receta || {}; l.receta[k.slice(3)] = i.value.trim(); } else l[k] = i.value;
      });
    }
    function pintar() {
      const c = h.cuerpo.querySelector('#ls');
      c.innerHTML = L.map((l, i) => `<div class="linea"><div>${e(l.nombre)}</div><button class="ojo" data-a="quitar" data-id="${i}" aria-label="Quitar ${e(l.nombre)}">${U.ic('x')}</button><div class="campos">
        <label>Cantidad<input type="number" min="1" data-l="${i}|cant" value="${l.cant}"></label>
        ${usaCosto ? `<label>Costo unitario<input type="number" step="0.01" data-l="${i}|costo" value="${(+l.costo).toFixed(2)}"></label>` : ''}
        ${usaLote ? `<label>Lote<input type="text" data-l="${i}|lote" value="${e(l.lote)}"></label><label>Vence<input type="date" data-l="${i}|vence" value="${e(l.vence)}"></label>` : ''}
        ${l.ctrl ? `<label>Receta No.<input type="text" data-l="${i}|rx.num" value="${e(l.receta && l.receta.num || '')}"></label><label>Médico<input type="text" data-l="${i}|rx.medico" value="${e(l.receta && l.receta.medico || '')}"></label><label>Colegiado<input type="text" data-l="${i}|rx.colegiado" value="${e(l.receta && l.receta.colegiado || '')}"></label>` : ''}
        </div></div>`).join('');
      const t = h.cuerpo.querySelector('#tot');
      if (o.modo === 'cargo') { const s = L.reduce((a, l) => a + l.cant * l.precio, 0); t.innerHTML = `<div class="gran"><span>Se carga</span><span>${Q(s)}</span></div>`; t.classList.toggle('oculto', !L.length); }
      if (usaCosto) { const s = L.reduce((a, l) => a + l.cant * l.costo, 0); t.innerHTML = `<div class="gran"><span>Total</span><span>${Q(s)}</span></div>`; t.classList.toggle('oculto', !L.length); }
    }
    h.cuerpo.addEventListener('change', ev => { if (ev.target.dataset.l) { leer(); pintar(); } });
    return h;
  };
})(window);
