/* Cambie aquí los precios: todo lo demás se recalcula solo. */
const PRECIOS = {
  mensual: { pago: 18000, cuota: 4500 },
  compra: { pago: 145000, cuota: 1800 },
  ivaPct: 12, anios: 5, servidorUSD: 75,
};

(function () {
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const quieto = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const Q = n => 'Q ' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const fuera = t => 1 - Math.pow(1 - t, 4);
  const suave = t => t * t * (3 - 2 * t);

  function tween(el, de, a, ms, fmt) {
    cancelAnimationFrame(el._t);
    if (quieto) { el.textContent = fmt(a); return; }
    const t0 = performance.now();
    const paso = t => { const k = Math.min(1, (t - t0) / ms); el.textContent = fmt(de + (a - de) * fuera(k)); if (k < 1) el._t = requestAnimationFrame(paso); };
    el._t = requestAnimationFrame(paso);
  }

  /* Portada: el título sube palabra por palabra */
  (function () {
    const h = $('#titulo'); let i = 0;
    const envolver = n => [...n.childNodes].forEach(x => {
      if (x.nodeType === 3) { const f = document.createDocumentFragment(); x.textContent.split(/(\s+)/).forEach(p => { if (!p.trim()) return f.append(p); const w = document.createElement('span'); w.className = 'w'; const s = document.createElement('span'); s.style.setProperty('--i', i++); s.textContent = p; w.append(s); f.append(w); }); x.replaceWith(f); }
      else envolver(x);
    });
    h.setAttribute('aria-label', h.textContent); envolver(h);
  })();

  /* Mosaico de la portada: las seis áreas con su color */
  const AREAS = [['Compras', 85, 'shopping-cart'], ['Bodega', 55, 'boxes'], ['Farmacia', 155, 'pill'], ['Paciente', 350, 'stethoscope'], ['Caja', 245, 'wallet'], ['Libros', 285, 'book-open-check']];
  const EDIF_A = ['of', 'bc', 'fx', 'en', 'ad', 'of'];
  const pintarMosaico = () => { $('#mosaico').innerHTML = AREAS.map(([t, h], k) => `<div class="mz ver" data-r style="--m:${h};--i:${k + 4}">${Dibujo.edificio(EDIF_A[k], h)}${t}</div>`).join(''); };
  pintarMosaico();
  const pintarEtapas = () => $$('.etapa').forEach((et, k) => { let c = $('.e-ed', et); if (!c) { c = document.createElement('div'); c.className = 'e-ed'; c.setAttribute('aria-hidden', 'true'); $('.txt', et).after(c); } c.innerHTML = Dibujo.edificio(EDIF_A[k], AREAS[k][1]); });
  pintarEtapas();

  /* Línea de pulso: el motivo de toda la propuesta */
  function latido(x, y, a = 1) { return `L${x - 34} ${y} l10 ${-12 * a} l9 ${12 * a} l6 ${14 * a} l9 ${-92 * a} l10 ${118 * a} l8 ${-40 * a} `; }
  (function () {
    const y = 150; let d = `M0 ${y} `; [170, 520, 860, 1110].forEach(x => { d += latido(x, y, .9); }); d += `L1200 ${y}`;
    const s = $('#pulsoH'); s.innerHTML = `<path id="ph" d="${d}"/>${quieto ? '' : `<circle r="5"><animateMotion dur="7s" repeatCount="indefinite" path="${d}"/></circle>`}`;
    const p = $('#ph'), L = p.getTotalLength();
    if (!quieto) { p.style.strokeDasharray = L; p.animate([{ strokeDashoffset: L }, { strokeDashoffset: 0 }], { duration: 1800, easing: 'cubic-bezier(0.23, 1, 0.32, 1)', fill: 'both', delay: 500 }); }
  })();

  /* Apariciones */
  const io = new IntersectionObserver(es => es.forEach(x => { if (x.isIntersecting) { x.target.classList.add('ver'); io.unobserve(x.target); } }), { rootMargin: '0px 0px -8% 0px', threshold: .08 });
  $$('[data-r]').forEach(n => io.observe(n));

  /* Frase: se enciende palabra por palabra al bajar */
  const frase = $('#frase p'); const pals = [];
  (function () {
    const envolver = n => [...n.childNodes].forEach(x => {
      if (x.nodeType === 3) { const f = document.createDocumentFragment(); x.textContent.split(/(\s+)/).forEach(p => { if (!p.trim()) return f.append(p); const s = document.createElement('span'); s.className = 'pal'; s.textContent = p; pals.push(s); f.append(s); }); x.replaceWith(f); }
      else envolver(x);
    });
    envolver(frase);
  })();

  /* Recorrido */
  const ET = ['Compras', 'Bodega', 'Farmacia', 'Paciente', 'Caja', 'Libros'];
  const XS = [90, 294, 498, 702, 906, 1110], Y0 = 168;
  let dR = `M0 ${Y0} `; XS.forEach(x => { dR += latido(x, Y0, .62); }); dR += `L1200 ${Y0}`;
  $('#lineaB').setAttribute('d', dR); $('#lineaA').setAttribute('d', dR);
  $('#nodos').innerHTML = XS.map((x, i) => `<g class="nodo"><circle cx="${x}" cy="${Y0 + 46}" r="6"/><text x="${x}" y="${Y0 + 72}">${ET[i]}</text></g>`).join('');
  const nodos = $$('.nodo'), etapas = $$('.etapa'), ficha = $('#ficha'), corte = $('#corteR'), viaje = $('#viaje'), liq = $('#liq');
  const figs = { vial: $('#f-vial'), recibo: $('#f-recibo'), libro: $('#f-libro') };
  let actual = -1, pObj = 0, pAct = 0, corriendo = false;
  function escalaFicha() { const w = $('#ruta').getBoundingClientRect().width || 1200; return Math.min(2.4, Math.max(1, 1200 / w * .62)); }
  let kF = escalaFicha();
  function dibujar(p) {
    const n = ET.length, u = Math.min(n - .001, p * n), s = Math.floor(u), f = u - s;
    const mov = f < .55 || s === n - 1 ? 0 : suave((f - .55) / .45); // descansa en cada estación y luego avanza
    const x = XS[s] + (s < n - 1 ? (XS[s + 1] - XS[s]) * mov : 0);
    const brinco = Math.sin(mov * Math.PI) * 16;
    ficha.setAttribute('transform', `translate(${x} ${Y0 - 66 - brinco}) scale(${kF})`);
    corte.setAttribute('width', x + 8);
    const e = mov > .5 ? Math.min(n - 1, s + 1) : s;
    if (e !== actual) {
      actual = e;
      viaje.style.setProperty('--e', AREAS[e][1]);
      etapas.forEach((t, i) => { t.classList.toggle('activa', i === e); t.classList.toggle('pasada', i < e); });
      nodos.forEach((t, i) => t.classList.toggle('paso', i <= e));
      figs.vial.classList.toggle('on', e <= 3); figs.recibo.classList.toggle('on', e === 4); figs.libro.classList.toggle('on', e === 5);
      liq.classList.toggle('vacio', e >= 3);
      $$('[data-de]', etapas[e]).forEach(b => { const fmt = b.dataset.q ? Q : v => Math.round(v).toLocaleString('en-US'); tween(b, +b.dataset.de, +b.dataset.a, 1100, fmt); });
    }
  }
  function correr() {
    pAct += (pObj - pAct) * (quieto ? 1 : .14);
    if (Math.abs(pObj - pAct) < .0004) { pAct = pObj; corriendo = false; dibujar(pAct); return; }
    dibujar(pAct); requestAnimationFrame(correr);
  }
  const pasos = $('#tiempo');
  function alBajar() {
    const r = viaje.getBoundingClientRect(), vh = innerHeight;
    pObj = Math.min(1, Math.max(0, -r.top / (r.height - vh)));
    if (!corriendo) { corriendo = true; requestAnimationFrame(correr); }
    const fr = frase.getBoundingClientRect(), k = Math.min(1, Math.max(0, (vh * .86 - fr.top) / (fr.height + vh * .45)));
    const on = Math.round(k * pals.length); pals.forEach((w, i) => w.classList.toggle('on', i < on));
    const tr = pasos.getBoundingClientRect(); pasos.style.setProperty('--t', Math.min(1, Math.max(0, (vh * .75 - tr.top) / tr.height)).toFixed(3));
  }
  addEventListener('scroll', alBajar, { passive: true });
  addEventListener('resize', () => { kF = escalaFicha(); actual = -1; alBajar(); ajustar(); });

  /* Aparatos en vivo */
  const figuras = [...$$('#aparatos figure'), $('#muestra')];
  function ajustar() { figuras.forEach(f => { const p = $('.pant-f', f), i = $('iframe', f), w = +f.dataset.w, h = +f.dataset.h; const k = p.clientWidth / w; i.width = w; i.height = h; i.style.transform = `scale(${k})`; p.style.height = h * k + 'px'; }); }
  ajustar();
  const montar = fs => new IntersectionObserver((es, o) => es.forEach(x => { if (x.isIntersecting) { o.disconnect(); fs.forEach(f => { if (f.offsetParent) { const i = $('iframe', f); i.src = i.dataset.src; } }); ajustar(); } }), { rootMargin: '400px' });
  montar($$('#aparatos figure')).observe($('#aparatos')); montar([$('#muestra')]).observe($('#muestra'));

  /* Simulador: carga el motor solo cuando se pide */
  const cargar = s => new Promise((ok, mal) => { const e = document.createElement('script'); e.src = s; e.onload = ok; e.onerror = mal; document.head.append(e); });
  let motor = null, reloj = null, ops = 0;
  async function prepararMotor() {
    if (motor) return motor;
    await cargar('js/datos.js'); await cargar('js/motor.js');
    const M = window.Motor, C = window.Catalogo; await M.iniciar();
    const late = $('.vivo');
    M.alCambiar(h => { ops += h.length; $('#nOps').textContent = ops.toLocaleString('en-US'); late.classList.remove('late'); void late.offsetWidth; late.classList.add('late'); });
    const de = a => a[Math.floor(Math.random() * a.length)], db = M.db;
    const meds = db.productos.filter(p => p.cat === 'Medicamento' && !p.controlado).slice(0, 60), cajeros = ['u3', 'u4', 'u5'].map(id => db.ix.usr.get(id));
    motor = () => {
      const u = de(cajeros), t = db.turnos.find(x => x.us === u.id && x.estado === 'abierto'); if (!t) return;
      if (u.id === 'u5') {
        const p = de(meds), cant = 1 + Math.floor(Math.random() * 3);
        if (M.disponible(db, p.id, 'FX', Date.now()) < cant) return;
        return M.enviar('venta.directa', { items: [{ prod: p.id, bod: 'FX', cant }], turno: t.id, nit: 'CF', nombre: 'Consumidor final', pagos: [{ forma: 'Efectivo', monto: M.r2(p.venta * cant) }] }, u);
      }
      const tipo = de(['consulta', 'laboratorio', 'emergencia']);
      M.enviar('sim.paciente', { pac: { nombre: `${de(C.NOMBRES)} ${de(C.APELLIDOS)} ${de(C.APELLIDOS)}`, nit: 'CF', muni: de(C.MUNICIPIOS) }, tipo, items: [{ serv: de(db.servicios.filter(s => s.precio < 300)).id, cant: 1 }, { prod: de(meds).id, bod: 'FX', cant: 2 }], turno: t.id, forma: 'Efectivo' }, u);
    };
    return motor;
  }
  $('#simular').onclick = async ev => {
    const b = ev.currentTarget;
    if (reloj) { clearInterval(reloj); reloj = null; b.textContent = 'Simular hora pico'; return; }
    const fn = await prepararMotor(); reloj = setInterval(fn, 450); b.textContent = 'Detener';
  };

  /* Módulos */
  const MODS = [
    ['Mostrador de farmacia', 'Se escanea, baja del inventario y se cobra en una sola pantalla. Muestra el vencimiento y ofrece alternativas si algo se agotó.', 'u5', 'farmacia'],
    ['Cuenta del paciente', 'Consulta, quirófano y encamamiento cargan a una sola cuenta. Caja cobra una vez.', 'u3', 'caja'],
    ['Mapa del hospital', 'Camas, quirófanos, farmacia y bodegas con su estado en vivo.', 'u1', 'mapa'],
    ['Rastreo de lote', 'De qué proveedor vino, por dónde pasó y qué pacientes lo recibieron. Si hay alerta, se bloquea en todos los dispositivos.', 'u5', 'inventario/rastreo'],
    ['Ingreso de mercadería', 'Cuatro pasos, siempre iguales. Con factura en mano, XML, Excel, orden de compra o donación.', 'u8', 'inventario/ingreso'],
    ['Inventario', 'Seis bodegas, kárdex con costo promedio, traslados con confirmación y conteo a ciegas desde el teléfono.', 'u8', 'inventario/existencias'],
    ['Compras', 'Del pedido del área a la orden, la aprobación por monto, la recepción, la retención y el pago.', 'u9', 'compras'],
    ['Trabajo social', 'Descuentos con estudio socioeconómico. La Junta sabe cuánta ayuda se dio y a cuántas personas.', 'u11', 'social'],
    ['Tablero de Dirección', 'Dinero del día, faltantes, vencimientos y lo que necesita decisión, de un vistazo.', 'u1', 'inicio'],
    ['Reglas y permisos', 'El hospital decide quién aprueba, desde qué monto y qué puede hacer cada puesto.', 'u1', 'config/reglas'],
    ['Contabilidad', 'Libros, retenciones, inventario valorado, partida diaria, donaciones y fondos públicos.', 'u10', 'ley'],
  ];
  $('#mods').innerHTML = MODS.map(([t, d, u, r], i) => `<div class="mod" ${i ? '' : 'data-abierto'}><button aria-expanded="${!i}">${t}<i></i></button><div class="cuerpo"><div><p>${d}</p><a href="index.html?u=${u}#/${r}">Verlo en el demo</a></div></div></div>`).join('');
  $('#mods').addEventListener('click', ev => {
    const b = ev.target.closest('.mod > button'); if (!b) return;
    const m = b.parentNode, abierto = m.hasAttribute('data-abierto');
    $$('.mod').forEach(x => { x.removeAttribute('data-abierto'); $('button', x).setAttribute('aria-expanded', 'false'); });
    if (!abierto) { m.setAttribute('data-abierto', ''); b.setAttribute('aria-expanded', 'true'); }
  });

  /* Puestos: todos a la vista */
  const ROLES = [
    ['Dirección general', 'Ve todo, aprueba las compras grandes y decide con el tablero.', 'direccion', 'u1'], ['Admisión', 'Registra pacientes y abre sus cuentas.', 'admision', 'u2'], ['Caja', 'Cobra las cuentas y cierra su turno con arqueo.', 'caja', 'u3'],
    ['Regente de farmacia', 'Vende y cobra en mostrador, despacha pedidos y lleva los controlados.', 'farmacia', 'u5'], ['Enfermería de sala', 'Pide a farmacia desde la tablet, junto al paciente.', 'enfermeria', 'u6'], ['Enfermería de quirófano', 'Registra lo que usa cada cirugía.', 'quirofano', 'u7'],
    ['Encargado de bodega', 'Ingresa mercadería, traslada y cuenta desde el teléfono.', 'bodega', 'u8'], ['Encargado de compras', 'Convierte las solicitudes en órdenes de compra.', 'compras', 'u9'], ['Contador general', 'Libros, retenciones y pagos a proveedores.', 'contabilidad', 'u10'], ['Trabajo social', 'Resuelve los descuentos por estudio socioeconómico.', 'social', 'u11'], ['Auditor interno', 'Lee todo y no cambia nada.', 'auditoria', 'u12'],
  ];
  const pintarRoles = () => { $('#rolG').innerHTML = ROLES.map(([t, d, r, u]) => `<a class="rol-c" href="index.html?u=${u}">${Dibujo.avatar(r, 52)}<div><b>${t}</b><span>${d}</span></div></a>`).join(''); };
  pintarRoles();

  /* Todo lo que se puede construir */
  const YA = 'En el demo', MAS = 'Se puede agregar';
  const CONSTRUIR = {
    'Atención': [['Cuenta del paciente', 'Todo lo que consume en una sola cuenta.', YA], ['Citas y agenda médica', 'Agenda por médico, con recordatorio por WhatsApp.', MAS], ['Expediente clínico', 'Historia, evolución y diagnósticos del paciente.', MAS], ['Recetas digitales', 'El médico receta y farmacia la ve al momento.', MAS], ['Órdenes y resultados', 'Laboratorio e imagen con resultados en línea.', MAS], ['Turnos en pantalla', 'Sala de espera con llamado en TV.', MAS], ['Portal del paciente', 'Citas, resultados y pagos desde el teléfono.', MAS]],
    'Quirófano y salas': [['Consumo por cirugía', 'Lo usado se carga a la cuenta.', YA], ['Mapa de camas', 'Ocupación en vivo.', YA], ['Programación de quirófanos', 'Calendario de salas, equipos y cirujanos.', MAS], ['Kits por cirugía', 'Lista de insumos lista según procedimiento.', MAS], ['Jornadas quirúrgicas', 'Equipos visitantes, donaciones y consumo por jornada.', MAS], ['Consentimientos en tablet', 'Firma del paciente sin papel.', MAS], ['Dietas y lavandería', 'Control de alimentación y ropa hospitalaria.', MAS]],
    'Farmacia e inventario': [['Mostrador de venta', 'Escanear, cobrar y bajar del inventario.', YA], ['Lotes y vencimientos', 'Sale primero lo que vence primero.', YA], ['Rastreo y bloqueo de lotes', 'A qué pacientes llegó cada lote.', YA], ['Control de sustancias', 'Receta y balance mensual.', YA], ['Etiquetas propias', 'Impresión de códigos de barras.', MAS], ['Reposición automática', 'Sugiere qué pedir según el consumo.', MAS], ['Cadena de frío', 'Sensores y alertas de temperatura.', MAS], ['Activos y mantenimiento', 'Equipo médico, depreciación y servicios.', MAS]],
    'Compras': [['Órdenes y aprobaciones', 'Por monto y por puesto.', YA], ['Ingreso por XML y Excel', 'Sin digitar la factura.', YA], ['Cotizaciones', 'Comparar precios entre proveedores.', MAS], ['Portal de proveedores', 'Órdenes y pagos en línea.', MAS], ['Presupuesto por área', 'Lo gastado contra lo aprobado.', MAS]],
    'Finanzas y ley': [['Libros y retenciones', 'Compras, ventas e ISR.', YA], ['Factura con certificador', 'Opcional, automática desde la venta.', MAS], ['Contabilidad completa', 'Catálogo, balances y estados financieros.', MAS], ['Bancos y conciliación', 'Cheques, depósitos y estados de cuenta.', MAS], ['Planilla e IGSS', 'Nómina, prestaciones y descuentos.', MAS], ['Aseguradoras', 'Cuentas por cobrar y reclamos.', MAS]],
    'Patronato': [['Ayuda social', 'Descuentos con su estudio.', YA], ['Fondos públicos y donaciones', 'Separados, con NOG y recibo.', YA], ['Donantes y proyectos', 'Seguimiento de cada aporte.', MAS], ['Informes para la Junta', 'Reportes mensuales listos.', MAS], ['Informes a Salud y Contraloría', 'Formatos que pidan las instituciones.', MAS]],
    'Tecnología': [['Varios dispositivos a la vez', 'Computadora, tablet y teléfono.', YA], ['Bitácora completa', 'Quién, cuándo y desde dónde.', YA], ['Modo sin internet', 'Sigue vendiendo y sincroniza después.', MAS], ['Aplicación para teléfono', 'Instalable, con avisos.', MAS], ['Firma electrónica', 'Aprobaciones y documentos.', MAS], ['Asistente con inteligencia artificial', 'Preguntas sobre los datos en lenguaje normal.', MAS]],
  };
  let cnSel = 'Todo';
  function pintarCn() {
    $('#cnF').innerHTML = ['Todo', ...Object.keys(CONSTRUIR)].map(k => `<button data-k="${k}" aria-pressed="${k === cnSel}">${k}</button>`).join('');
    const l = cnSel === 'Todo' ? Object.values(CONSTRUIR).flat() : CONSTRUIR[cnSel];
    $('#cnG').innerHTML = l.map(([t, d, e2], i) => `<div class="cn" style="--i:${Math.min(i, 14)}"><b>${t}</b><span>${d}</span><em class="${e2 === YA ? 'ya' : ''}">${e2}</em></div>`).join('');
  }
  $('#cnF').addEventListener('click', ev => { const b = ev.target.closest('button'); if (b) { cnSel = b.dataset.k; pintarCn(); } });
  pintarCn();

  /* Ley */
  const dlg = $('#detalle');
  $('#verLey').onclick = () => dlg.showModal();
  $('#cerrarLey').onclick = () => dlg.close();
  dlg.addEventListener('click', ev => { if (ev.target === dlg) dlg.close(); });

  /* Colores: el tono nuevo se abre desde donde se tocó, y cambia todo */
  const tonos = $('#tonos'), hue = $('#hue');
  tonos.innerHTML = `<button class="sw" data-h="areas" aria-pressed="false"><i class="multi"></i>Por áreas</button>` + Object.values(Tema.TONOS).map(t => `<button class="sw" data-h="${t.h}" style="--t:${t.h}" aria-pressed="false"><i></i>${esc(t.nombre)}</button>`).join('');
  const marcar = () => { const h = Tema.fijo(); $$('.sw', tonos).forEach(b => b.setAttribute('aria-pressed', b.dataset.h === 'areas' ? h == null : +b.dataset.h === h)); hue.value = h == null ? 235 : h; };
  function cambiar(h, x, y) {
    if (!document.startViewTransition || quieto) { Tema.guardar(h); return marcar(); }
    const r = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
    const t = document.startViewTransition(() => { Tema.guardar(h); marcar(); });
    t.ready.then(() => document.documentElement.animate({ clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${r}px at ${x}px ${y}px)`] }, { duration: 700, easing: 'cubic-bezier(0.77, 0, 0.175, 1)', pseudoElement: '::view-transition-new(root)' }));
  }
  tonos.addEventListener('click', ev => { const b = ev.target.closest('.sw'); if (b) cambiar(b.dataset.h === 'areas' ? null : +b.dataset.h, ev.clientX, ev.clientY); });
  hue.addEventListener('input', () => { Tema.guardar(+hue.value); marcar(); });
  marcar();
  addEventListener('tema', () => { pintarMosaico(); pintarEtapas(); pintarRoles(); });

  /* Inversión */
  const INCLUYE = {
    mensual: ['Levantamiento y personalización', 'Carga de catálogos y saldos iniciales', 'Capacitación por rol', 'Servidor en la nube y respaldos', 'Soporte y mejoras menores'],
    compra: ['Levantamiento y personalización', 'Carga de catálogos y saldos iniciales', 'Capacitación por rol', 'Soporte y mejoras menores', `Servidor en la nube a nombre del Patronato: desde USD ${PRECIOS.servidorUSD} al mes, pagados directo`],
  };
  const TXT = { mensual: ['Implementación, una sola vez', 'Cada mes', 'Menos desembolso al inicio. Servidor y soporte incluidos.'], compra: ['Pago único', 'Soporte cada mes', 'Un solo pago, y el sistema queda en la cuenta del Patronato.'] };
  let forma = 'mensual', v1 = 0, v2 = 0;
  function precios(animar = true) {
    const f = $('#iva').checked ? 1 + PRECIOS.ivaPct / 100 : 1, P = PRECIOS[forma];
    const a = P.pago * f, b = P.cuota * f;
    $('#e1').textContent = TXT[forma][0]; $('#e2').textContent = TXT[forma][1]; $('#pPara').textContent = TXT[forma][2];
    if (animar) { tween($('#m1'), v1, a, 520, Q); tween($('#m2'), v2, b, 520, Q); } else { $('#m1').textContent = Q(a); $('#m2').textContent = Q(b); }
    v1 = a; v2 = b;
    $('#incl').innerHTML = INCLUYE[forma].map((t, i) => `<li style="--i:${i}">${esc(t)}</li>`).join('');
    const m = PRECIOS.anios * 12, tot = (P.pago + P.cuota * m) * f;
    $('#cinco').textContent = `A ${PRECIOS.anios} años suma ${Q(tot)}${forma === 'mensual' ? ', con el servidor incluido.' : ', más el servidor que el Patronato paga directo.'}`;
  }
  function elegir(k) { forma = k; const seg = $('.seg'); seg.toggleAttribute('data-b', k === 'compra'); $('#sMen').setAttribute('aria-pressed', k === 'mensual'); $('#sCom').setAttribute('aria-pressed', k === 'compra'); precios(); }
  $('#sMen').onclick = () => elegir('mensual'); $('#sCom').onclick = () => elegir('compra'); $('#iva').onchange = () => precios();
  precios(false);
  alBajar();
})();
