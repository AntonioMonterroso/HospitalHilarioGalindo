/* Por dentro del hospital: se levanta el techo, los personajes trabajan y todo sale de los datos reales. */
(function (g) {
  const { U, App: A, Motor: M, Catalogo: C, Dibujo: D } = g; const e = U.esc, Q = U.Q;
  const db = () => M.db, hoy = () => A.hoy();
  const quieto = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const corto = n => n.split(' ').slice(0, 2).join(' ');
  const pac = c => db().ix.pac.get(c.pac);
  const min = (n, m) => Math.min(n, m);
  const USU = { direccion: 'u1', admision: 'u2', caja: 'u3', farmacia: 'u5', enfermeria: 'u6', quirofano: 'u7', bodega: 'u8', compras: 'u9', contabilidad: 'u10', social: 'u11', auditoria: 'u12' };
  const W = 340, H = 240;

  /* Cada cuarto: dónde está, qué muebles tiene, quién trabaja y qué datos importan */
  const SALAS = (s, a, b) => [...s.salas.entries()].filter(([n]) => n >= a && n <= b).map(([n, c]) => `Sala ${n}: ${corto(pac(c).nombre)}`);
  const camasDe = (s, a, b) => [...s.camas.entries()].filter(([n]) => n >= a && n <= b).sort((x, y) => x[0] - y[0]);
  const EDIFICIOS = {
    fx: { t: 'Farmacia', cuartos: [
      { id: 'est', t: 'Estanterías', x: 0, y: 0, w: 200, d: 110, m: [['estante', 12, 6, 80], ['estante', 104, 6, 80]], gente: () => ['farmacia'], datos: () => { const b = db().productos.filter(p => p.cat === 'Medicamento' && (p.ex.FX || 0) < p.min * .5).sort((a, c) => (a.ex.FX || 0) - (c.ex.FX || 0)); return { c: [['Productos en farmacia', U.n(db().productos.filter(p => p.ex.FX > 0).length)], ['Por pedir a bodega', U.n(b.length)]], l: b.slice(0, 4).map(p => `${p.nombre}: quedan ${U.n(p.ex.FX || 0)}`), ir: ['#/inventario/existencias', 'Ver existencias'], rol: 'farmacia' }; } },
      { id: 'fri', t: 'Cadena de frío', x: 200, y: 0, w: 140, d: 110, m: [['frio', 214, 8], ['frio', 240, 8], ['frio', 266, 8]], gente: () => [], datos: () => { const l = db().productos.filter(p => p.frio); return { c: [['Productos en frío', U.n(l.length)]], l: l.slice(0, 4).map(p => `${p.nombre}: ${U.n(p.ex.FX || 0)}`), ir: ['#/inventario/existencias', 'Ver existencias'], rol: 'farmacia' }; } },
      { id: 'ven', t: 'Mostrador', x: 0, y: 110, w: 200, d: 130, m: [['mostrador', 24, 160, 150]], gente: s => ['farmacia', ...Array(min(s.ped.length ? 2 : 1, 3)).fill('paciente')], datos: s => { const v = s.hoyC.filter(c => c.tipo === 'farmacia'); return { c: [['Ventas hoy', U.n(v.length)], ['Vendido', Q(v.reduce((a, c) => a + c.total, 0))]], l: v.slice(0, 3).map(c => `${c.num}: ${Q(c.total)}`), ir: ['#/farmacia', 'Abrir el mostrador'], rol: 'farmacia' }; } },
      { id: 'ctl', t: 'Controlados', x: 200, y: 110, w: 140, d: 130, m: [['caja', 300, 120], ['escritorio', 216, 190, 60]], gente: () => [], datos: () => { const l = db().controlados.filter(x => x.f >= hoy() && x.sale > 0); return { c: [['Salidas hoy', U.n(l.length)], ['Con receta', '100 %']], l: l.slice(-3).reverse().map(x => `${db().ix.prod.get(x.prod).nombre}: receta ${x.receta}`), ir: ['#/farmacia/control', 'Ver el balance'], rol: 'farmacia' }; } },
    ] },
    bc: { t: 'Bodega central', cuartos: [
      { id: 'est', t: 'Estanterías', x: 0, y: 0, w: 230, d: 120, m: [['estante', 12, 6, 100], ['estante', 122, 6, 100], ['estante', 12, 62, 100], ['estante', 122, 62, 100]], gente: () => ['bodega'], datos: () => { const v = db().lotes.filter(l => l.vence < hoy() + 30 * M.DIA && Object.values(l.ex).some(n => n > 0)); return { c: [['Inventario', Q(db().productos.reduce((a, p) => a + p.valor, 0))], ['Lotes por vencer', U.n(v.length)]], l: v.slice(0, 3).map(l => `${db().ix.prod.get(l.prod).nombre}: ${U.fecha(l.vence)}`), ir: ['#/inventario/vencimientos', 'Ver vencimientos'], rol: 'bodega' }; } },
      { id: 'ofi', t: 'Compras', x: 230, y: 0, w: 110, d: 120, m: [['escritorio', 248, 30, 60]], gente: () => ['compras'], datos: () => { const so = db().solicitudes.filter(x => x.estado === 'pendiente'); return { c: [['Solicitudes', U.n(so.length)], ['Bajo el mínimo', U.n(db().productos.filter(p => p.qty < p.min).length)]], l: so.slice(0, 3).map(x => `${x.num}: ${x.area}`), ir: ['#/compras/solicitudes', 'Ver solicitudes'], rol: 'compras' }; } },
      { id: 'rec', t: 'Recepción', x: 0, y: 120, w: 170, d: 120, m: [['pila', 20, 190], ['pila', 90, 196]], gente: () => ['bodega'], datos: () => { const o = db().ocs.filter(x => ['aprobada', 'parcial'].includes(x.estado)); return { c: [['Órdenes por recibir', U.n(o.length)]], l: o.slice(0, 3).map(x => `${x.num}: ${db().ix.prov.get(x.prov).nombre}`), ir: ['#/inventario/ingreso', 'Ingresar mercadería'], rol: 'bodega' }; } },
      { id: 'des', t: 'Despacho', x: 170, y: 120, w: 170, d: 120, m: [['pila', 240, 190]], gente: () => [], datos: () => { const t = db().traslados.filter(x => x.estado !== 'recibido'); return { c: [['Traslados activos', U.n(t.length)]], l: t.slice(0, 4).map(x => `${x.num}: ${M.nomBod(db(), x.de)} a ${M.nomBod(db(), x.a)}`), ir: ['#/inventario/traslados', 'Ver traslados'], rol: 'bodega' }; } },
    ] },
    ad: { t: 'Admisión y caja', cuartos: [
      { id: 'adm', t: 'Admisión', x: 0, y: 0, w: 170, d: 120, m: [['mostrador', 16, 56, 130]], gente: () => ['admision'], datos: s => ({ c: [['Pacientes hoy', U.n(s.hoyC.length)], ['Expedientes', U.n(db().pacientes.length)]], l: s.hoyC.slice(0, 3).map(c => `${corto(pac(c).nombre)}: ${C.TIPOS_CUENTA[c.tipo].nombre}`), ir: ['#/admision', 'Abrir Admisión'], rol: 'admision' }) },
      { id: 'caj', t: 'Cajas', x: 170, y: 0, w: 170, d: 120, m: [['mostrador', 186, 56, 130]], gente: () => ['caja', 'caja'], datos: () => { const t = db().turnos.filter(x => x.estado === 'abierto'); return { c: [['Cajas abiertas', U.n(t.length)], ['Cobrado hoy', Q(t.reduce((a, x) => a + Object.values(x.mov).reduce((p, q) => p + q, 0), 0))]], l: t.map(x => `${x.caja}: ${Q(Object.values(x.mov).reduce((p, q) => p + q, 0))}`), ir: ['#/caja', 'Abrir Caja'], rol: 'caja' }; } },
      { id: 'esp', t: 'Sala de espera', x: 0, y: 120, w: 340, d: 120, m: [40, 60, 80, 100, 180, 200, 220, 240].map(x => ['silla', x, 200]), gente: s => Array(min(s.porCobrar, 5)).fill('paciente'), datos: s => { const l = s.ab.filter(c => c.total > 0).reverse(); return { c: [['Por cobrar', U.n(l.length)], ['Pendiente', Q(l.reduce((a, c) => a + M.netoCuenta(c), 0))]], l: l.slice(0, 4).map(c => `${corto(pac(c).nombre)}: ${Q(M.netoCuenta(c))}`), ir: ['#/caja', 'Cobrar'], rol: 'caja' }; } },
    ] },
    em: { t: 'Emergencia', cuartos: [
      { id: 'tri', t: 'Clasificación', x: 0, y: 0, w: 140, d: 240, m: [['escritorio', 30, 20, 70], ['silla', 30, 120], ['silla', 60, 120], ['silla', 90, 120]], gente: s => ['enfermeria', ...Array(min(s.em.length, 2)).fill('paciente')], datos: s => { const l = s.hoyC.filter(c => c.tipo === 'emergencia'); return { c: [['Atendidos hoy', U.n(l.length)]], l: l.slice(0, 4).map(c => `${corto(pac(c).nombre)}: ${U.hora(c.abierta)}`), ir: ['#/cuentas', 'Ver cuentas'], rol: 'enfermeria' }; } },
      { id: 'obs', t: 'Observación', x: 140, y: 0, w: 200, d: 240, m: [['cama', 160, 20, 0, { llena: 1 }], ['cama', 200, 20, 0, { llena: 1 }], ['cama', 240, 20, 0], ['cama', 280, 20, 0], ['equipo', 160, 180]], gente: () => ['enfermeria'], datos: s => ({ c: [['Pacientes ahora', U.n(s.em.length)]], l: s.em.slice(0, 5).map(c => `${corto(pac(c).nombre)}: ${Q(c.total)}`), ir: ['#/sala', 'Ver sala'], rol: 'enfermeria' }) },
    ] },
    ce: { t: 'Consulta externa', cuartos: [1, 2, 3].map(n => ({ id: 'c' + n, t: 'Clínica ' + n, x: (n - 1) * 113, y: 0, w: 113, d: 120, m: [['escritorio', (n - 1) * 113 + 20, 20, 60], ['cama', (n - 1) * 113 + 70, 60]], gente: () => ['enfermeria'], datos: s => { const l = s.hoyC.filter(c => c.tipo === 'consulta'); return { c: [['Consultas hoy', U.n(l.length)]], l: l.slice((n - 1) * 3, n * 3).map(c => `${corto(pac(c).nombre)}: ${c.medico || ''}`), ir: ['#/cuentas', 'Ver cuentas'], rol: 'enfermeria' }; } })).concat([{ id: 'esp', t: 'Sala de espera', x: 0, y: 120, w: 340, d: 120, m: [50, 70, 90, 110, 190, 210, 230, 250].map(x => ['silla', x, 200]), gente: s => Array(min(Math.ceil(s.cuenta('consulta') / 30), 5)).fill('paciente'), datos: s => { const l = s.hoyC.filter(c => c.tipo === 'consulta'); return { c: [['Consultas hoy', U.n(l.length)], ['Pagadas', U.n(l.filter(c => c.estado === 'pagada').length)]], l: [], ir: ['#/admision', 'Abrir Admisión'], rol: 'admision' }; } }]) },
    lb: { t: 'Laboratorio e imagen', cuartos: [
      { id: 'tom', t: 'Toma de muestras', x: 0, y: 0, w: 150, d: 120, m: [['silla', 40, 50], ['silla', 80, 50], ['mostrador', 20, 18, 100]], gente: s => ['paciente'], datos: s => { const l = s.hoyC.filter(c => c.tipo === 'laboratorio'); return { c: [['Estudios hoy', U.n(l.length)]], l: l.slice(0, 4).map(c => `${corto(pac(c).nombre)}: ${U.hora(c.abierta)}`), ir: ['#/cuentas', 'Ver cuentas'], rol: 'admision' }; } },
      { id: 'lab', t: 'Laboratorio', x: 150, y: 0, w: 190, d: 120, m: [['equipo', 170, 16], ['equipo', 200, 16], ['equipo', 230, 16], ['mostrador', 170, 70, 140]], gente: () => [], datos: () => { const l = db().productos.filter(p => p.cat === 'Laboratorio e imagen'); return { c: [['Reactivos e insumos', U.n(l.length)]], l: l.filter(p => (p.ex.LB || 0) > 0).slice(0, 4).map(p => `${p.nombre}: ${U.n(p.ex.LB)}`), ir: ['#/inventario/existencias', 'Ver existencias'], rol: 'bodega' }; } },
      { id: 'ima', t: 'Rayos X y ultrasonido', x: 0, y: 120, w: 340, d: 120, m: [['cama', 60, 150], ['equipo', 40, 150], ['cama', 220, 150], ['equipo', 200, 150]], gente: () => ['paciente'], datos: () => ({ c: [], l: ['Las órdenes y resultados en línea se pueden agregar.'], rol: 'admision' }) },
    ] },
    qx: { t: 'Quirófanos', cuartos: [
      ...[1, 2, 3, 4].map(n => ({ id: 's' + n, t: 'Sala ' + n, x: ((n - 1) % 2) * 120, y: n > 2 ? 120 : 0, w: 120, d: 120, m: [['quirurgica', ((n - 1) % 2) * 120 + 50, (n > 2 ? 120 : 0) + 40], ['equipo', ((n - 1) % 2) * 120 + 12, (n > 2 ? 120 : 0) + 12]], gente: s => (s.salas.get(n) ? ['quirofano', 'quirofano'] : []), datos: s => { const c = s.salas.get(n); return { c: [['Estado', c ? 'En uso' : 'Disponible'], ...(c ? [['Cargado', Q(c.total)]] : [])], l: c ? [corto(pac(c).nombre), c.num] : [], ir: c ? ['#/cuentas/' + c.id, 'Ver la cuenta'] : null, rol: 'quirofano' }; } })),
      { id: 'rec', t: 'Recuperación', x: 240, y: 0, w: 100, d: 240, m: [['cama', 266, 20, 0, { llena: 1 }], ['cama', 266, 90, 0], ['cama', 266, 160, 0]], gente: () => ['enfermeria'], datos: s => ({ c: [['Cirugías hoy', U.n(s.cuenta('cirugia'))]], l: [], ir: ['#/sala', 'Ver sala'], rol: 'quirofano' }) },
    ] },
    en: { t: 'Encamamiento', cuartos: [
      { id: 'a', t: 'Camas 1 a 14', x: 0, y: 0, w: 340, d: 100, m: [0, 1, 2, 3, 4, 5, 6].map(i => ['cama', 14 + i * 46, 14, 0, { llena: 1 }]), gente: () => ['enfermeria'], datos: s => { const l = camasDe(s, 1, 14); return { c: [['Ocupadas', `${l.length} de 14`]], l: l.slice(0, 5).map(([n, c]) => `Cama ${n}: ${corto(pac(c).nombre)}`), ir: ['#/sala', 'Ver sala'], rol: 'enfermeria' }; } },
      { id: 'est', t: 'Estación de enfermería', x: 0, y: 100, w: 340, d: 50, m: [['mostrador', 110, 116, 120]], gente: () => ['enfermeria'], datos: s => ({ c: [['Pedidos en farmacia', U.n(s.ped.length)]], l: s.ped.slice(0, 4).map(p => `${p.num}: ${p.items.length} productos`), ir: ['#/sala', 'Ver sala'], rol: 'enfermeria' }) },
      { id: 'b', t: 'Camas 15 a 28', x: 0, y: 150, w: 340, d: 90, m: [0, 1, 2, 3, 4, 5, 6].map(i => ['cama', 14 + i * 46, 160, 0, { llena: 1 }]), gente: () => [], datos: s => { const l = camasDe(s, 15, 28); return { c: [['Ocupadas', `${l.length} de 14`]], l: l.slice(0, 5).map(([n, c]) => `Cama ${n}: ${corto(pac(c).nombre)}`), ir: ['#/sala', 'Ver sala'], rol: 'enfermeria' }; } },
    ] },
  };

  /* Qué hace cada puesto en este momento, con datos reales */
  function ahora(rol, s) {
    const d = db();
    if (rol === 'paciente') return 'Esperando su turno';
    if (rol === 'seguridad') return 'Haciendo su ronda';
    if (rol === 'farmacia') { const p = s.ped.slice().sort((a, b) => b.urgente - a.urgente)[0]; return p ? `Despachando ${p.num}` : 'Atendiendo mostrador'; }
    if (rol === 'caja') { const c = s.ab.filter(x => x.total > 0).slice(-1)[0]; return c ? `Cobrando a ${corto(pac(c).nombre)}` : 'Caja al día'; }
    if (rol === 'admision') { const c = s.hoyC[0]; return c ? `Abrió cuenta a ${corto(pac(c).nombre)}` : 'Recibiendo pacientes'; }
    if (rol === 'enfermeria') { const c = [...s.camas.values()][0] || s.em[0]; return c ? `Atendiendo a ${corto(pac(c).nombre)}` : 'En su estación'; }
    if (rol === 'quirofano') { const [n, c] = [...s.salas.entries()][0] || []; return c ? `En sala ${n}: ${corto(pac(c).nombre)}` : 'Preparando sala'; }
    if (rol === 'bodega') { const t = d.traslados.find(x => x.estado === 'solicitado'); return t ? `Preparando ${t.num}` : 'Ordenando estanterías'; }
    if (rol === 'compras') { const x = d.solicitudes.find(y => y.estado === 'pendiente'); return x ? `Revisando ${x.num}` : 'Cotizando'; }
    return 'Trabajando';
  }
  function fichaPuesto(rol, s) {
    const d = db(), usr = d.ix.usr.get(USU[rol]); const c = [];
    if (rol === 'farmacia') c.push(['Pedidos en espera', U.n(s.ped.length)], ['Ventas hoy', U.n(s.cuenta('farmacia'))]);
    if (rol === 'caja') c.push(['Por cobrar', U.n(s.porCobrar)], ['Cajas abiertas', U.n(s.cajas)]);
    if (rol === 'admision') c.push(['Pacientes hoy', U.n(s.hoyC.length)]);
    if (rol === 'enfermeria') c.push(['Pacientes a cargo', U.n(s.camas.size + s.em.length)], ['Pedidos en espera', U.n(s.ped.length)]);
    if (rol === 'quirofano') c.push(['Salas en uso', `${s.salas.size} de 4`], ['Cirugías hoy', U.n(s.cuenta('cirugia'))]);
    if (rol === 'bodega') c.push(['Traslados por enviar', U.n(s.tr)], ['Lotes por vencer', U.n(s.venc)]);
    if (rol === 'compras') c.push(['Solicitudes', U.n(d.solicitudes.filter(x => x.estado === 'pendiente').length)], ['Bajo el mínimo', U.n(d.productos.filter(p => p.qty < p.min).length)]);
    return { t: usr ? usr.nombre : C.ROLES[rol].nombre, sub: C.ROLES[rol].desc, ahora: ahora(rol, s), c, av: rol, entrar: rol };
  }

  /* ---------- la escena ---------- */
  const hexPiso = (r, h) => D.pol([D.P(r.x + 1, r.y + 1), D.P(r.x + r.w - 1, r.y + 1), D.P(r.x + r.w - 1, r.y + r.d - 1), D.P(r.x + 1, r.y + r.d - 1)], D.col(h, 95, .018));
  function escena(cfg, h, s) {
    const piso = D.caja(-8, -8, -10, W + 16, H + 16, 10, { hue: h, l: 92, c: .01 });
    let cuartos = '', muebles = '', hit = '', rot = '';
    for (const r of cfg.cuartos) {
      cuartos += hexPiso(r, h) + D.qa(r.x, r.x + r.w, 0, 26, r.y, D.col(h, 90, .012)) + D.qb(r.y, r.y + r.d, 0, 26, r.x, D.col(h, 84, .012));
      muebles += r.m.slice().sort((a, b) => (a[1] + a[2]) - (b[1] + b[2])).map(m => D.mueble(m, h)).join('');
      hit += `<polygon class="hit" data-c="${r.id}" points="${[D.P(r.x, r.y), D.P(r.x + r.w, r.y), D.P(r.x + r.w, r.y + r.d), D.P(r.x, r.y + r.d)].map(p => p.join(',')).join(' ')}"/>`;
      const [a, b] = D.P(r.x + r.w / 2, r.y + r.d - 14), w = r.t.length * 6.6 + 18;
      rot += `<g class="rot" data-c="${r.id}" role="button" tabindex="0" aria-label="${e(r.t)}"><rect x="${a - w / 2}" y="${b - 11}" width="${w}" height="20" rx="10"/><text x="${a}" y="${b + 3}" text-anchor="middle">${e(r.t)}</text></g>`;
    }
    const techo = `<g class="techo">${D.caja(-6, -6, 26, W + 12, H + 12, 34, { hue: h, techo: D.col(h, 84, .05) })}</g>`;
    return `<svg class="adentro" viewBox="-240 -72 560 412" role="img" aria-label="Interior de ${e(cfg.t)}">${piso}${cuartos}${hit}${muebles}<g class="gente"></g>${rot}${techo}</svg>`;
  }
  const NS = 'http://www.w3.org/2000/svg';
  function poblar(svg, cfg, s, card) {
    const capa = svg.querySelector('.gente'), npcs = []; let n = 0;
    for (const r of cfg.cuartos) for (const rol of r.gente(s)) {
      const el = document.createElementNS(NS, 'g'); el.setAttribute('class', 'npc'); el.setAttribute('tabindex', '0'); el.setAttribute('role', 'button');
      el.innerHTML = `<g class="cuerpo">${D.mini(rol === 'paciente' ? 'paciente' : rol, n)}</g><circle class="toque" cx="0" cy="-14" r="17"/>`;
      el.setAttribute('aria-label', rol === 'paciente' ? 'Paciente' : C.ROLES[rol].nombre);
      capa.appendChild(el);
      const o = { el, rol, r, x: r.x + 30 + Math.random() * (r.w - 60), y: r.y + 34 + Math.random() * (r.d - 60), t: 0 };
      const [a, b] = D.P(o.x, o.y); el.style.transform = `translate(${a}px,${b}px)`;
      npcs.push(o); n++;
      el.addEventListener('click', ev => { ev.stopPropagation(); if (rol !== 'paciente') card(fichaPuesto(rol, A.estadoHospital())); });
      el.addEventListener('keydown', ev => { if (ev.key === 'Enter' && rol !== 'paciente') card(fichaPuesto(rol, A.estadoHospital())); });
    }
    /* El guardia recorre todo el edificio con su lámpara */
    const el = document.createElementNS(NS, 'g'); el.setAttribute('class', 'npc guardia'); el.setAttribute('tabindex', '0'); el.setAttribute('role', 'button'); el.setAttribute('aria-label', 'Seguridad de esta área');
    el.innerHTML = `<g class="haz-g"><g class="haz"><path d="M2 -15L78 -40L78 12z"/></g></g><g class="cuerpo">${D.mini('seguridad', 1)}</g><circle class="toque" cx="0" cy="-14" r="19"/>`;
    capa.appendChild(el);
    const o = { el, rol: 'seguridad', r: { x: -2, y: -2, w: W + 4, d: H + 4 }, x: W * .5, y: H * .9, t: 0 };
    const [a0, b0] = D.P(o.x, o.y); el.style.transform = `translate(${a0}px,${b0}px)`;
    const ver = ev => { if (ev) ev.stopPropagation(); card(fichaGuardia(cfg)); };
    el.addEventListener('click', ver); el.addEventListener('keydown', ev => { if (ev.key === 'Enter') ver(ev); });
    npcs.push(o);
    return npcs;
  }
  function fichaGuardia(cfg) {
    const id = Object.keys(EDIFICIOS).find(k => EDIFICIOS[k] === cfg), [n, l] = D.SEG[id], h = A.hoy();
    return { t: `Seguridad de ${cfg.t}`, sub: 'Esto es lo que protege aquí', av: 'seguridad', c: [['Nivel', n], ['Intentos detenidos hoy', U.n(db().bitacora.filter(b => !b.ok && b.ts >= h).length)]], l, guardia: cfg };
  }
  function caminar(o, vivo) {
    if (!vivo() || quieto) return;
    const r = o.r, x = r.x + 26 + Math.random() * (r.w - 52), y = r.y + 30 + Math.random() * (r.d - 52);
    const [a0, b0] = D.P(o.x, o.y), dist = Math.hypot(x - o.x, y - o.y), ms = Math.max(600, dist * (o.rol === 'seguridad' ? 46 : 34)); o.x = x; o.y = y;
    const [a, b] = D.P(x, y);
    if (o.rol === 'seguridad') o.el.querySelector('.haz-g').style.transform = `rotate(${Math.atan2(b - b0, a - a0) * 180 / Math.PI}deg)`;
    o.el.style.transition = `transform ${ms}ms linear`; o.el.classList.add('anda'); o.el.style.transform = `translate(${a}px,${b}px)`;
    o.t = setTimeout(() => { o.el.classList.remove('anda'); o.t = setTimeout(() => caminar(o, vivo), 900 + Math.random() * 2600); }, ms);
  }
  function burbuja(svg, npcs, s) {
    svg.querySelectorAll('.burb').forEach(b => b.remove());
    const l = npcs.filter(o => o.rol !== 'paciente'); if (!l.length) return;
    const o = l[Math.floor(Math.random() * l.length)], sala = o.rol === 'quirofano' && s.salas.get(+o.r.t.split(' ')[1]);
    const t = sala ? `${o.r.t}: ${corto(pac(sala).nombre)}` : ahora(o.rol, s), w = t.length * 5.9 + 18;
    const b = document.createElementNS(NS, 'g'); b.setAttribute('class', 'burb');
    b.innerHTML = `<rect x="${-w / 2}" y="-64" width="${w}" height="22" rx="11"/><path d="M-5 -42.500L0 -36l5-6.500z"/><text y="-49" text-anchor="middle">${e(t)}</text>`;
    o.el.appendChild(b);
  }

  /* ---------- abrir un edificio ---------- */
  A.interior = function (id) {
    const cfg = EDIFICIOS[id], h = Tema.fijo() != null ? Tema.fijo() : D.HUE[id]; let s = A.estadoHospital(), abierto = true, sel = null;
    const hoja = U.hoja({
      titulo: cfg.t, sub: `Seguridad ${D.SEG[id][0].toLowerCase()} · Toque un cuarto, a una persona o al guardia`, ancho: 1080, area: h, clase: 'interior',
      cuerpo: `<div class="escena-i">${escena(cfg, h, s)}<div class="det oculto" id="det"></div></div>`,
      alCerrar() { abierto = false; npcs.forEach(o => clearTimeout(o.t)); clearInterval(reloj); },
      acciones: {
        cerrarDet() { sel = null; hoja.cuerpo.querySelector('#det').classList.add('oculto'); },
        ir(r) { hoja.cerrar(); location.hash = r; },
        entrar(r) { location.href = `index.html?u=${USU[r]}${M.modo === 'real' ? '' : ''}`; },
      },
    });
    const svg = hoja.cuerpo.querySelector('.adentro'), det = hoja.cuerpo.querySelector('#det');
    function pintar(x) {
      const puedeIr = x.ir && A.rol().vistas.includes(x.ir[0].replace('#/', '').split('/')[0]);
      det.innerHTML = `<button class="ojo det-x" data-a="cerrarDet" aria-label="Cerrar detalle">${U.ic('x')}</button>
        <div class="con-av">${x.av ? Dibujo.avatar(x.av, 48) : ''}<span><b>${e(x.t)}</b>${x.sub ? `<span class="t-sub">${e(x.sub)}</span>` : ''}</span></div>
        ${x.ahora ? `<p class="det-a">${U.ic('activity')}${e(x.ahora)}</p>` : ''}
        ${x.c && x.c.length ? `<div class="det-c">${x.c.map(([a, b]) => `<div><span>${e(a)}</span><b>${e(b)}</b></div>`).join('')}</div>` : ''}
        ${x.l && x.l.length ? `<ul class="det-l">${x.l.map(t => `<li>${e(t)}</li>`).join('')}</ul>` : ''}
        <div class="acciones">${puedeIr ? `<button class="btn pri chico" data-a="ir" data-id="${e(x.ir[0])}">${e(x.ir[1])}</button>` : ''}${x.entrar && x.entrar !== M.sesion.rol ? `<button class="btn chico" data-a="entrar" data-id="${x.entrar}">Entrar como este puesto</button>` : ''}</div>`;
      det.classList.remove('oculto');
    }
    const verCuarto = c => { const r = cfg.cuartos.find(x => x.id === c); const d = r.datos(A.estadoHospital()); sel = { c }; pintar({ t: r.t, ...d, entrar: d.ir && !A.rol().vistas.includes(d.ir[0].replace('#/', '').split('/')[0]) ? d.rol : null }); };
    const card = x => { sel = x.guardia ? { g: 1 } : { p: x.av }; pintar(x); };
    svg.addEventListener('click', ev => { const t = ev.target.closest('[data-c]'); if (t) verCuarto(t.dataset.c); });
    svg.addEventListener('keydown', ev => { const t = ev.target.closest('.rot'); if (t && ev.key === 'Enter') verCuarto(t.dataset.c); });
    const npcs = poblar(svg, cfg, s, card);
    requestAnimationFrame(() => setTimeout(() => { svg.classList.add('abierto'); }, 280));
    if (quieto) svg.classList.add('abierto');
    npcs.forEach((o, i) => { o.t = setTimeout(() => caminar(o, () => abierto), 1100 + i * 260); });
    setTimeout(() => { if (abierto) burbuja(svg, npcs, s); }, 1500);
    const reloj = setInterval(() => { if (abierto) burbuja(svg, npcs, A.estadoHospital()); }, 3600);
    hoja.refrescar = () => { s = A.estadoHospital(); if (sel && sel.c) verCuarto(sel.c); if (sel && sel.p) card(fichaPuesto(sel.p, s)); if (sel && sel.g) card(fichaGuardia(cfg)); };
  };

  /* ---------- conexiones entre edificios ---------- */
  const capa = document.createElementNS(NS, 'svg'); capa.setAttribute('class', 'viajes'); capa.setAttribute('viewBox', '-395 -128 900 660'); capa.setAttribute('aria-hidden', 'true');
  A.capaViajes = el => { const c = el.querySelector('.plano-3d'); if (c) c.appendChild(capa); };
  function viaje(de, a, txt) {
    if (!capa.isConnected || quieto) return;
    const [x0, y0] = D.centro(de), [x1, y1] = D.centro(a), mx = x1, my = y0 + (y1 - y0) * .5, h = Tema.fijo() != null ? Tema.fijo() : D.HUE[de];
    const g2 = document.createElementNS(NS, 'g'), w = txt.length * 6.2 + 22;
    g2.innerHTML = `<rect x="${-w / 2}" y="-11" width="${w}" height="22" rx="11" fill="oklch(42% .1 ${h})"/><text y="4" text-anchor="middle" fill="oklch(99% .004 250)" style="font:600 11.500px var(--cuerpo)">${e(txt)}</text>`;
    capa.appendChild(g2);
    const an = g2.animate([{ transform: `translate(${x0}px,${y0}px)`, opacity: 0 }, { transform: `translate(${x0}px,${y0 - 6}px)`, opacity: 1, offset: .1 }, { transform: `translate(${mx}px,${my}px)`, opacity: 1, offset: .55 }, { transform: `translate(${x1}px,${y1}px)`, opacity: 1, offset: .92 }, { transform: `translate(${x1}px,${y1}px)`, opacity: 0 }], { duration: 2400, easing: 'cubic-bezier(0.77, 0, 0.175, 1)' });
    an.onfinish = () => g2.remove();
  }
  /* Ronda por los caminos del hospital */
  (function () {
    const g2 = document.createElementNS(NS, 'g'); g2.setAttribute('class', 'guardia ronda'); g2.setAttribute('data-a', 'seguridad'); g2.setAttribute('role', 'button'); g2.setAttribute('aria-label', 'Ver los niveles de seguridad');
    g2.innerHTML = `<g class="haz"><path d="M2 -15L66 -36L66 10z"/></g><g class="cuerpo">${D.mini('seguridad', 1)}</g><circle class="toque" cx="0" cy="-14" r="20"/>`;
    capa.appendChild(g2);
    if (quieto) { const [x, y] = D.P(179, 149); g2.style.transform = `translate(${x}px,${y}px)`; return; }
    const t = [[179, 149], [495, 149], [495, 279], [179, 279], [179, 149]].map(([x, y]) => { const [a, b] = D.P(x, y); return { transform: `translate(${a}px,${b}px)` }; });
    g2.animate(t, { duration: 52000, iterations: Infinity, easing: 'linear' });
  })();
  A.seguridad = function () {
    U.hoja({ titulo: 'Seguridad del sistema', sub: 'Cinco niveles, uno sobre otro', ancho: 620, cuerpo: `<div class="con-av">${D.avatar('seguridad', 56)}<span class="mudo">Toque al guardia dentro de cada edificio para ver qué protege en esa área.</span></div>${A.nivelesHtml()}` });
  };
  A.nivelesHtml = () => `<ol class="niveles">${D.NIVELES.map(([t, d, s], i) => `<li><i>${i + 1}</i><div><b>${e(t)}</b><span>${e(d)}</span></div>${U.et(s, s === 'En el demo' ? 'bien' : '')}</li>`).join('')}</ol>`;

  const BOD = { FX: 'fx', QX: 'qx', EN: 'en', EM: 'em', LB: 'lb', BC: 'bc' };
  M.alCambiar(hechos => hechos.forEach(({ op, r }) => {
    if (!r.ok) return;
    const d = op.d || {};
    if (op.tipo === 'pedido.crear') viaje('en', 'fx', 'Pedido a farmacia');
    if (op.tipo === 'pedido.despachar') viaje('fx', 'en', 'Medicina en camino');
    if (op.tipo === 'traslado.enviar') { const t = db().ix.tras.get(d.id); viaje(BOD[t.de] || 'bc', BOD[t.a] || 'fx', 'Traslado'); }
    if (op.tipo === 'venta.directa') viaje('fx', 'ad', 'Venta cobrada');
    if (op.tipo === 'cuenta.facturar') viaje('ad', 'lb', 'Cuenta cobrada');
    if (op.tipo === 'sim.paciente') viaje('ad', { emergencia: 'em', consulta: 'ce', laboratorio: 'lb' }[d.tipo] || 'ce', 'Paciente');
    if (op.tipo === 'compra.recibir' || op.tipo === 'ingreso.registrar') viaje('ad', 'bc', 'Mercadería');
  }));

  /* ---------- Vivir un día ---------- */
  let reloj = null;
  A.vivirActivo = () => !!reloj;
  function paso() {
    const d = db(); if (!location.hash.startsWith('#/mapa')) return A.vivirDia(false);
    const de = a => a[Math.floor(Math.random() * a.length)], us = id => d.ix.usr.get(id);
    const meds = d.productos.filter(p => p.cat === 'Medicamento' && !p.controlado && M.disponible(d, p.id, 'FX', Date.now()) > 5);
    const t = id => d.turnos.find(x => x.us === id && x.estado === 'abierto');
    const pend = d.pedidos.filter(p => p.estado === 'pendiente'), abiertas = d.cuentas.filter(c => c.estado === 'abierta' && c.tipo === 'encamamiento');
    const r = Math.random();
    if (!meds.length) return;
    if (r < .3 && t('u5')) { const p = de(meds), cant = 1 + Math.floor(Math.random() * 3); return M.enviar('venta.directa', { items: [{ prod: p.id, bod: 'FX', cant }], turno: t('u5').id, nit: 'CF', nombre: 'Consumidor final', pagos: [{ forma: 'Efectivo', monto: M.r2(p.venta * cant) }] }, us('u5')); }
    if (r < .55 && t('u3')) return M.enviar('sim.paciente', { pac: { nombre: `${de(C.NOMBRES)} ${de(C.NOMBRES)} ${de(C.APELLIDOS)} ${de(C.APELLIDOS)}`, nit: 'CF', muni: de(C.MUNICIPIOS) }, tipo: de(['consulta', 'consulta', 'laboratorio', 'emergencia']), items: [{ serv: de(d.servicios.filter(x => x.precio < 300)).id, cant: 1 }, { prod: de(meds).id, bod: 'FX', cant: 1 }], turno: t('u3').id, forma: 'Efectivo' }, us('u3'));
    if (r < .75 && abiertas.length) return M.enviar('pedido.crear', { cuenta: de(abiertas).id, items: [{ prod: de(meds).id, cant: 2 }] }, us('u6'));
    if (r < .92 && pend.length) { const p = pend.find(x => x.items.every(i => !d.ix.prod.get(i.prod).controlado)); if (p) return M.enviar('pedido.despachar', { id: p.id }, us('u5')); }
    const tr = d.traslados.find(x => x.estado === 'solicitado'); if (tr) return M.enviar('traslado.enviar', { id: tr.id }, us('u8'));
  }
  A.vivirDia = function (on = !reloj) {
    clearInterval(reloj); reloj = on ? setInterval(paso, 1300) : null;
    if (on) { U.aviso('El hospital empezó a moverse. Estas operaciones son reales dentro del demo.'); paso(); }
    if (location.hash.startsWith('#/mapa')) A.repintar();
  };
})(window);
