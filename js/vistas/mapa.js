/* Mapa del hospital en vivo, rastreo de lote y tablero de Dirección. */
(function (g) {
  const { U, App: A, Motor: M, Catalogo: C, Docs } = g; const e = U.esc, Q = U.Q;
  const db = () => M.db;
  const pac = c => db().ix.pac.get(c.pac);

  /* ---------- mapa ---------- */
  function estado() {
    const d = db(), hoy = A.hoy(), ab = d.cuentas.filter(c => c.estado === 'abierta');
    const hoyC = []; for (let i = d.cuentas.length - 1; i >= 0 && d.cuentas[i].abierta >= hoy; i--) hoyC.push(d.cuentas[i]);
    const cuenta = t => hoyC.filter(c => c.tipo === t).length;
    const camas = new Map(), salas = new Map();
    for (const c of ab) { if (/^Cama \d+/.test(c.cama || '')) camas.set(+c.cama.split(' ')[1], c); if (/^Quirófano \d/.test(c.cama || '')) salas.set(+c.cama.split(' ')[1], c); }
    const ped = d.pedidos.filter(p => p.estado === 'pendiente');
    const venc = d.lotes.filter(l => l.vence < hoy + 30 * M.DIA && Object.values(l.ex).some(n => n > 0)).length;
    return { ab, hoyC, cuenta, camas, salas, ped, venc, em: ab.filter(c => c.tipo === 'emergencia'), porCobrar: ab.filter(c => c.total > 0).length, cajas: d.turnos.filter(t => t.estado === 'abierto').length, tr: d.traslados.filter(t => t.estado === 'solicitado').length, bajos: d.productos.filter(p => (p.ex.FX || 0) < p.min * .25 && p.cat === 'Medicamento').length };
  }
  A.estadoHospital = estado;
  const HUE = { em: 15, ad: 245, ce: 300, lb: 190, fx: 155, bc: 55, qx: 275, en: 200 };
  const titulo = (ic, t, x = '') => `<span class="area-t"><i class="mi">${U.ic(ic)}</i>${e(t)}${x}</span>`;
  const bloque = (id, ic, t, cuerpo, nivel = '') => `<button class="area-h solo-movil ${nivel}" data-a="zona" data-id="${id}" style="grid-area:${id};--a:${HUE[id]}">${Dibujo.edificio(id, HUE[id])}${titulo(ic, t)}<span class="datos">${cuerpo}</span></button>`;
  const TRABAJAN = { em: ['enfermeria'], ad: ['admision', 'caja'], ce: ['enfermeria'], lb: [], fx: ['farmacia'], bc: ['bodega', 'compras'], qx: ['quirofano'], en: ['enfermeria'] };
  const dato = (n, t) => `<span class="dato"><b class="num">${U.n(n)}</b>${e(t)}</span>`;
  A.vistas.mapa = {
    html() {
const s = estado(), urg = s.ped.some(p => p.urgente);
      return `${A.cab('Mapa del hospital', 'Toque un edificio para entrar: se levanta el techo y ve quién trabaja ahí y qué está haciendo.', `<button class="btn" data-a="seguridad">${U.ic('shield-check')}Seguridad</button><button class="btn pri" data-a="vivir" id="btnVivir">${U.ic(A.vivirActivo() ? 'pause' : 'play')}${A.vivirActivo() ? 'Detener el día' : 'Vivir un día'}</button>`)}
      <div class="plano-3d">${Dibujo.campus({
        en: { t: 'Encamamiento', v: `${s.camas.size} de 28 camas`, rol: 'enfermeria' }, qx: { t: 'Quirófanos', v: `${s.salas.size} de 4 salas`, rol: 'quirofano' }, bc: { t: 'Bodega central', v: `${U.n(s.tr)} traslados`, rol: 'bodega' },
        ce: { t: 'Consulta externa', v: `${U.n(s.cuenta('consulta'))} hoy`, rol: 'enfermeria' }, lb: { t: 'Laboratorio', v: `${U.n(s.cuenta('laboratorio'))} estudios` }, fx: { t: 'Farmacia', v: `${U.n(s.ped.length)} pedidos`, rol: 'farmacia', alerta: urg },
        em: { t: 'Emergencia', v: `${U.n(s.em.length)} ahora`, rol: 'enfermeria' }, ad: { t: 'Admisión y caja', v: `${U.n(s.porCobrar)} por cobrar`, rol: 'caja' },
      })}</div>
      <div class="plano">
        ${bloque('em', 'siren', 'Emergencia', dato(s.em.length, 'pacientes ahora'))}
        ${bloque('ad', 'user-round', 'Admisión y caja', dato(s.porCobrar, 'por cobrar'))}
        ${bloque('ce', 'stethoscope', 'Consulta externa', dato(s.cuenta('consulta'), 'consultas hoy'))}
        ${bloque('lb', 'flask-conical', 'Laboratorio e imagen', dato(s.cuenta('laboratorio'), 'estudios hoy'))}
        ${bloque('fx', 'pill', 'Farmacia', dato(s.ped.length, 'pedidos'), urg ? 'alerta' : '')}
        ${bloque('bc', 'boxes', 'Bodega central', dato(s.tr, 'traslados'))}
        ${bloque('qx', 'activity', 'Quirófanos', dato(s.salas.size, 'de 4 salas en uso'))}
        ${bloque('en', 'bed-double', 'Encamamiento', dato(s.camas.size, 'de 28 camas'))}
      </div>`;
    },
    acc: {
      zona(id) { A.interior(id); },
      vivir() { A.vivirDia(); },
      seguridad() { A.seguridad(); },
    },
    despues(el) { // lo que cambió se marca un instante para que el ojo lo encuentre
      A.capaViajes(el);
      const prev = A.st.mapa.v || {}, ahora = {};
      el.querySelectorAll('.area-h').forEach((b, i) => { const k = b.innerText; ahora[i] = k; if (prev[i] && prev[i] !== k) { b.classList.remove('cambio'); void b.offsetWidth; b.classList.add('cambio'); } });
      A.st.mapa.v = ahora;
    },
  };

  /* ---------- rastreo de lote ---------- */
  A.rastreo = function (st, tabs) {
    const d = db(), l = st.rl ? d.ix.lote.get(st.rl) : null;
    if (!l) return `${A.cab('Inventario', 'Busque un lote y vea de dónde vino, por dónde pasó y qué pacientes lo recibieron.')}${tabs}
      <div class="campo" style="max-width:520px;margin-bottom:16px"><span class="etq">Lote o producto</span><div id="rsel"></div></div>
      <div class="tabla-marco"><div class="vacio"><b>Elija un lote</b>Si hay una alerta sanitaria, aquí se bloquea y se sabe a quién se le aplicó.</div></div>`;
    const p = d.ix.prod.get(l.prod);
    const ms = (d.ix.movsDe.get(l.prod) || []).filter(m => m.l === l.id);
    const num = new Map(); d.cuentas.forEach(c => num.set(c.num, c));
    const consumos = ms.filter(m => m.t === 'Consumo paciente').slice().reverse();
    const usados = consumos.reduce((a, m) => a + -m.c, 0);
    const entrada = ms.find(m => m.c > 0 && !m.t.startsWith('Traslado')) || ms[0];
    const rec = d.recepciones.find(r => r.lineas.some(x => x.lote === l.id));
    const prov = l.prov ? d.ix.prov.get(l.prov) : null;
    const hoy = Object.entries(l.ex).filter(([, n]) => n > 0);
    const rutas = {}; ms.filter(m => m.t === 'Traslado entra' && m.b !== 'TR').forEach(m => { rutas[m.b] = (rutas[m.b] || 0) + m.c; });
    const paso = (ic, t, s, x = '') => `<li>${U.ic(ic)}<div><b>${e(t)}</b><span>${s}</span>${x}</div></li>`;
    const pacientes = new Set(consumos.map(m => (num.get(m.d) || {}).pac).filter(Boolean)).size;
    const acc = `<button class="btn" data-a="rotro">Otro lote</button>${A.puede('lote.bloquear') ? `<button class="btn ${l.bloqueo ? '' : 'peligro'}" data-a="rbloq" data-id="${l.id}">${U.ic('ban')}${l.bloqueo ? 'Liberar lote' : 'Bloquear lote'}</button>` : ''}`;
    return `${A.cab('Inventario', `${p.nombre} · lote ${l.num}`, acc)}${tabs}
      ${l.bloqueo ? `<div class="nota alerta">${U.ic('ban')}<span>Lote bloqueado: ${e(l.bloqueo.motivo)}. Ya no se vende ni se traslada. ${e(A.nomU(l.bloqueo.us))}, ${U.fh(l.bloqueo.f)}.</span></div>` : ''}
      <div class="cifras"><div class="cifra"><span>Vence</span><b>${U.fecha(l.vence)}</b></div><div class="cifra"><span>Aplicado a</span><b>${U.n(pacientes)} pacientes</b><small>${U.n(usados)} unidades</small></div><div class="cifra"><span>Queda</span><b>${U.n(Object.values(l.ex).reduce((a, b) => a + b, 0))} unidades</b></div><div class="cifra"><span>Fondo</span><b>${e(l.fondo)}</b></div></div>
      <div class="dos"><section class="seccion"><h2>Pacientes que lo recibieron</h2>${U.tabla({ filas: consumos, pag: st.pag_r, nombre: 'r', por: 12, id: m => (num.get(m.d) || {}).id, clic: 'rcuenta', vacioT: 'Aún no se ha aplicado', vacio: 'Este lote no ha salido a ningún paciente.', cols: [{ t: 'Paciente', h: m => { const c = num.get(m.d); return `${e(c ? pac(c).nombre : '—')}<span class="t-sub">${e(m.d)}</span>`; } }, { t: 'Fecha', h: m => U.fh(m.f) }, { t: 'Cant.', der: 1, h: m => U.n(-m.c) }] })}</section>
      <aside class="seccion"><h2>Recorrido</h2><ol class="ruta-l">
        ${paso('truck', prov ? prov.nombre : (entrada && entrada.t) || 'Entrada', `${U.fecha(l.entrada)}${rec ? ` · ${e(rec.num)}, factura ${e(rec.serie)}-${e(rec.factura)}` : ''}`)}
        ${Object.entries(rutas).map(([b, n]) => paso('arrow-left-right', M.nomBod(d, b), `${U.n(n)} unidades trasladadas`)).join('')}
        ${paso('user-round', 'Pacientes', `${U.n(usados)} unidades aplicadas`)}
        ${paso('boxes', 'Hoy', hoy.length ? hoy.map(([b, n]) => `${e(M.nomBod(d, b))} ${U.n(n)}`).join(', ') : 'Sin existencia')}
      </ol></aside></div>`;
  };
  A.rastreoListo = function (el, st) {
    const s = el.querySelector('#rsel'); if (!s) return;
    U.selector(s, {
      ph: 'Número de lote o nombre del producto', limpiar: false, buscar(q) {
        const out = [];
        for (const l of db().lotes) { if (out.length >= 25) break; const p = db().ix.prod.get(l.prod); if (l.num.toLowerCase().includes(q) || (p._n || (p._n = U.norm(p.nombre + ' ' + p.cod))).includes(q)) out.push({ txt: `Lote ${l.num} · ${p.nombre}`, sub: `Vence ${U.fecha(l.vence)} · ${l.fondo}`, id: l.id }); }
        return out;
      }, alElegir(x) { st.rl = x.id; st.pag_r = 0; A.repintar(); },
    });
  };
  Object.assign(A.vistas.inventario.acc, {
    rotro() { A.st.inventario.rl = null; A.repintar(); }, rcuenta(id) { if (id) location.hash = '#/cuentas/' + id; },
    rbloq(id) {
      const l = db().ix.lote.get(id);
      if (l.bloqueo) return U.hacer('lote.bloquear', { lote: id, bloquear: false }, true);
      const h = U.hoja({ titulo: 'Bloquear lote', sub: `Lote ${l.num}`, dialogo: true, cuerpo: `<p>Deja de venderse y de trasladarse de inmediato, en todos los dispositivos.</p><div class="campo"><label for="m">Motivo</label><input id="m" type="text"></div>`, pie: `<button class="btn peligro" data-a="ok">Bloquear</button>`, acciones: { async ok() { const r = await U.hacer('lote.bloquear', { lote: id, bloquear: true, motivo: h.cuerpo.querySelector('#m').value }, true); if (r.ok) h.cerrar(); } } });
    },
  });

  /* ---------- tablero de Dirección ---------- */
  A.tablero = function () {
    const d = db(), hoy = A.hoy(), ahora = Date.now();
    let hoyQ = 0, pasadaQ = 0; const dias = new Map(); for (let i = 29; i >= 0; i--) dias.set(hoy - i * M.DIA, 0);
    const iniP = hoy - 7 * M.DIA, finP = iniP + (ahora - hoy); const desde = hoy - 29 * M.DIA;
    for (let i = d.dtes.length - 1; i >= 0; i--) { const x = d.dtes[i]; if (x.f < desde) break; if (x.estado === 'anulada') continue; const k = M.finDia(x.f); if (dias.has(k)) dias.set(k, dias.get(k) + x.total); if (x.f >= hoy) hoyQ += x.total; if (x.f >= iniP && x.f <= finP) pasadaQ += x.total; }
    const pct = pasadaQ ? (hoyQ - pasadaQ) / pasadaQ * 100 : 0, sube = pct >= 0;
    const s = (() => { let n = 0; for (let i = d.cuentas.length - 1; i >= 0 && d.cuentas[i].abierta >= hoy; i--) n++; return n; })();
    const camas = d.cuentas.filter(c => c.estado === 'abierta' && /^Cama /.test(c.cama || '')).length;
    const valor = d.productos.reduce((a, p) => a + p.valor, 0), pagar = d.cxp.filter(x => x.estado === 'pendiente').reduce((a, x) => a + x.aPagar, 0);
    const riesgo = [['Vencido', -9999, 0], ['Vence en 30 días', 0, 30], ['31 a 60 días', 30, 60], ['61 a 90 días', 60, 90]].map(([t, a, b]) => ({ t, v: d.lotes.reduce((s2, l) => { const n = U.diasPara(l.vence, hoy); if (n > a - (a === 0 ? 1 : 0) && n <= b - (b === 0 ? 1 : 0)) s2 += Object.values(l.ex).reduce((x, y) => x + y, 0) * l.costo; return s2; }, 0) }));
    const maxR = Math.max(...riesgo.map(r => r.v), 1);
    const faltan = d.productos.filter(p => p.qty < p.min && p.cat !== 'Uso interno').sort((a, b) => a.qty / (a.min || 1) - b.qty / (b.min || 1)).slice(0, 5);
    const en = A.enMes(A.meses()[0].k); const ay = d.dtes.filter(x => en(x.f) && x.desc > 0 && x.estado === 'vigente');
    const ayuda = ay.reduce((a, x) => a + x.desc, 0);
    const datos = [...dias].map(([k, v]) => { const f = new Date(k); return { v, t: U.fecha(k), c: `${f.getDate()}/${f.getMonth() + 1}`, hoy: k === hoy, fin: f.getDay() === 0 }; });
    const pend = A.pendientesRol();
    return `<div class="portada-t"><div><span class="peq mudo">${U.fecha(ahora)} · Hospital Hilario Galindo</span><h1>Hoy van ${e(Q(hoyQ))}</h1><p class="${sube ? 'sube' : 'baja'}">${U.ic(sube ? 'trending-up' : 'trending-down')}${Math.abs(pct).toFixed(1)} % ${sube ? 'más' : 'menos'} que el mismo día de la semana pasada a esta hora</p></div></div>
      <div class="cifras"><div class="cifra" style="--c:300"><span>Pacientes hoy</span><b>${U.n(s)}</b></div><div class="cifra" style="--c:200"><span>Camas ocupadas</span><b>${camas} de 28</b></div><div class="cifra" style="--c:55"><span>Inventario</span><b>${Q(valor)}</b></div><div class="cifra" style="--c:85"><span>Por pagar</span><b>${Q(pagar)}</b></div></div>
      <div class="dos"><div>
        ${pend.length ? `<section class="seccion"><h2>Necesita su decisión</h2><div class="pend">${pend.map(p => `<a class="fila-pend ${p.nivel}" href="${p.ir}" style="--a:${A.hue(p.ir)}"><b>${U.n(p.n)}</b><span class="q">${e(p.t)}<span>${e(p.s)}</span></span>${U.ic('chevron-right')}</a>`).join('')}</div></section>` : ''}
        <section class="seccion" style="--a:245"><h2>Ingresos, últimos 30 días</h2>${U.barras(datos, { alt: 'Ingresos por día de los últimos 30 días' })}</section>
        <section class="seccion" style="--a:55"><h2>Dinero en riesgo por vencimiento</h2>${riesgo.map(r => `<div class="area"><span>${e(r.t)}</span><span class="num">${Q(r.v)}</span><i><u style="width:${(r.v / maxR * 100).toFixed(1)}%"></u></i></div>`).join('')}</section>
      </div><aside>
        <section class="seccion"><div class="cifra" style="--c:350"><span>Ayuda social del mes</span><b>${e(Q(ayuda))}</b><small>a ${U.n(ay.length)} pacientes</small></div></section>
        <section class="seccion" style="--a:85"><h2>Por agotarse</h2>${faltan.length ? faltan.map(p => `<div class="area"><span>${e(p.nombre)}</span><span class="num">${U.n(p.qty)} de ${U.n(p.min)}</span><i><u style="width:${Math.min(100, p.qty / (p.min || 1) * 100).toFixed(1)}%"></u></i></div>`).join('') : '<p class="mudo">Todo sobre el mínimo.</p>'}</section>
        <section class="seccion"><h2>Movimiento en vivo</h2>${A.vivoHtml()}</section>
      </aside></div>`;
  };
})(window);
