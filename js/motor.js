/* Motor del demo.
   Cada acción es una operación que entra a un registro único y ordenado. Todos los
   dispositivos aplican las mismas operaciones en el mismo orden, y cada una se valida
   contra el estado real en ese instante. En producción ese papel lo hace Postgres
   (funciones con bloqueo de fila); ver supabase/esquema.sql. */
(function (g) {
  const C = g.Catalogo;
  const DIA = 86400000;
  const M = { DIA };

  /* ---------- utilidades ---------- */
  const r2 = n => Math.round((n + Number.EPSILON) * 100) / 100;
  M.r2 = r2;
  function prng(seed) { let a = seed >>> 0; return () => { a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  const fQ = n => 'Q ' + (+n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const pad = (n, l) => String(n).padStart(l, '0');
  M.finDia = t => { const d = new Date(t); d.setHours(0, 0, 0, 0); return d.getTime(); };
  class Rechazo extends Error { }
  const no = m => { throw new Rechazo(m); };
  function uuidDe(n) { const r = prng(n * 2654435761); const h = k => Array.from({ length: k }, () => Math.floor(r() * 16).toString(16)).join('').toUpperCase(); return `${h(8)}-${h(4)}-4${h(3)}-A${h(3)}-${h(12)}`; }

  /* ---------- base vacía ---------- */
  function baseVacia(ancla) {
    const db = {
      ancla, ahoraSemilla: ancla,
      cfg: { nombre: C.HOSPITAL.nombre, nit: C.HOSPITAL.nit, direccion: 'Finca San Cayetano, ' + C.HOSPITAL.lugar, ivaPct: 12, limiteAprobacion: 25000, diasVence: 90, limiteCF: 2500, metodo: 'Promedio ponderado', aprobarOC: true, separarFunciones: true, ajusteAprueba: true, descuentoAut: true, serie: 'HHG-A', serieInt: 'HHG-C', serieDon: 'HHG-D', doc: 'interno', retISR: true, retIVA: false, serviciosExentos: false },
      usuarios: C.USUARIOS.map(u => ({ ...u, activo: true })),
      bodegas: C.BODEGAS,
      productos: C.crearProductos(), proveedores: C.PROVEEDORES.map(p => ({ ...p })), servicios: C.SERVICIOS,
      lotes: [], movs: [], pacientes: [], cuentas: [], cargos: [], dtes: [], pagos: [], turnos: [],
      pedidos: [], traslados: [], ajustes: [], bajas: [], conteos: [], solicitudes: [], ocs: [], recepciones: [], cxp: [], controlados: [], donaciones: [], bitacora: [],
      seq: { lote: 0, mov: 0, pac: 0, cuenta: 0, cargo: 0, dte: 0, pago: 0, turno: 0, pedido: 0, traslado: 0, ajuste: 0, baja: 0, conteo: 0, sol: 0, oc: 0, rec: 0, cxp: 0, ctrl: 0, don: 0 },
      ix: {},
    };
    db.ix = { prod: new Map(), prov: new Map(), serv: new Map(), lote: new Map(), lotesDe: new Map(), movsDe: new Map(), pac: new Map(), cuenta: new Map(), cargosDe: new Map(), dte: new Map(), ped: new Map(), oc: new Map(), cxp: new Map(), turno: new Map(), tras: new Map(), aj: new Map(), sol: new Map(), rec: new Map(), usr: new Map() };
    db.productos.forEach(p => db.ix.prod.set(p.id, p));
    db.proveedores.forEach(p => db.ix.prov.set(p.id, p));
    db.servicios.forEach(s => db.ix.serv.set(s.id, s));
    db.usuarios.forEach(u => db.ix.usr.set(u.id, u));
    return db;
  }

  /* ---------- inventario ---------- */
  function lote(db, x) {
    const ya = (db.ix.lotesDe.get(x.prod) || []).find(k => k.num === x.num && k.vence === x.vence);
    if (ya) return ya;
    const l = { id: 'l' + (++db.seq.lote), prod: x.prod, num: x.num, vence: x.vence, costo: x.costo, fondo: x.fondo || 'Propio', registro: x.registro || null, ex: {}, entrada: x.ts, prov: x.prov || null };
    db.lotes.push(l); db.ix.lote.set(l.id, l);
    let a = db.ix.lotesDe.get(l.prod); if (!a) db.ix.lotesDe.set(l.prod, a = []);
    a.push(l); a.sort((p, q) => p.vence - q.vence);
    return l;
  }
  function mov(db, o) {
    const p = db.ix.prod.get(o.prod);
    const m = { n: ++db.seq.mov, f: o.ts, t: o.tipo, p: o.prod, l: o.lote, b: o.bod, c: o.cant, u: r2(o.costo * 10000) / 10000, s: p.qty, v: r2(p.valor), d: o.doc, us: o.us };
    db.movs.push(m);
    let a = db.ix.movsDe.get(o.prod); if (!a) db.ix.movsDe.set(o.prod, a = []);
    a.push(m);
    return m;
  }
  function entrar(db, o) { // entrada con costo: mueve el promedio
    const p = db.ix.prod.get(o.prod), l = db.ix.lote.get(o.lote);
    l.ex[o.bod] = (l.ex[o.bod] || 0) + o.cant;
    p.ex[o.bod] = (p.ex[o.bod] || 0) + o.cant;
    p.qty += o.cant; p.valor += o.cant * o.costo;
    return mov(db, { ...o });
  }
  const promedio = p => p.qty > 0 ? p.valor / p.qty : p.costoRef;
  M.promedio = promedio;
  function salirLote(db, o) { // salida de un lote al costo promedio
    const p = db.ix.prod.get(o.prod), l = db.ix.lote.get(o.lote);
    const cu = promedio(p);
    l.ex[o.bod] -= o.cant; p.ex[o.bod] -= o.cant;
    p.qty -= o.cant; p.valor -= o.cant * cu;
    if (p.qty === 0) p.valor = 0;
    mov(db, { ...o, cant: -o.cant, costo: cu });
    return cu;
  }
  function disponible(db, prod, bod, ts) {
    const hoy = M.finDia(ts); let n = 0;
    for (const l of db.ix.lotesDe.get(prod) || []) if (l.vence >= hoy && !l.bloqueo) n += l.ex[bod] || 0;
    return n;
  }
  M.disponible = disponible;
  function sacarFEFO(db, o) { // primero lo que vence primero; nunca lo vencido
    const hoy = M.finDia(o.ts); let falta = o.cant; const partes = []; let costo = 0;
    for (const l of db.ix.lotesDe.get(o.prod) || []) {
      if (falta <= 0) break;
      if (l.vence < hoy || l.bloqueo) continue;
      const hay = l.ex[o.bod] || 0; if (hay <= 0) continue;
      const c = Math.min(hay, falta);
      const cu = salirLote(db, { ...o, lote: l.id, cant: c });
      partes.push({ lote: l.id, cant: c, costo: cu }); costo += c * cu; falta -= c;
    }
    if (falta > 0) throw new Error('FEFO sin validar: ' + o.prod);
    return { partes, costo };
  }
  function trasladar(db, o) { // no mueve el promedio
    const l = db.ix.lote.get(o.lote), p = db.ix.prod.get(l.prod), cu = promedio(p);
    l.ex[o.de] -= o.cant; p.ex[o.de] -= o.cant;
    l.ex[o.a] = (l.ex[o.a] || 0) + o.cant; p.ex[o.a] = (p.ex[o.a] || 0) + o.cant;
    mov(db, { prod: l.prod, lote: l.id, bod: o.de, cant: -o.cant, costo: cu, tipo: 'Traslado sale', doc: o.doc, ts: o.ts, us: o.us });
    mov(db, { prod: l.prod, lote: l.id, bod: o.a, cant: o.cant, costo: cu, tipo: 'Traslado entra', doc: o.doc, ts: o.ts, us: o.us });
  }

  /* ---------- cuentas ---------- */
  function nuevaCuenta(db, d, ctx) {
    const c = { id: 'c' + (++db.seq.cuenta), num: 'C-' + new Date(ctx.ts).getFullYear() + '-' + pad(db.seq.cuenta, 6), pac: d.pac, tipo: d.tipo, area: C.TIPOS_CUENTA[d.tipo].area, medico: d.medico || null, cama: d.cama || null, abierta: ctx.ts, cerrada: null, estado: 'abierta', total: 0, costo: 0, desc: null, dte: null, us: ctx.u };
    db.cuentas.push(c); db.ix.cuenta.set(c.id, c); db.ix.cargosDe.set(c.id, []);
    return c;
  }
  function validarItems(db, items, ts) {
    const pedido = new Map();
    for (const it of items) {
      if (!(it.cant > 0)) no('La cantidad debe ser mayor que cero.');
      if (!it.prod) continue;
      const k = it.prod + '|' + it.bod; pedido.set(k, (pedido.get(k) || 0) + it.cant);
      const p = db.ix.prod.get(it.prod);
      if (p.controlado && !(it.receta && it.receta.num && it.receta.medico)) no(`${p.nombre} es controlado: necesita número de receta y médico.`);
    }
    for (const [k, c] of pedido) {
      const [prod, bod] = k.split('|'); const hay = disponible(db, prod, bod, ts);
      if (hay < c) { const p = db.ix.prod.get(prod); no(`Sin existencia suficiente de ${p.nombre}: se piden ${c} y quedan ${hay} sin vencer en ${nomBod(db, bod)}.`); }
    }
  }
  const nomBod = (db, id) => (db.bodegas.find(b => b.id === id) || {}).nombre || id;
  M.nomBod = nomBod;
  function cargar(db, cuenta, items, ctx) {
    const hechos = [];
    for (const it of items) {
      const k = { id: 'g' + (++db.seq.cargo), cuenta: cuenta.id, f: ctx.ts, cant: it.cant, us: ctx.u, bod: null, prod: null, serv: null, precio: 0, costo: 0, partes: null, rev: null };
      if (it.serv) { const s = db.ix.serv.get(it.serv); k.serv = s.id; k.precio = it.precio != null ? it.precio : s.precio; k.nombre = s.nombre; }
      else {
        const p = db.ix.prod.get(it.prod); k.prod = p.id; k.bod = it.bod; k.precio = p.venta; k.nombre = p.nombre;
        const r = sacarFEFO(db, { prod: p.id, bod: it.bod, cant: it.cant, tipo: 'Consumo paciente', doc: cuenta.num, ts: ctx.ts, us: ctx.u });
        k.costo = r2(r.costo); k.partes = r.partes; cuenta.costo = r2(cuenta.costo + k.costo);
        if (p.controlado) libroControlados(db, p, it, cuenta, r.partes, ctx);
      }
      k.total = r2(k.precio * k.cant);
      db.cargos.push(k); db.ix.cargosDe.get(cuenta.id).push(k);
      cuenta.total = r2(cuenta.total + k.total); hechos.push(k);
    }
    return hechos;
  }
  function libroControlados(db, p, it, cuenta, partes, ctx) {
    for (const x of partes) db.controlados.push({ id: ++db.seq.ctrl, f: ctx.ts, prod: p.id, lote: x.lote, sale: x.cant, entra: 0, saldo: p.qty, receta: it.receta.num, medico: it.receta.medico, colegiado: it.receta.colegiado || '', pac: cuenta.pac, doc: cuenta.num, us: ctx.u });
  }
  const netoCuenta = c => r2(c.total - (c.desc && c.desc.estado === 'aprobado' ? r2(c.total * c.desc.pct / 100) : 0));
  M.netoCuenta = netoCuenta;

  function facturar(db, c, d, ctx) {
    const neto = netoCuenta(c);
    if (neto <= 0 && c.total <= 0) no('La cuenta no tiene cargos.');
    const n = ++db.seq.dte;
    // IVA línea por línea: un genérico inscrito o un servicio exento no lleva IVA dentro del precio.
    let exentoBruto = 0;
    for (const k of db.ix.cargosDe.get(c.id)) {
      const ex = k.serv ? db.cfg.serviciosExentos : !!db.ix.prod.get(k.prod).generico;
      if (ex) exentoBruto += k.total;
    }
    const factor = c.total > 0 ? neto / c.total : 0;
    const exento = r2(exentoBruto * factor), gravado = r2(neto - exento);
    const iva = r2(gravado - gravado / (1 + db.cfg.ivaPct / 100));
    const cert = db.cfg.doc === 'certificador'; // el certificador es opcional: sin él sale comprobante interno
    const f = { id: 'd' + n, tipo: cert ? 'FACT' : 'COMP', serie: cert ? db.cfg.serie : db.cfg.serieInt, num: 100000 + n, uuid: cert ? uuidDe(n) : null, sat: null, f: ctx.ts, cuenta: c.id, nit: d.nit || 'CF', nombre: d.nombre || 'Consumidor final', bruto: c.total, desc: r2(c.total - neto), total: neto, exento, base: r2(gravado - iva), iva, estado: 'vigente', us: ctx.u, area: c.area };
    db.dtes.push(f); db.ix.dte.set(f.id, f);
    c.dte = f.id; c.cerrada = ctx.ts;
    return f;
  }
  function cobrar(db, c, f, pagos, turno, ctx) {
    let suma = 0;
    for (const p of pagos) {
      const x = { id: 'y' + (++db.seq.pago), f: ctx.ts, cuenta: c.id, dte: f.id, forma: p.forma, monto: r2(p.monto), ref: p.ref || '', turno: turno ? turno.id : null, us: ctx.u };
      db.pagos.push(x); suma += x.monto;
      if (turno) turno.mov[p.forma] = r2((turno.mov[p.forma] || 0) + x.monto);
    }
    c.pagado = r2((c.pagado || 0) + suma);
    c.estado = c.pagado >= f.total - .005 ? 'pagada' : 'por cobrar';
  }

  /* ---------- compras ---------- */
  function retenciones(db, base, iva, prov) {
    // ISR (Decreto 10-2012 Arts. 47-48, reformado por 19-2013): 5 % hasta Q30,000 y 7 % sobre el excedente.
    // No se retiene a quien está en pagos trimestrales ni bajo Q2,500 sin IVA (Reglamento, Arts. 34-35).
    const isr = db.cfg.retISR && prov.regimen === 'Opcional simplificado' && base >= 2500 ? r2(base <= 30000 ? base * .05 : 1500 + (base - 30000) * .07) : 0;
    return { isr, iva: db.cfg.retIVA ? r2(iva * .15) : 0 };
  }
  M.retenciones = retenciones;
  function recibir(db, d, ctx) {
    const oc = d.oc ? db.ix.oc.get(d.oc) : null;
    const prov = db.ix.prov.get(oc ? oc.prov : d.prov);
    const n = ++db.seq.rec; const doc = 'REC-' + pad(n, 6);
    let total = 0; const lineas = [];
    for (const it of d.items) {
      const p = db.ix.prod.get(it.prod);
      // El inventario entra sin IVA: ese IVA es crédito, no costo. El pequeño contribuyente no lo desglosa.
      const neto = prov.regimen === 'Pequeño contribuyente' ? it.costo : it.costo / (1 + db.cfg.ivaPct / 100);
      const l = lote(db, { prod: p.id, num: it.lote, vence: it.vence, costo: r2(neto * 10000) / 10000, fondo: oc ? oc.fondo : (d.fondo || 'Propio'), registro: p.registro, ts: ctx.ts, prov: prov.id });
      entrar(db, { prod: p.id, lote: l.id, bod: 'BC', cant: it.cant, costo: neto, tipo: 'Compra', doc, ts: ctx.ts, us: ctx.u });
      if (p.controlado) db.controlados.push({ id: ++db.seq.ctrl, f: ctx.ts, prod: p.id, lote: l.id, sale: 0, entra: it.cant, saldo: p.qty, receta: '', medico: '', colegiado: '', pac: null, doc, us: ctx.u });
      total += it.cant * it.costo; lineas.push({ prod: p.id, cant: it.cant, costo: it.costo, lote: l.id });
      if (oc) { const li = oc.items.find(x => x.prod === p.id); if (li) li.recibido = (li.recibido || 0) + it.cant; }
    }
    total = r2(total);
    const pequeño = prov.regimen === 'Pequeño contribuyente';
    const iva = pequeño ? 0 : r2(total - total / 1.12), base = r2(total - iva);
    const ret = retenciones(db, base, iva, prov);
    const rec = { id: 'r' + n, num: doc, f: ctx.ts, oc: oc ? oc.id : null, prov: prov.id, serie: d.factura.serie, factura: d.factura.num, fFactura: d.factura.fecha || ctx.ts, total, base, iva, tipoDoc: pequeño ? 'FPEQ' : 'FACT', ret, lineas, us: ctx.u, fondo: oc ? oc.fondo : (d.fondo || 'Propio'), uuid: d.factura.uuid || null, origen: d.origen || 'orden' };
    db.recepciones.push(rec); db.ix.rec.set(rec.id, rec);
    const x = { id: 'x' + (++db.seq.cxp), rec: rec.id, prov: prov.id, f: ctx.ts, vence: ctx.ts + prov.dias * DIA, total, ret, aPagar: r2(total - ret.isr - ret.iva), estado: 'pendiente', pago: null };
    db.cxp.push(x); db.ix.cxp.set(x.id, x);
    if (oc) oc.estado = oc.items.every(i => (i.recibido || 0) >= i.cant) ? 'recibida' : 'parcial';
    return rec;
  }

  /* ---------- operaciones ---------- */
  const ops = {
    'paciente.crear'(db, d, ctx) {
      if (!d.nombre || d.nombre.trim().length < 3) no('Falta el nombre del paciente.');
      if (d.dpi && db.pacientes.some(p => p.dpi === d.dpi)) no('Ya existe un paciente con ese DPI.');
      const n = ++db.seq.pac;
      const p = { id: 'a' + n, exp: 'HG-' + pad(n, 6), nombre: d.nombre.trim(), dpi: d.dpi || '', nit: d.nit || 'CF', nac: d.nac || null, sexo: d.sexo || '', tel: d.tel || '', muni: d.muni || '', alta: ctx.ts };
      db.pacientes.push(p); db.ix.pac.set(p.id, p);
      return { id: p.id, txt: `Registró al paciente ${p.exp}` };
    },
    'paciente.editar'(db, d) {
      const p = db.ix.pac.get(d.id) || no('Paciente no encontrado.');
      Object.assign(p, d.datos); return { txt: `Editó al paciente ${p.exp}` };
    },
    'cuenta.abrir'(db, d, ctx) {
      if (!db.ix.pac.get(d.pac)) no('Elija un paciente.');
      const ya = db.cuentas.find(c => c.pac === d.pac && c.estado === 'abierta' && c.tipo === d.tipo && d.tipo !== 'farmacia');
      if (ya) return { id: ya.id, aviso: 'Ese paciente ya tenía esta cuenta abierta. Se usa la misma.', txt: `Reabrió ${ya.num}` };
      const c = nuevaCuenta(db, d, ctx);
      return { id: c.id, txt: `Abrió la cuenta ${c.num}` };
    },
    'cuenta.cargo'(db, d, ctx) {
      const c = db.ix.cuenta.get(d.cuenta) || no('Cuenta no encontrada.');
      if (c.estado !== 'abierta') no(`La cuenta ${c.num} ya no está abierta: otro dispositivo la cerró.`);
      validarItems(db, d.items, ctx.ts);
      const h = cargar(db, c, d.items, ctx);
      return { txt: `Cargó ${h.length} ${h.length === 1 ? 'línea' : 'líneas'} a ${c.num}` };
    },
    'cuenta.devolver'(db, d, ctx) {
      const k = db.cargos.find(x => x.id === d.cargo) || no('Línea no encontrada.');
      const c = db.ix.cuenta.get(k.cuenta);
      if (c.estado !== 'abierta') no('Solo se devuelve en cuentas abiertas. Para una factura, use nota de crédito.');
      if (k.rev) no('Esa línea ya fue devuelta.');
      if (k.cant < 0) no('Esa línea ya es una devolución.');
      const inv = { id: 'g' + (++db.seq.cargo), cuenta: c.id, f: ctx.ts, cant: -k.cant, us: ctx.u, bod: k.bod, prod: k.prod, serv: k.serv, precio: k.precio, costo: -k.costo, partes: null, rev: k.id, nombre: k.nombre + ' (devolución)', total: -k.total };
      if (k.prod) for (const x of k.partes) entrar(db, { prod: k.prod, lote: x.lote, bod: k.bod, cant: x.cant, costo: x.costo, tipo: 'Devolución', doc: c.num, ts: ctx.ts, us: ctx.u });
      k.rev = inv.id; db.cargos.push(inv); db.ix.cargosDe.get(c.id).push(inv);
      c.total = r2(c.total - k.total); c.costo = r2(c.costo - k.costo);
      return { txt: `Devolvió una línea de ${c.num}` };
    },
    'descuento.pedir'(db, d, ctx) {
      const c = db.ix.cuenta.get(d.cuenta) || no('Cuenta no encontrada.');
      if (c.dte) no('La cuenta ya está facturada.');
      c.desc = { pct: d.pct, motivo: d.motivo, estado: db.cfg.descuentoAut ? 'pendiente' : 'aprobado', pide: ctx.u, f: ctx.ts };
      return { txt: `Pidió descuento social en ${c.num}` };
    },
    'descuento.resolver'(db, d, ctx) {
      const c = db.ix.cuenta.get(d.cuenta) || no('Cuenta no encontrada.');
      if (!c.desc || c.desc.estado !== 'pendiente') no('Otro usuario ya resolvió ese descuento.');
      if (c.dte) no('La cuenta ya está facturada.');
      c.desc.estado = d.aprobar ? 'aprobado' : 'rechazado'; c.desc.pct = d.pct != null ? d.pct : c.desc.pct; c.desc.resuelve = ctx.u; c.desc.fr = ctx.ts; c.desc.estudio = d.estudio || '';
      return { txt: `${d.aprobar ? 'Aprobó' : 'Rechazó'} descuento en ${c.num}` };
    },
    'cuenta.facturar'(db, d, ctx) {
      const c = db.ix.cuenta.get(d.cuenta) || no('Cuenta no encontrada.');
      if (c.dte) no(`La cuenta ${c.num} ya fue facturada desde otro dispositivo.`);
      if (c.estado !== 'abierta') no('La cuenta no está abierta.');
      if (c.desc && c.desc.estado === 'pendiente') no('Hay un descuento social pendiente de resolver.');
      const t = db.ix.turno.get(d.turno);
      if (!t || t.estado !== 'abierto') no('Abra su turno de caja antes de cobrar.');
      const neto = netoCuenta(c);
      if (db.cfg.doc === 'certificador' && neto >= db.cfg.limiteCF && (!d.nit || d.nit === 'CF')) no(`Desde Q ${db.cfg.limiteCF.toLocaleString('en-US', { minimumFractionDigits: 2 })} la factura necesita NIT o CUI.`);
      const f = facturar(db, c, d, ctx);
      const pagos = (d.pagos || []).filter(p => p.monto > 0);
      if (!pagos.length && neto > 0) no('Registre al menos una forma de pago.');
      cobrar(db, c, f, pagos, t, ctx);
      return { id: f.id, txt: `${f.tipo === 'FACT' ? 'Emitió factura' : 'Cobró'} ${f.serie}-${f.num} por ${fQ(f.total)}` };
    },
    'dte.notaCredito'(db, d, ctx) {
      const f = db.ix.dte.get(d.dte) || no('Documento no encontrado.');
      if (!['FACT', 'COMP'].includes(f.tipo)) no('Ese documento no se puede devolver.');
      if (f.estado !== 'vigente') no('Ese documento ya tiene devolución.');
      if (!d.motivo || d.motivo.trim().length < 5) no('Escriba el motivo.');
      const n = ++db.seq.dte;
      const nc = { id: 'd' + n, tipo: f.tipo === 'FACT' ? 'NCRE' : 'DEV', serie: f.serie, num: 100000 + n, uuid: f.tipo === 'FACT' ? uuidDe(n) : null, f: ctx.ts, cuenta: f.cuenta, nit: f.nit, nombre: f.nombre, bruto: -f.bruto, desc: -f.desc, total: -f.total, exento: -f.exento, base: -f.base, iva: -f.iva, estado: 'vigente', us: ctx.u, area: f.area, origen: f.id, motivo: d.motivo };
      db.dtes.push(nc); db.ix.dte.set(nc.id, nc);
      f.estado = 'acreditada'; f.nc = nc.id;
      const c = db.ix.cuenta.get(f.cuenta); c.estado = 'anulada';
      if (d.reingresar) for (const k of db.ix.cargosDe.get(c.id)) if (k.prod && k.partes && !k.rev) for (const x of k.partes) entrar(db, { prod: k.prod, lote: x.lote, bod: k.bod, cant: x.cant, costo: x.costo, tipo: 'Devolución', doc: `NCRE ${nc.num}`, ts: ctx.ts, us: ctx.u });
      return { id: nc.id, txt: `${nc.tipo === 'NCRE' ? 'Emitió nota de crédito' : 'Registró devolución'} ${nc.serie}-${nc.num}` };
    },
    'dte.anular'(db, d, ctx) {
      const f = db.ix.dte.get(d.dte) || no('Documento no encontrado.');
      if (f.estado !== 'vigente') no('Ese documento ya no está vigente.');
      const a = new Date(f.f), b = new Date(ctx.ts);
      if (a.getMonth() !== b.getMonth() || a.getFullYear() !== b.getFullYear()) no('Fuera del mes de emisión ya no se anula: emita nota de crédito.');
      if (!d.motivo || d.motivo.trim().length < 5) no('Escriba el motivo.');
      f.estado = 'anulada'; f.anula = { f: ctx.ts, us: ctx.u, motivo: d.motivo };
      const c = db.ix.cuenta.get(f.cuenta); c.estado = 'anulada';
      for (const y of db.pagos) if (y.dte === f.id && y.turno) { const t = db.ix.turno.get(y.turno); if (t.estado === 'abierto') t.mov[y.forma] = r2((t.mov[y.forma] || 0) - y.monto); }
      return { txt: `Anuló factura ${f.serie}-${f.num}` };
    },
    'dte.anotar'(db, d) { // factura hecha fuera del sistema, por ejemplo en el portal de la SAT
      const f = db.ix.dte.get(d.dte) || no('Documento no encontrado.');
      if (!d.num) no('Escriba el número de factura.');
      f.sat = { serie: d.serie || '', num: d.num };
      return { txt: `Anotó factura ${d.serie || ''} ${d.num} en ${f.serie}-${f.num}` };
    },
    /* Mostrador: un solo paso. Baja del inventario, cobra y deja el documento. */
    'venta.directa'(db, d, ctx) {
      const t = db.ix.turno.get(d.turno);
      if (!t || t.estado !== 'abierto') no('Abra la caja de farmacia antes de vender.');
      if (!d.items || !d.items.length) no('Agregue al menos un producto.');
      validarItems(db, d.items, ctx.ts);
      const total = r2(d.items.reduce((a, it) => a + db.ix.prod.get(it.prod).venta * it.cant, 0));
      if (db.cfg.doc === 'certificador' && total >= db.cfg.limiteCF && (!d.nit || d.nit === 'CF')) no(`Desde Q ${db.cfg.limiteCF.toLocaleString('en-US', { minimumFractionDigits: 2 })} la factura necesita NIT o CUI.`);
      const pagos = (d.pagos || []).filter(p => p.monto > 0); const suma = pagos.reduce((a, p) => a + p.monto, 0);
      if (Math.abs(suma - total) > .005) no(`Los pagos suman ${fQ(suma)} y el total es ${fQ(total)}.`);
      const c = nuevaCuenta(db, { pac: d.pac || 'a1', tipo: 'farmacia' }, ctx);
      cargar(db, c, d.items, ctx);
      const f = facturar(db, c, d, ctx); cobrar(db, c, f, pagos, t, ctx);
      return { id: f.id, txt: `Vendió ${d.items.length} ${d.items.length === 1 ? 'producto' : 'productos'} por ${fQ(f.total)}` };
    },
    'lote.bloquear'(db, d, ctx) {
      const l = db.ix.lote.get(d.lote) || no('Lote no encontrado.');
      if (d.bloquear && (!d.motivo || d.motivo.trim().length < 5)) no('Escriba el motivo.');
      l.bloqueo = d.bloquear ? { motivo: d.motivo, us: ctx.u, f: ctx.ts } : null;
      return { txt: `${d.bloquear ? 'Bloqueó' : 'Liberó'} el lote ${l.num}` };
    },
    'caja.abrir'(db, d, ctx) {
      if (db.turnos.some(t => t.us === ctx.u && t.estado === 'abierto')) no('Ya tiene un turno abierto.');
      const t = { id: 't' + (++db.seq.turno), caja: d.caja, us: ctx.u, abre: ctx.ts, fondo: r2(d.fondo || 0), mov: {}, estado: 'abierto', cierre: null };
      db.turnos.push(t); db.ix.turno.set(t.id, t);
      return { id: t.id, txt: `Abrió turno en ${d.caja}` };
    },
    'caja.cerrar'(db, d, ctx) {
      const t = db.ix.turno.get(d.turno) || no('Turno no encontrado.');
      if (t.estado !== 'abierto') no('Ese turno ya está cerrado.');
      const esperado = r2(t.fondo + (t.mov.Efectivo || 0));
      t.estado = 'cerrado'; t.cierra = ctx.ts; t.cierre = { esperado, contado: r2(d.contado), dif: r2(d.contado - esperado), nota: d.nota || '' };
      return { txt: `Cerró turno de ${t.caja}, diferencia ${fQ(t.cierre.dif)}` };
    },
    'pedido.crear'(db, d, ctx) {
      const c = db.ix.cuenta.get(d.cuenta) || no('Elija la cuenta del paciente.');
      if (c.estado !== 'abierta') no('La cuenta ya no está abierta.');
      if (!d.items.length) no('Agregue al menos un producto.');
      const p = { id: 'e' + (++db.seq.pedido), num: 'PED-' + pad(db.seq.pedido, 6), cuenta: c.id, area: c.area, items: d.items, nota: d.nota || '', f: ctx.ts, us: ctx.u, estado: 'pendiente', urgente: !!d.urgente };
      db.pedidos.push(p); db.ix.ped.set(p.id, p);
      return { id: p.id, txt: `Envió ${p.num} a farmacia` };
    },
    'pedido.despachar'(db, d, ctx) {
      const p = db.ix.ped.get(d.id) || no('Pedido no encontrado.');
      if (p.estado !== 'pendiente') no(`El ${p.num} ya fue atendido por otro usuario.`);
      const c = db.ix.cuenta.get(p.cuenta);
      if (c.estado !== 'abierta') no('La cuenta del paciente ya se cerró.');
      const items = p.items.map((it, i) => ({ ...it, bod: 'FX', receta: (d.recetas || {})[i] || it.receta }));
      validarItems(db, items, ctx.ts);
      cargar(db, c, items, ctx);
      p.estado = 'despachado'; p.despacha = ctx.u; p.fd = ctx.ts;
      return { txt: `Despachó ${p.num}` };
    },
    'pedido.rechazar'(db, d, ctx) {
      const p = db.ix.ped.get(d.id) || no('Pedido no encontrado.');
      if (p.estado !== 'pendiente') no('Ya fue atendido.');
      p.estado = 'rechazado'; p.motivo = d.motivo; p.despacha = ctx.u; p.fd = ctx.ts;
      return { txt: `Rechazó ${p.num}` };
    },
    'traslado.pedir'(db, d, ctx) {
      if (d.de === d.a) no('Origen y destino son iguales.');
      if (!d.items.length) no('Agregue al menos un producto.');
      const t = { id: 'm' + (++db.seq.traslado), num: 'TR-' + pad(db.seq.traslado, 6), de: d.de, a: d.a, items: d.items, f: ctx.ts, us: ctx.u, estado: 'solicitado' };
      db.traslados.push(t); db.ix.tras.set(t.id, t);
      return { id: t.id, txt: `Solicitó ${t.num}` };
    },
    'traslado.enviar'(db, d, ctx) {
      const t = db.ix.tras.get(d.id) || no('Traslado no encontrado.');
      if (t.estado !== 'solicitado') no('Otro usuario ya lo envió.');
      for (const it of t.items) { const hay = disponible(db, it.prod, t.de, ctx.ts); if (hay < it.cant) no(`${db.ix.prod.get(it.prod).nombre}: solo hay ${hay} en ${nomBod(db, t.de)}.`); }
      t.partes = [];
      const hoy = M.finDia(ctx.ts);
      for (const it of t.items) {
        let falta = it.cant;
        for (const l of db.ix.lotesDe.get(it.prod)) {
          if (falta <= 0) break; if (l.vence < hoy || l.bloqueo) continue;
          const c = Math.min(l.ex[t.de] || 0, falta); if (c <= 0) continue;
          trasladar(db, { lote: l.id, de: t.de, a: 'TR', cant: c, doc: t.num, ts: ctx.ts, us: ctx.u }); t.partes.push({ lote: l.id, cant: c }); falta -= c;
        }
      }
      t.estado = 'en camino'; t.envia = ctx.u; t.fe = ctx.ts;
      return { txt: `Envió ${t.num}` };
    },
    'traslado.recibir'(db, d, ctx) {
      const t = db.ix.tras.get(d.id) || no('Traslado no encontrado.');
      if (t.estado !== 'en camino') no('Ese traslado no está en camino.');
      for (const x of t.partes) trasladar(db, { lote: x.lote, de: 'TR', a: t.a, cant: x.cant, doc: t.num, ts: ctx.ts, us: ctx.u });
      t.estado = 'recibido'; t.recibe = ctx.u; t.fr = ctx.ts;
      return { txt: `Recibió ${t.num}` };
    },
    'ajuste.pedir'(db, d, ctx) {
      const l = db.ix.lote.get(d.lote) || no('Elija un lote.');
      if (!d.cant) no('Indique la diferencia.');
      if (!d.motivo) no('Indique el motivo.');
      const a = { id: 'j' + (++db.seq.ajuste), num: 'AJ-' + pad(db.seq.ajuste, 6), lote: l.id, prod: l.prod, bod: d.bod, cant: d.cant, motivo: d.motivo, f: ctx.ts, us: ctx.u, estado: 'pendiente', origen: d.origen || null };
      db.ajustes.push(a); db.ix.aj.set(a.id, a);
      if (!db.cfg.ajusteAprueba) { ops['ajuste.resolver'](db, { id: a.id, aprobar: true, auto: true }, ctx); return { id: a.id, txt: `Aplicó ajuste ${a.num}` }; }
      return { id: a.id, txt: `Pidió ajuste ${a.num}` };
    },
    'ajuste.resolver'(db, d, ctx) {
      const a = db.ix.aj.get(d.id) || no('Ajuste no encontrado.');
      if (a.estado !== 'pendiente') no('Otro usuario ya lo resolvió.');
      if (!d.auto && db.cfg.separarFunciones && a.us === ctx.u) no('Quien pide un ajuste no puede aprobarlo.');
      if (d.aprobar) {
        const l = db.ix.lote.get(a.lote);
        if (a.cant < 0) { if ((l.ex[a.bod] || 0) < -a.cant) no('El lote ya no tiene esa existencia.'); salirLote(db, { prod: a.prod, lote: a.lote, bod: a.bod, cant: -a.cant, tipo: 'Ajuste', doc: a.num, ts: ctx.ts, us: ctx.u }); }
        else entrar(db, { prod: a.prod, lote: a.lote, bod: a.bod, cant: a.cant, costo: promedio(db.ix.prod.get(a.prod)), tipo: 'Ajuste', doc: a.num, ts: ctx.ts, us: ctx.u });
      }
      a.estado = d.aprobar ? 'aprobado' : 'rechazado'; a.resuelve = ctx.u; a.fr = ctx.ts;
      return { txt: `${d.aprobar ? 'Aprobó' : 'Rechazó'} ${a.num}` };
    },
    'baja.crear'(db, d, ctx) {
      const l = db.ix.lote.get(d.lote) || no('Elija un lote.');
      if ((l.ex[d.bod] || 0) < d.cant || !(d.cant > 0)) no(`El lote solo tiene ${l.ex[d.bod] || 0} en ${nomBod(db, d.bod)}.`);
      if (!d.acta) no('Escriba el número de acta.');
      const n = ++db.seq.baja; const num = 'BAJ-' + pad(n, 6);
      const cu = salirLote(db, { prod: l.prod, lote: l.id, bod: d.bod, cant: d.cant, tipo: 'Baja', doc: num, ts: ctx.ts, us: ctx.u });
      // Faltante genera IVA; perecederos, fuerza mayor y delito no (Decreto 27-92 Art. 3 num. 7).
      db.bajas.push({ id: 'b' + n, num, lote: l.id, prod: l.prod, bod: d.bod, cant: d.cant, motivo: d.motivo, acta: d.acta, costo: r2(cu * d.cant), generaIVA: d.motivo === 'Faltante', f: ctx.ts, us: ctx.u });
      return { txt: `Dio de baja ${d.cant} del lote ${l.num} (${d.motivo})` };
    },
    'conteo.crear'(db, d, ctx) {
      const n = ++db.seq.conteo; const num = 'CF-' + pad(n, 5);
      const lineas = d.lineas.map(x => { const l = db.ix.lote.get(x.lote); return { ...x, sistema: l.ex[d.bod] || 0, dif: x.contado - (l.ex[d.bod] || 0) }; });
      db.conteos.push({ id: 'k' + n, num, bod: d.bod, lineas, f: ctx.ts, us: ctx.u });
      for (const x of lineas) if (x.dif !== 0) ops['ajuste.pedir'](db, { lote: x.lote, bod: d.bod, cant: x.dif, motivo: 'Conteo físico ' + num, origen: num }, ctx);
      const dif = lineas.filter(x => x.dif !== 0).length;
      return { txt: `Registró ${num}: ${dif} ${dif === 1 ? 'diferencia' : 'diferencias'}`, dif };
    },
    'producto.guardar'(db, d) {
      if (!d.nombre) no('Falta el nombre.');
      if (d.id) { const p = db.ix.prod.get(d.id); Object.assign(p, d.datos || d); return { txt: `Editó ${p.cod}` }; }
      const n = db.productos.length + 1; const p = { id: 'p' + n, cod: 'NUE-' + pad(n, 4), nombre: d.nombre, pres: d.pres, venta: +d.venta || 0, costoRef: +d.costoRef || 0, cat: d.cat, controlado: d.controlado || null, frio: !!d.frio, registro: d.registro || null, min: +d.min || 0, max: +d.max || 0, activo: true, qty: 0, valor: 0, ex: {} };
      db.productos.push(p); db.ix.prod.set(p.id, p);
      return { id: p.id, txt: `Creó ${p.cod}` };
    },
    'proveedor.guardar'(db, d) {
      if (d.id) { const p = db.ix.prov.get(d.id); Object.assign(p, d); return { txt: `Editó ${p.cod}` }; }
      if (!d.nombre || !d.nit) no('Faltan nombre y NIT.');
      const n = db.proveedores.length + 1; const p = { id: 'v' + n, cod: 'PR-' + pad(n, 3), nombre: d.nombre, nit: d.nit, rubro: d.rubro, dias: +d.dias || 0, regimen: d.regimen, tel: d.tel || '', activo: true };
      db.proveedores.push(p); db.ix.prov.set(p.id, p);
      return { id: p.id, txt: `Creó proveedor ${p.cod}` };
    },
    'solicitud.crear'(db, d, ctx) {
      if (!d.items.length) no('Agregue al menos un producto.');
      const s = { id: 's' + (++db.seq.sol), num: 'SOL-' + pad(db.seq.sol, 6), area: d.area, items: d.items, nota: d.nota || '', f: ctx.ts, us: ctx.u, estado: 'pendiente' };
      db.solicitudes.push(s); db.ix.sol.set(s.id, s);
      return { id: s.id, txt: `Creó ${s.num}` };
    },
    'solicitud.rechazar'(db, d, ctx) {
      const s = db.ix.sol.get(d.id); if (s.estado !== 'pendiente') no('Ya fue atendida.');
      s.estado = 'rechazada'; s.motivo = d.motivo; s.fr = ctx.ts; s.resuelve = ctx.u;
      return { txt: `Rechazó ${s.num}` };
    },
    'oc.crear'(db, d, ctx) {
      if (!db.ix.prov.get(d.prov)) no('Elija un proveedor.');
      if (!d.items.length) no('Agregue al menos un producto.');
      const total = r2(d.items.reduce((a, i) => a + i.cant * i.costo, 0));
      const o = { id: 'o' + (++db.seq.oc), num: 'OC-' + pad(db.seq.oc, 6), prov: d.prov, fondo: d.fondo || 'Propio', items: d.items.map(i => ({ ...i, recibido: 0 })), total, f: ctx.ts, us: ctx.u, sol: d.sol || null, nog: d.nog || '', estado: db.cfg.aprobarOC && total >= db.cfg.limiteAprobacion ? 'por aprobar' : 'aprobada', aprueba: null };
      db.ocs.push(o); db.ix.oc.set(o.id, o);
      if (d.sol) { const s = db.ix.sol.get(d.sol); if (s) { s.estado = 'atendida'; s.oc = o.id; } }
      return { id: o.id, txt: `Creó ${o.num} por ${fQ(total)}`, estado: o.estado };
    },
    'oc.resolver'(db, d, ctx) {
      const o = db.ix.oc.get(d.id) || no('Orden no encontrada.');
      if (o.estado !== 'por aprobar') no('Otro usuario ya la resolvió.');
      if (db.cfg.separarFunciones && o.us === ctx.u) no('Quien crea la orden no puede aprobarla.');
      o.estado = d.aprobar ? 'aprobada' : 'rechazada'; o.aprueba = ctx.u; o.fa = ctx.ts;
      return { txt: `${d.aprobar ? 'Aprobó' : 'Rechazó'} ${o.num}` };
    },
    'compra.recibir'(db, d, ctx) {
      const oc = db.ix.oc.get(d.oc) || no('Orden no encontrada.');
      if (!['aprobada', 'parcial'].includes(oc.estado)) no(`La orden ${oc.num} no está lista para recibir (${oc.estado}).`);
      if (!d.factura || !d.factura.num) no('Escriba serie y número de factura.');
      if (db.recepciones.some(r => r.prov === oc.prov && r.factura === d.factura.num && r.serie === d.factura.serie)) no('Esa factura de ese proveedor ya fue registrada.');
      const items = d.items.filter(i => i.cant > 0);
      if (!items.length) no('Indique lo recibido.');
      for (const i of items) {
        if (!i.lote) no('Cada línea necesita número de lote.');
        if (!i.vence) no('Cada línea necesita fecha de vencimiento.');
        if (i.vence < M.finDia(ctx.ts)) no(`El lote ${i.lote} ya viene vencido.`);
      }
      const r = recibir(db, { ...d, items }, ctx);
      return { id: r.id, txt: `Recibió ${r.num} de ${oc.num}` };
    },
    'cxp.pagar'(db, d, ctx) {
      const x = db.ix.cxp.get(d.id) || no('Documento no encontrado.');
      if (x.estado !== 'pendiente') no('Otro usuario ya pagó ese documento.');
      if (!d.ref) no('Escriba el número de cheque o transferencia.');
      x.estado = 'pagado'; x.pago = { f: ctx.ts, forma: d.forma, ref: d.ref, us: ctx.u };
      return { txt: `Pagó ${fQ(x.aPagar)} (${d.forma} ${d.ref})` };
    },
    /* Un solo camino para ingresar mercadería: factura, XML, Excel o saldo inicial. Siempre entra a Bodega central. */
    'ingreso.registrar'(db, d, ctx) {
      const items = (d.items || []).filter(i => i.cant > 0);
      if (!items.length) no('Agregue al menos un producto con cantidad.');
      const hoy = M.finDia(ctx.ts);
      for (const i of items) {
        if (!db.ix.prod.get(i.prod)) no('Hay una línea sin relacionar con un producto.');
        if (!i.lote) no('Cada línea necesita número de lote.');
        if (!i.vence) no('Cada línea necesita fecha de vencimiento.');
        if (i.vence < hoy) no(`El lote ${i.lote} ya viene vencido: no entra al inventario.`);
        if (!(i.costo >= 0)) no('Revise el costo de cada línea.');
      }
      if (d.origen === 'saldo') {
        const n = ++db.seq.rec, doc = 'SAL-' + pad(n, 6);
        for (const i of items) {
          const p = db.ix.prod.get(i.prod), l = lote(db, { prod: p.id, num: i.lote, vence: i.vence, costo: i.costo, fondo: d.fondo || 'Propio', registro: p.registro, ts: ctx.ts });
          entrar(db, { prod: p.id, lote: l.id, bod: 'BC', cant: i.cant, costo: i.costo, tipo: 'Saldo inicial', doc, ts: ctx.ts, us: ctx.u });
        }
        return { doc, txt: `Registró saldos iniciales ${doc}: ${items.length} ${items.length === 1 ? 'línea' : 'líneas'}` };
      }
      if (!db.ix.prov.get(d.prov)) no('Elija el proveedor.');
      if (!d.factura || !d.factura.num) no('Escriba serie y número de factura.');
      if (db.recepciones.some(r => r.prov === d.prov && r.factura === d.factura.num && r.serie === d.factura.serie)) no('Esa factura de ese proveedor ya fue ingresada.');
      const r = recibir(db, { prov: d.prov, factura: d.factura, items, fondo: d.fondo, origen: d.origen }, ctx);
      return { id: r.id, doc: r.num, txt: `Ingresó ${r.num}: ${items.length} ${items.length === 1 ? 'línea' : 'líneas'} por ${fQ(r.total)}` };
    },
    'rol.permisos'(db, d) { C.ROLES[d.rol].acciones = d.acciones; return { txt: `Cambió permisos de ${C.ROLES[d.rol].nombre}` }; },
    'usuario.crear'(db, d) {
      if (!d.nombre || d.nombre.trim().length < 3) no('Falta el nombre.');
      if (!/^\d{4}$/.test(d.pin || '')) no('El PIN lleva 4 números.');
      const u = { id: 'n' + (db.usuarios.length + 1), nombre: d.nombre.trim(), rol: d.rol, pin: d.pin, disp: d.disp || 'Computadora · ' + C.ROLES[d.rol].nombre, activo: true };
      db.usuarios.push(u); db.ix.usr.set(u.id, u);
      return { id: u.id, txt: `Creó al usuario ${u.nombre}` };
    },
    'servicio.guardar'(db, d) {
      if (!d.nombre) no('Falta el nombre.');
      if (d.id) { const s = db.ix.serv.get(d.id); Object.assign(s, d); return { txt: `Editó el servicio ${s.cod}` }; }
      const n = db.servicios.length + 1, s = { id: 'sv' + n, cod: 'S' + pad(n + 100, 3), nombre: d.nombre, area: d.area, precio: +d.precio || 0 };
      db.servicios.push(s); db.ix.serv.set(s.id, s);
      return { id: s.id, txt: `Creó el servicio ${s.cod}` };
    },
    'donacion.entrada'(db, d, ctx) {
      if (!d.donante) no('Indique el donante.');
      if (!d.items.length) no('Agregue al menos un producto.');
      const n = ++db.seq.don; const num = 'DON-' + pad(n, 5); let valor = 0; const lineas = [];
      for (const it of d.items) {
        if (!it.lote || !it.vence) no('Cada línea necesita lote y vencimiento.');
        if (it.vence < M.finDia(ctx.ts)) no(`El lote ${it.lote} ya viene vencido: no se ingresa, se da de baja con acta.`);
        const p = db.ix.prod.get(it.prod);
        const l = lote(db, { prod: p.id, num: it.lote, vence: it.vence, costo: it.costo, fondo: 'Donación', registro: p.registro, ts: ctx.ts });
        entrar(db, { prod: p.id, lote: l.id, bod: 'BC', cant: it.cant, costo: it.costo, tipo: 'Donación', doc: num, ts: ctx.ts, us: ctx.u });
        valor += it.cant * it.costo; lineas.push({ prod: p.id, cant: it.cant, costo: it.costo, lote: l.id });
      }
      db.donaciones.push({ id: 'n' + n, num, tipo: 'Especie', donante: d.donante, nit: d.nit || 'CF', serie: db.cfg.serieDon, recibo: 500000 + n, uuid: uuidDe(900000 + n), valor: r2(valor), lineas, f: ctx.ts, us: ctx.u, nota: d.nota || '' });
      return { txt: `Registró donación ${num}` };
    },
    'donacion.dinero'(db, d, ctx) {
      if (!d.donante) no('Indique el donante.');
      if (!(d.monto > 0)) no('Indique el monto.');
      const n = ++db.seq.don;
      db.donaciones.push({ id: 'n' + n, num: 'DON-' + pad(n, 5), tipo: 'Dinero', donante: d.donante, nit: d.nit || 'CF', serie: db.cfg.serieDon, recibo: 500000 + n, uuid: uuidDe(900000 + n), valor: r2(d.monto), forma: d.forma, lineas: [], f: ctx.ts, us: ctx.u, nota: d.nota || '' });
      return { txt: `Emitió recibo de donación por ${fQ(d.monto)}` };
    },
    'config.guardar'(db, d) { Object.assign(db.cfg, d); return { txt: 'Cambió la configuración' }; },
    'usuario.guardar'(db, d) { const u = db.ix.usr.get(d.id); Object.assign(u, d); return { txt: `Editó al usuario ${u.nombre}` }; },
    /* Un paciente completo en una operación: lo usa el simulador de hora pico */
    'sim.paciente'(db, d, ctx) {
      const a = ops['paciente.crear'](db, d.pac, ctx);
      const c = nuevaCuenta(db, { pac: a.id, tipo: d.tipo }, ctx);
      const items = d.items.filter(it => !it.prod || disponible(db, it.prod, it.bod, ctx.ts) >= it.cant);
      cargar(db, c, items, ctx);
      const t = db.ix.turno.get(d.turno);
      if (t && t.estado === 'abierto' && c.total > 0 && c.total < db.cfg.limiteCF) { const f = facturar(db, c, { nit: 'CF' }, ctx); cobrar(db, c, f, [{ forma: d.forma, monto: f.total }], t, ctx); }
      return { txt: `Atendió ${c.num} por ${fQ(c.total)}` };
    },
  };
  M.ops = ops;

  /* ---------- aplicar ---------- */
  function aplicar(db, op) {
    const ctx = { u: op.u, disp: op.disp, ts: op.ts };
    let r;
    try { r = ops[op.tipo](db, op.d, ctx); r = { ok: true, ...r }; }
    catch (e) { if (!(e instanceof Rechazo)) { console.error(op, e); r = { ok: false, error: 'No se pudo completar la operación.' }; } else r = { ok: false, error: e.message }; }
    db.bitacora.push({ ts: op.ts, u: op.u, disp: op.disp, tipo: op.tipo, txt: r.ok ? r.txt : 'Rechazado: ' + r.error, ok: r.ok });
    return r;
  }
  M.aplicar = aplicar;

  /* ---------- semilla: 2 meses y días de operación real ---------- */
  M.sembrar = function (ancla, opciones = {}) {
    const db = baseVacia(ancla); const R = prng(20261106); const rnd = (a, b) => a + Math.floor(R() * (b - a + 1)); const de = a => a[Math.floor(R() * a.length)];
    const ini = new Date(ancla); ini.setDate(1); ini.setMonth(ini.getMonth() - 2); ini.setHours(0, 0, 0, 0);
    const hoy = M.finDia(ancla); const dias = Math.round((hoy - ini.getTime()) / DIA) + 1;
    const escala = opciones.escala || 1;
    const prods = db.productos;

    /* Saldos iniciales: cada producto con dos lotes; algunos cerca de vencer o ya vencidos para que el semáforo tenga trabajo */
    for (const p of prods) {
      const n = p.max * 1.3; const peso = p.cat === 'Uso interno' ? .4 : 1;
      for (let k = 0; k < 2; k++) {
        const r = R();
        const vence = r < .02 ? hoy - rnd(3, 40) * DIA : r < .10 ? hoy + rnd(10, 85) * DIA : hoy + rnd(120, 800) * DIA;
        const fondo = R() < .12 ? 'Donación' : R() < .10 ? 'Fondos públicos' : 'Propio';
        const costo = r2(p.costoRef * (1 + (R() - .5) * .08));
        const l = lote(db, { prod: p.id, num: (p.cat === 'Medicamento' ? 'L' : 'B') + rnd(10000, 99999), vence, costo, fondo, registro: p.registro, ts: ini.getTime() });
        const c = Math.max(1, Math.round(n * peso * (k ? .55 : .85)));
        entrar(db, { prod: p.id, lote: l.id, bod: 'BC', cant: c, costo, tipo: 'Saldo inicial', doc: 'APERTURA', ts: ini.getTime(), us: 'u8' });
        for (const [b, frac] of [['FX', .45], ['QX', .1], ['EM', .08], ['EN', .08], ['LB', .05]]) {
          if (b === 'LB' && p.cat !== 'Laboratorio e imagen') continue;
          if (b === 'FX' && p.cat === 'Laboratorio e imagen') continue;
          const t = Math.floor(c * frac); if (t > 0) trasladar(db, { lote: l.id, de: 'BC', a: b, cant: t, doc: 'APERTURA', ts: ini.getTime(), us: 'u8' });
        }
      }
    }

    /* Pacientes habituales */
    const nom = () => `${de(C.NOMBRES)} ${de(C.NOMBRES)} ${de(C.APELLIDOS)} ${de(C.APELLIDOS)}`;
    const nuevoPac = ts => {
      const n = ++db.seq.pac;
      const p = { id: 'a' + n, exp: 'HG-' + pad(n, 6), nombre: nom(), dpi: String(rnd(1000, 3999)) + String(rnd(10000, 99999)) + String(rnd(1000, 2299)), nit: R() < .28 ? String(rnd(1000000, 9999999)) + '-' + rnd(0, 9) : 'CF', nac: ts - rnd(1, 85) * 365 * DIA, sexo: R() < .56 ? 'F' : 'M', tel: de(['5', '4', '3']) + rnd(1000000, 9999999), muni: de(C.MUNICIPIOS), alta: ts };
      db.pacientes.push(p); db.ix.pac.set(p.id, p); return p;
    };
    for (let i = 0; i < 6000 * escala; i++) nuevoPac(ini.getTime() - rnd(1, 900) * DIA);
    Object.assign(db.pacientes[0], { nombre: 'Cliente de mostrador', dpi: '', nit: 'CF', tel: '', muni: '', nac: null, sexo: '' });

    const meds = prods.filter(p => p.cat === 'Medicamento' && !p.controlado && !p.frio);
    const ins = prods.filter(p => p.cat === 'Insumo médico');
    const ctrl = prods.filter(p => p.controlado);
    const sv = area => db.servicios.filter(s => s.area === area);
    const svs = { c: sv('Consulta externa'), e: sv('Emergencia'), l: sv('Laboratorio'), i: sv('Imagen'), n: sv('Encamamiento'), q: sv('Quirófano') };
    const svId = cod => db.servicios.find(s => s.cod === cod).id;
    const pesoMeds = meds.map((_, i) => 1 / (1 + i * .04)); const sumaPeso = pesoMeds.reduce((a, b) => a + b, 0);
    const medPop = () => { let r = R() * sumaPeso; for (let i = 0; i < meds.length; i++) { r -= pesoMeds[i]; if (r <= 0) return meds[i]; } return meds[0]; };
    const cajeros = ['u3', 'u4'];
    const formas = () => { const r = R(); return r < .62 ? 'Efectivo' : r < .86 ? 'Tarjeta' : r < .96 ? 'Transferencia' : 'Cheque'; };
    let apartado = new Map();
    const cargoSeguro = (bod, p, cant) => { const k = p.id + bod, ya = apartado.get(k) || 0; if (disponible(db, p.id, bod, tsAct) - ya >= cant) { apartado.set(k, ya + cant); return { prod: p.id, bod, cant }; } return null; };
    let tsAct = ini.getTime();
    const camas = Array.from({ length: 28 }, (_, i) => i + 1).sort(() => R() - .5).slice(0, 21); const salas = [1, 2, 4];

    for (let dd = 0; dd < dias; dd++) {
      const dia = ini.getTime() + dd * DIA; const fecha = new Date(dia); const dow = fecha.getDay(); const esHoy = dia === hoy;
      const ahora = new Date(ancla); const fraccion = esHoy ? Math.max(.42, Math.min(1, (ahora.getHours() - 6) / 12)) : 1;
      const base = (dow === 0 ? 120 : dow === 6 ? 170 : rnd(280, 360)) * escala;
      const atender = Math.round(base * fraccion);
      const turnos = [...cajeros, 'u5'].map((u, i) => { const t = { id: 't' + (++db.seq.turno), caja: i === 2 ? 'Caja Farmacia' : 'Caja ' + (i + 1), us: u, abre: dia + 7 * 3600000, fondo: 500, mov: {}, estado: 'abierto', cierre: null }; db.turnos.push(t); db.ix.turno.set(t.id, t); return t; });

      /* Compras: cada 3 días, lo que está por debajo del mínimo */
      if (dd % 3 === 1) {
        const bajos = prods.filter(p => p.qty < p.min * 1.6);
        const porProv = new Map();
        for (const p of bajos) { const v = p.cat === 'Medicamento' ? de(['v1', 'v3', 'v9']) : p.cat === 'Insumo médico' ? de(['v2', 'v4', 'v6']) : p.cat === 'Laboratorio e imagen' ? de(['v5', 'v8']) : de(['v7', 'v10']); if (!porProv.has(v)) porProv.set(v, []); porProv.get(v).push(p); }
        for (const [v, ps] of porProv) {
          const ts = dia + rnd(8, 15) * 3600000; tsAct = ts; const ctx = { u: 'u9', ts };
          const items = ps.slice(0, 18).map(p => ({ prod: p.id, cant: Math.max(10, Math.round(p.max * 1.1 - p.qty)), costo: r2(p.costoRef * (1 + (R() - .5) * .06)) }));
          const fondo = R() < .1 ? 'Fondos públicos' : 'Propio';
          const r = ops['oc.crear'](db, { prov: v, items, fondo }, ctx); const oc = db.ix.oc.get(r.id);
          if (oc.estado === 'por aprobar') { if (dia > hoy - 2 * DIA) continue; ops['oc.resolver'](db, { id: oc.id, aprobar: true }, { u: 'u1', ts: ts + 3600000 }); }
          if (dia >= hoy - 2 * DIA && R() < .55) continue; // quedan órdenes por recibir
          const rts = ts + rnd(2, 20) * 3600000; if (rts > ancla) continue;
          const rec = recibir(db, { oc: oc.id, factura: { serie: 'A' + rnd(1, 9), num: String(rnd(10000000, 99999999)), fecha: rts }, items: oc.items.map(i => ({ prod: i.prod, cant: i.cant, costo: i.costo, lote: 'L' + rnd(10000, 99999), vence: hoy + rnd(200, 900) * DIA })) }, { u: 'u8', ts: rts });
          const x = db.cxp[db.cxp.length - 1];
          if (x.vence < hoy + 5 * DIA && dia < hoy - 12 * DIA) { x.estado = 'pagado'; x.pago = { f: x.vence, forma: 'Transferencia', ref: 'TRF-' + rnd(100000, 999999), us: 'u10' }; }
        }
      }
      /* Reposición interna desde bodega central */
      if (dd % 2 === 0) for (const p of prods) for (const [b, meta] of [['FX', .5], ['QX', .12], ['EM', .1], ['EN', .1]]) {
        if ((p.ex[b] || 0) < p.min * meta) {
          let falta = Math.round(p.max * meta) - (p.ex[b] || 0); const ts = dia + 6 * 3600000; tsAct = ts;
          for (const l of db.ix.lotesDe.get(p.id) || []) { if (falta <= 0) break; if (l.vence < dia) continue; const c = Math.min(l.ex.BC || 0, falta); if (c <= 0) continue; trasladar(db, { lote: l.id, de: 'BC', a: b, cant: c, doc: 'REPOSICION', ts, us: 'u8' }); falta -= c; }
        }
      }

      for (let i = 0; i < atender; i++) {
        const h = 7 + (i / Math.max(1, base)) * 12; const ts = dia + Math.floor(h * 3600000) + rnd(0, 120000); tsAct = ts;
        const u = de(['u2', 'u3', 'u4']); const ctx = { u, ts };
        const pac = R() < .14 ? nuevoPac(ts) : db.pacientes[rnd(0, db.pacientes.length - 1)];
        const r = R(); const tipo = r < .46 ? 'consulta' : r < .62 ? 'farmacia' : r < .78 ? 'laboratorio' : r < .91 ? 'emergencia' : r < .96 ? 'encamamiento' : 'cirugia';
        const c = nuevaCuenta(db, { pac: pac.id, tipo, medico: de(C.MEDICOS)[0] }, ctx);
        const items = []; apartado = new Map();
        const addMed = (b, n) => { for (let k = 0; k < n; k++) { const p = medPop(); const it = cargoSeguro(b, p, p.venta < 5 ? rnd(4, 21) : rnd(1, 3)); if (it) items.push(it); } };
        const addIns = (b, n) => { for (let k = 0; k < n; k++) { const it = cargoSeguro(b, de(ins), rnd(1, 4)); if (it) items.push(it); } };
        if (tipo === 'consulta') { items.push({ serv: de(svs.c).id, cant: 1 }); addMed('FX', rnd(0, 4)); if (R() < .3) items.push({ serv: de(svs.l).id, cant: 1 }); }
        else if (tipo === 'farmacia') addMed('FX', rnd(1, 5));
        else if (tipo === 'laboratorio') { for (let k = rnd(1, 3); k > 0; k--) items.push({ serv: de(svs.l).id, cant: 1 }); if (R() < .3) items.push({ serv: de(svs.i).id, cant: 1 }); }
        else if (tipo === 'emergencia') { items.push({ serv: svId('S010'), cant: 1 }); items.push({ serv: de(svs.e).id, cant: 1 }); addMed('EM', rnd(1, 4)); addIns('EM', rnd(1, 3)); }
        else if (tipo === 'encamamiento') { const n = rnd(1, 4); items.push({ serv: svId('S040'), cant: n }, { serv: svId('S042'), cant: n }, { serv: svId('S043'), cant: n }); addMed('EN', rnd(3, 7)); addIns('EN', rnd(2, 5)); }
        else { const mayor = R() < .55; items.push({ serv: svId(mayor ? 'S051' : 'S050'), cant: 1 }, { serv: svId(mayor ? 'S052' : 'S053'), cant: 1 }, { serv: svId('S054'), cant: 1 }, { serv: svId('S055'), cant: 1 }); addMed('QX', rnd(3, 6)); addIns('QX', rnd(5, 10)); }
        if ((tipo === 'cirugia' || tipo === 'emergencia') && R() < .6) { const p = de(ctrl); const b = tipo === 'cirugia' ? 'QX' : 'EM'; if (cargoSeguro(b, p, 1)) { const m = de(C.MEDICOS); items.push({ prod: p.id, bod: b, cant: 1, receta: { num: 'RX-' + rnd(100000, 999999), medico: m[0], colegiado: m[1] } }); } }
        cargar(db, c, items, ctx);
        let quedaAbierta = (esHoy && (R() < .16 || tipo === 'encamamiento')) || (tipo === 'encamamiento' && dia > hoy - 3 * DIA);
        if (quedaAbierta && tipo === 'encamamiento') { if (camas.length) c.cama = 'Cama ' + camas.shift(); else quedaAbierta = false; }
        if (esHoy && tipo === 'cirugia' && salas.length) quedaAbierta = true;
        if (quedaAbierta && tipo === 'cirugia') { if (salas.length) c.cama = 'Quirófano ' + salas.shift(); else quedaAbierta = false; }
        if (R() < .045 && c.total > 0) { const pct = de([25, 50, 75, 100]); c.desc = { pct, motivo: 'Estudio socioeconómico', estado: 'aprobado', pide: 'u2', f: ts, resuelve: 'u11', fr: ts }; }
        if (esHoy && quedaAbierta && R() < .1 && c.total > 0) c.desc = { pct: de([25, 50]), motivo: 'Paciente refiere falta de ingresos', estado: 'pendiente', pide: 'u2', f: ts };
        if (quedaAbierta || c.total <= 0) continue;
        const t = tipo === 'farmacia' ? turnos[2] : turnos[i % 2]; const neto = netoCuenta(c);
        const nit = neto >= db.cfg.limiteCF ? (pac.nit !== 'CF' ? pac.nit : pac.dpi) : pac.nit;
        const f = facturar(db, c, { nit, nombre: nit === 'CF' ? 'Consumidor final' : pac.nombre }, { u: t.us, ts: ts + 1200000 });
        const credito = neto > 6000 && R() < .4;
        if (credito) { c.estado = 'por cobrar'; c.aseguradora = de(['Aseguradora del Sur (ejemplo)', 'Seguros La Ceiba (ejemplo)']); }
        else if (neto > 0) cobrar(db, c, f, [{ forma: formas(), monto: neto }], t, { u: t.us, ts: ts + 1200000 });
        else { c.estado = 'pagada'; c.pagado = 0; }
      }
      /* Cierre de turno, salvo hoy */
      if (!esHoy) for (const t of turnos) { const esp = r2(t.fondo + (t.mov.Efectivo || 0)); const dif = R() < .08 ? r2((R() - .5) * 20) : 0; t.estado = 'cerrado'; t.cierra = dia + 20 * 3600000; t.cierre = { esperado: esp, contado: r2(esp + dif), dif, nota: '' }; }
      else turnos.forEach(t => { t.estado = 'abierto'; });

      /* Algo de nota de crédito histórica */
      if (dd % 9 === 4 && db.dtes.length > 40 && !esHoy) { const f = db.dtes[db.dtes.length - rnd(5, 30)]; if (f.tipo !== 'DEV' && f.tipo !== 'NCRE' && f.estado === 'vigente') ops['dte.notaCredito'](db, { dte: f.id, motivo: 'Error en datos del cliente' }, { u: 'u10', ts: dia + 19 * 3600000 }); }
    }

    /* Trabajo pendiente para que cada rol tenga algo que hacer al entrar */
    const abiertas = db.cuentas.filter(c => c.estado === 'abierta');
    const enc = abiertas.filter(c => c.tipo === 'encamamiento' || c.tipo === 'emergencia' || c.tipo === 'cirugia');
    for (let i = 0; i < 7 && i < enc.length; i++) {
      const c = enc[i]; const items = [{ prod: medPop().id, cant: rnd(2, 8) }, { prod: de(ins).id, cant: rnd(1, 4) }];
      if (i === 1) { const p = ctrl.find(x => x.nombre.startsWith('Morfina')); items.push({ prod: p.id, cant: 2, receta: { num: 'RX-' + rnd(100000, 999999), medico: C.MEDICOS[1][0], colegiado: C.MEDICOS[1][1] } }); }
      ops['pedido.crear'](db, { cuenta: c.id, items, urgente: i === 0, nota: i === 0 ? 'Paciente en dolor' : '' }, { u: i % 2 ? 'u6' : 'u7', ts: ancla - rnd(2, 50) * 60000 });
    }
    const pm = prods.filter(p => p.cat === 'Medicamento');
    const enBC = prods.filter(p => !p.controlado && p.cat !== 'Uso interno' && disponible(db, p.id, 'BC', ancla) >= 120);
    const mBC = enBC.filter(p => p.cat === 'Medicamento'), iBC = enBC.filter(p => p.cat === 'Insumo médico');
    ops['traslado.pedir'](db, { de: 'BC', a: 'FX', items: [{ prod: mBC[3].id, cant: 40 }, { prod: mBC[9].id, cant: 60 }] }, { u: 'u5', ts: ancla - 3000000 });
    ops['traslado.pedir'](db, { de: 'BC', a: 'QX', items: [{ prod: iBC[8].id, cant: 24 }, { prod: iBC[4].id, cant: 50 }] }, { u: 'u7', ts: ancla - 5400000 });
    const t3 = ops['traslado.pedir'](db, { de: 'BC', a: 'EN', items: [{ prod: iBC[0].id, cant: 30 }] }, { u: 'u6', ts: ancla - 9000000 }); ops['traslado.enviar'](db, { id: t3.id }, { u: 'u8', ts: ancla - 7200000 });
    ops['solicitud.crear'](db, { area: 'Quirófano', items: [{ prod: ins[45].id, cant: 12 }, { prod: ins[31].id, cant: 48 }], nota: 'Para cirugías programadas de la próxima semana' }, { u: 'u7', ts: ancla - 86400000 });
    ops['solicitud.crear'](db, { area: 'Farmacia', items: [{ prod: pm[14].id, cant: 200 }], nota: '' }, { u: 'u5', ts: ancla - 7200000 });
    const lc = db.lotes.find(l => (l.ex.FX || 0) > 20 && l.vence > hoy);
    ops['ajuste.pedir'](db, { lote: lc.id, bod: 'FX', cant: -2, motivo: 'Frascos quebrados al ordenar' }, { u: 'u5', ts: ancla - 4000000 });
    if (!db.ocs.some(o => o.estado === 'por aprobar')) {
      const its = meds.slice(0, 12).map(p => ({ prod: p.id, cant: 2000, costo: p.costoRef + 2 }));
      ops['oc.crear'](db, { prov: 'v1', items: its }, { u: 'u9', ts: ancla - 6000000 });
    }
    ops['donacion.entrada'](db, { donante: C.DONANTES[0], items: [{ prod: ins[10].id, cant: 300, costo: 3.8, lote: 'DN' + rnd(1000, 9999), vence: hoy + 500 * DIA }, { prod: ins[33].id, cant: 200, costo: 1.5, lote: 'DN' + rnd(1000, 9999), vence: hoy + 700 * DIA }] }, { u: 'u8', ts: ancla - 2 * 3600000 });

    for (let i = 0; i < 9; i++) ops['donacion.dinero'](db, { donante: C.DONANTES[i % 4], monto: rnd(5, 120) * 500, forma: 'Transferencia', nota: 'Para gastos de operación' }, { u: 'u10', ts: ini.getTime() + rnd(1, dias - 2) * DIA });
    /* Bitácora: los últimos movimientos de hoy para que no nazca vacía */
    const hoyDtes = db.dtes.filter(d => d.f >= hoy).slice(-60);
    for (const d of hoyDtes) db.bitacora.push({ ts: d.f, u: d.us, disp: (db.ix.usr.get(d.us) || {}).disp || '', tipo: 'cuenta.facturar', txt: `Cobró ${d.serie}-${d.num} por ${fQ(d.total)}`, ok: true });
    db.bitacora.sort((a, b) => a.ts - b.ts);
    return db;
  };

  /* Sistema en blanco: sin datos de ejemplo, para cargar lo propio */
  M.vacia = function (ancla) {
    const db = baseVacia(ancla);
    db.productos = []; db.ix.prod.clear(); db.proveedores = []; db.ix.prov.clear();
    db.seq.pac = 1; const p = { id: 'a1', exp: 'HG-000001', nombre: 'Cliente de mostrador', dpi: '', nit: 'CF', nac: null, sexo: '', tel: '', muni: '', alta: ancla };
    db.pacientes.push(p); db.ix.pac.set(p.id, p);
    return db;
  };

  /* ---------- registro compartido entre dispositivos ---------- */
  const VERSION = 5; // subir cuando cambie la semilla: un registro viejo no se aplica sobre datos nuevos
  const leerModo = () => { try { return localStorage.getItem('hhg.modo') || 'demo'; } catch (e) { return 'demo'; } };
  M.modo = leerModo();
  const DBN = M.modo === 'real' ? 'hhg-real-v1' : 'hhg-demo-v' + VERSION, ANCLA = (M.modo === 'real' ? 'hhg.ancla.real' : 'hhg.ancla.v' + VERSION);
  let idb = null, canal = null, ultimo = 0, jalando = false, otraVez = false;
  const pendientes = new Map(); const oyentes = new Set(); let memoria = [];
  function abrirIDB() {
    return new Promise(res => {
      if (typeof indexedDB === 'undefined') return res(null);
      const q = indexedDB.open(DBN, 1);
      q.onupgradeneeded = () => q.result.createObjectStore('ops', { keyPath: 'n', autoIncrement: true });
      q.onsuccess = () => res(q.result); q.onerror = () => res(null);
    });
  }
  const leer = desde => new Promise(res => {
    if (!idb) return res(memoria.filter(o => o.n > desde));
    const out = []; const c = idb.transaction('ops').objectStore('ops').openCursor(IDBKeyRange.lowerBound(desde, true));
    c.onsuccess = () => { const x = c.result; if (x) { out.push(x.value); x.continue(); } else res(out); };
    c.onerror = () => res(out);
  });
  const escribir = op => new Promise((res, rej) => {
    if (!idb) { op.n = memoria.length + 1; memoria.push(op); return res(); }
    const t = idb.transaction('ops', 'readwrite'); t.objectStore('ops').add(op); t.oncomplete = () => res(); t.onerror = () => rej(t.error);
  });
  async function jalar() {
    if (jalando) { otraVez = true; return; }
    jalando = true;
    do {
      otraVez = false;
      const nuevos = await leer(ultimo);
      if (nuevos.length) {
        const hechos = [];
        for (const op of nuevos) {
          const r = aplicar(M.db, op); ultimo = op.n; hechos.push({ op, r });
          const f = pendientes.get(op.id); if (f) { pendientes.delete(op.id); f(r); }
        }
        oyentes.forEach(fn => fn(hechos));
      }
    } while (otraVez);
    jalando = false;
  }
  M.iniciar = async function () {
    let ancla = null;
    try { ancla = +localStorage.getItem(ANCLA) || null; } catch (e) { }
    if (!ancla || (M.modo === 'demo' && M.finDia(ancla) !== M.finDia(Date.now()))) {
      /* el demo arranca limpio cada día para que fechas y vencimientos sigan vigentes; el modo real nunca */
      ancla = Date.now();
      try { localStorage.setItem(ANCLA, String(ancla)); } catch (e) { }
      await M.borrarRegistro();
    }
    idb = idb || await abrirIDB();
    M.db = M.modo === 'real' ? M.vacia(ancla) : M.sembrar(ancla);
    if (typeof BroadcastChannel !== 'undefined') {
      canal = new BroadcastChannel('hhg-demo');
      canal.onmessage = e => { if (e.data === 'nuevo') jalar(); if (e.data === 'reinicio') location.reload(); };
    }
    await jalar();
    return M.db;
  };
  M.borrarRegistro = () => new Promise(res => {
    if (typeof indexedDB === 'undefined') return res();
    if (idb) { idb.close(); idb = null; }
    const q = indexedDB.deleteDatabase(DBN); q.onsuccess = q.onerror = q.onblocked = () => res();
  });
  M.enviar = async function (tipo, d, quien) {
    const u = quien || M.sesion || {};
    const op = { id: Math.random().toString(36).slice(2) + Date.now().toString(36), tipo, d, u: u.id, disp: u.disp, ts: Date.now() };
    const espera = new Promise(res => pendientes.set(op.id, res));
    await escribir(op);
    if (canal) canal.postMessage('nuevo');
    jalar();
    return espera;
  };
  M.alCambiar = fn => { oyentes.add(fn); return () => oyentes.delete(fn); };
  M.cambiarModo = function (m) { try { localStorage.setItem('hhg.modo', m); } catch (e) { } if (canal) canal.postMessage('reinicio'); location.reload(); };
  M.exportar = async () => ({ sistema: 'hhg', modo: M.modo, ancla: M.db.ancla, fecha: Date.now(), ops: await leer(0) });
  M.importar = async function (o) {
    if (!o || o.sistema !== 'hhg' || !Array.isArray(o.ops)) throw new Error('Ese archivo no es un respaldo del sistema.');
    await M.borrarRegistro(); idb = await abrirIDB();
    for (const op of o.ops) { const { n, ...x } = op; await escribir(x); }
    try { localStorage.setItem(ANCLA, String(o.ancla)); } catch (e) { }
    if (canal) canal.postMessage('reinicio'); location.reload();
  };
  M.reiniciar = async function () {
    try { localStorage.removeItem(ANCLA); } catch (e) { }
    if (canal) canal.postMessage('reinicio');
    await M.borrarRegistro();
    location.reload();
  };

  g.Motor = M;
})(typeof window !== 'undefined' ? window : globalThis);
