/* Piezas de pantalla: formatos, tablas, hojas apiladas, avisos y buscadores. */
(function (g) {
  const U = {};
  U.esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const e = U.esc;
  const fmt = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const fmt0 = new Intl.NumberFormat('en-US');
  U.Q = n => (n < 0 ? '-' : '') + 'Q ' + fmt.format(Math.abs(n || 0));
  U.n = n => fmt0.format(n || 0);
  const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  U.MESES_L = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  U.fecha = t => { if (!t) return '—'; const d = new Date(t); return `${String(d.getDate()).padStart(2, '0')} ${MESES[d.getMonth()]} ${d.getFullYear()}`; };
  U.hora = t => { const d = new Date(t); return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; };
  U.fh = t => `${U.fecha(t)}, ${U.hora(t)}`;
  U.iso = t => { const d = new Date(t); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
  U.deIso = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d).getTime(); };
  U.norm = s => String(s == null ? '' : s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  U.ic = (n, c = '') => `<svg class="ic ${c}" viewBox="0 0 24 24" aria-hidden="true">${(window.ICONOS || {})[n] || ''}</svg>`;
  U.et = (t, c = '') => `<span class="et ${c}">${e(t)}</span>`;
  U.ojo = (a, id, t = 'Ver documento') => `<button class="ojo" data-a="${a}" data-id="${e(id)}" aria-label="${e(t)}" title="${e(t)}">${U.ic('eye')}</button>`;
  U.lapiz = (a, id, t = 'Editar') => `<button class="lapiz" data-a="${a}" data-id="${e(id)}" aria-label="${e(t)}" title="${e(t)}">${U.ic('pencil')}</button>`;
  U.diasPara = (t, base) => Math.ceil((t - base) / 86400000);

  /* Tabla con paginación. En teléfono cada fila se vuelve ficha con sus etiquetas. */
  U.tabla = function (o) {
    const por = o.por || 25, total = o.filas.length, pag = Math.min(o.pag || 0, Math.max(0, Math.ceil(total / por) - 1));
    const filas = o.filas.slice(pag * por, pag * por + por);
    if (!total) return `<div class="tabla-marco"><div class="vacio"><b>${e(o.vacioT || 'Nada por aquí')}</b>${e(o.vacio || '')}</div></div>`;
    const cab = o.cols.map(c => `<th class="${c.der ? 'der' : ''}" scope="col">${c.t ? e(c.t) : '<span class="sr">Acciones</span>'}</th>`).join('');
    const cuerpo = filas.map(r => {
      const a = o.clic ? ` class="clic" data-a="${o.clic}" data-id="${e(o.id ? o.id(r) : r.id)}" tabindex="0"` : '';
      return `<tr${a}>` + o.cols.map((c, i) => `<td class="${c.der ? 'der' : ''} ${i === 0 ? 'prim' : ''} ${c.cls || ''}"${c.t && i ? ` data-l="${e(c.t)}"` : ''}>${c.h(r)}</td>`).join('') + '</tr>';
    }).join('');
    const pie = o.pie ? `<tfoot><tr>${o.pie}</tr></tfoot>` : '';
    const nav = total > por ? `<div class="pagina"><span class="num">${U.n(pag * por + 1)}–${U.n(Math.min(total, pag * por + por))} de ${U.n(total)}</span><span class="acciones"><button class="btn chico" data-a="pag" data-id="${o.nombre || 't'}|${pag - 1}" ${pag ? '' : 'disabled'}>Anterior</button><button class="btn chico" data-a="pag" data-id="${o.nombre || 't'}|${pag + 1}" ${(pag + 1) * por < total ? '' : 'disabled'}>Siguiente</button></span></div>` : (o.contar === false ? '' : `<div class="pagina"><span class="num">${U.n(total)} ${total === 1 ? 'registro' : 'registros'}</span></div>`);
    return `<div class="tabla-marco"><table class="t"><thead><tr>${cab}</tr></thead><tbody>${cuerpo}</tbody>${pie}</table>${nav}</div>`;
  };
  /* Dónde va un proceso: pasos hechos, el actual y lo que falta */
  U.flujo = (pasos, n) => `<ol class="flujo" aria-label="Avance">${pasos.map((t, i) => `<li class="${i < n ? 'hecho' : i === n ? 'ahora' : ''}"><i>${i < n ? U.ic('check') : i + 1}</i><span>${e(t)}</span></li>`).join('')}</ol>`;
  U.tabs = (items, activo, ruta) => `<div class="tabs" role="tablist">${items.map(t => `<a role="tab" href="#/${ruta}/${t.id}" aria-selected="${t.id === activo}">${e(t.t)}${t.n ? `<span class="cuenta">${U.n(t.n)}</span>` : ''}</a>`).join('')}</div>`;
  U.chips = (items, activo, a) => `<div class="chips">${items.map(([id, t]) => `<button class="chip" data-a="${a}" data-id="${e(id)}" aria-pressed="${id === activo}">${e(t)}</button>`).join('')}</div>`;
  U.busca = (id, val, ph) => `<div class="campo-b">${U.ic('search')}<input type="search" id="${id}" value="${e(val || '')}" placeholder="${e(ph)}" aria-label="${e(ph)}" data-filtro="${id}"></div>`;
  U.mesSel = (id, val, meses) => `<select id="${id}" data-filtro="${id}" aria-label="Mes" style="width:auto">${meses.map(m => `<option value="${m.k}" ${m.k === val ? 'selected' : ''}>${m.t}</option>`).join('')}</select>`;

  /* Hojas apiladas: una abierta desde otra queda encima; Esc cierra solo la de arriba. */
  const pila = [];
  U.pila = pila;
  let zi = 1000;
  U.hoja = function (o) {
    const capa = document.createElement('div');
    capa.className = 'capa' + (o.dialogo ? ' dialogo' : ''); capa.style.zIndex = ++zi; if (o.area != null) capa.style.setProperty('--a', o.area);
    capa.innerHTML = `<section class="hoja" role="dialog" aria-modal="true" aria-label="${e(o.titulo)}" style="--ancho:${o.ancho || 560}px">
      <header class="hoja-cab"><div><h2>${e(o.titulo)}</h2>${o.sub ? `<p>${e(o.sub)}</p>` : ''}</div><button class="ojo" data-cerrar aria-label="Cerrar">${U.ic('x')}</button></header>
      <div class="hoja-cuerpo">${o.cuerpo || ''}</div>${o.pie ? `<footer class="hoja-pie">${o.pie}</footer>` : ''}</section>`;
    const h = { el: capa, cuerpo: capa.querySelector('.hoja-cuerpo'), acciones: o.acciones || {}, cerrar() { U.cerrarHoja(h); }, alCerrar: o.alCerrar };
    capa.addEventListener('mousedown', ev => { if (ev.target === capa) h.cerrar(); });
    capa.addEventListener('click', ev => {
      if (ev.target.closest('[data-cerrar]')) return h.cerrar();
      const b = ev.target.closest('[data-a]'); if (!b || !capa.contains(b)) return;
      const fn = h.acciones[b.dataset.a]; if (fn) { ev.preventDefault(); ev.stopPropagation(); fn(b.dataset.id, b, ev); }
    });
    document.body.appendChild(capa); document.body.style.overflow = 'hidden'; pila.push(h);
    const f = capa.querySelector('[autofocus], .hoja-cuerpo input:not([type=hidden]), .hoja-cuerpo select, .hoja-cuerpo textarea');
    if (f && matchMedia('(pointer: fine)').matches) f.focus({ preventScroll: true });
    if (o.alAbrir) o.alAbrir(h);
    return h;
  };
  U.cerrarHoja = function (h) {
    const i = pila.indexOf(h); if (i < 0) return;
    pila.splice(i, 1); h.el.classList.add('sale');
    setTimeout(() => h.el.remove(), 160);
    if (!pila.length) document.body.style.overflow = '';
    if (h.alCerrar) h.alCerrar();
  };
  addEventListener('keydown', ev => { if (ev.key === 'Escape' && pila.length) pila[pila.length - 1].cerrar(); });

  U.confirmar = o => new Promise(res => {
    let dado = false;
    const h = U.hoja({ titulo: o.titulo, dialogo: true, cuerpo: `<p>${e(o.texto || '')}</p>`, pie: `<button class="btn" data-a="no">${e(o.no || 'Cancelar')}</button><button class="btn ${o.peligro ? 'peligro' : 'pri'}" data-a="si" autofocus>${e(o.si || 'Confirmar')}</button>`, acciones: { si() { dado = true; res(true); h.cerrar(); }, no() { h.cerrar(); } }, alCerrar() { if (!dado) res(false); } });
  });

  U.aviso = function (txt, tipo) {
    let c = document.querySelector('.avisos');
    if (!c) { c = document.createElement('div'); c.className = 'avisos'; c.setAttribute('role', 'status'); c.setAttribute('aria-live', 'polite'); document.body.appendChild(c); }
    const a = document.createElement('div'); a.className = 'aviso ' + (tipo === 'mal' ? 'mal' : '');
    a.innerHTML = U.ic(tipo === 'mal' ? 'circle-alert' : 'circle-check') + `<span>${e(txt)}</span>`;
    c.appendChild(a);
    setTimeout(() => { a.classList.add('sale'); setTimeout(() => a.remove(), 170); }, tipo === 'mal' ? 6500 : 3200);
  };

  /* Envía una operación y avisa si otro dispositivo se adelantó */
  U.hacer = async function (tipo, d, ok) {
    const r = await Motor.enviar(tipo, d);
    if (r.ok) { if (r.aviso) U.aviso(r.aviso); else if (ok) U.aviso(ok === true ? r.txt : ok); }
    else U.aviso(r.error, 'mal');
    return r;
  };

  /* Selector con buscador para listas largas */
  U.selector = function (caja, o) {
    caja.classList.add('selector');
    caja.innerHTML = `<input type="search" placeholder="${e(o.ph || 'Escriba para buscar')}" aria-label="${e(o.ph || 'Buscar')}" value="${e(o.valor || '')}"><div class="opciones oculto"></div>`;
    const inp = caja.querySelector('input'), lista = caja.querySelector('.opciones');
    let ultimo = [];
    const pintar = () => {
      ultimo = o.buscar(U.norm(inp.value.trim())).slice(0, o.max || 30);
      lista.innerHTML = ultimo.length ? ultimo.map((x, i) => `<button type="button" class="opcion" data-i="${i}">${e(x.txt)}${x.sub ? `<span>${e(x.sub)}</span>` : ''}</button>`).join('') : `<div class="opcion mudo">Sin resultados</div>`;
      lista.classList.remove('oculto');
    };
    inp.addEventListener('input', pintar);
    inp.addEventListener('focus', () => { if (o.alEnfocar !== false) pintar(); });
    lista.addEventListener('click', ev => {
      const b = ev.target.closest('.opcion[data-i]'); if (!b) return;
      ev.stopPropagation();
      const x = ultimo[+b.dataset.i]; lista.classList.add('oculto');
      if (o.limpiar === false) inp.value = x.txt; else inp.value = '';
      o.alElegir(x);
    });
    inp.addEventListener('keydown', ev => { if (ev.key === 'Enter') { ev.preventDefault(); const b = lista.querySelector('.opcion[data-i]'); if (b) b.click(); } });
    return { input: inp, cerrar() { lista.classList.add('oculto'); } };
  };

  U.csv = function (nombre, filas) {
    const t = filas.map(r => r.map(c => { const s = String(c == null ? '' : c); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; }).join(',')).join('\r\n');
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['﻿' + t], { type: 'text/csv;charset=utf-8' })); a.download = nombre + '.csv'; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    U.aviso('Archivo descargado: ' + nombre + '.csv');
  };
  U.barras = function (datos, o = {}) {
    const W = 720, H = 190, pad = 22, max = Math.max(...datos.map(d => d.v), 1), bw = (W - 8) / datos.length;
    const tope = Math.ceil(max / 10000) * 10000 || max;
    const barra = datos.map((d, i) => { const h = Math.max(1, (d.v / tope) * (H - pad - 8)); return `<rect x="${(i * bw + 1.5).toFixed(1)}" y="${(H - pad - h).toFixed(1)}" width="${(bw - 3).toFixed(1)}" height="${h.toFixed(1)}" rx="1.5" fill="${d.hoy ? 'var(--alerta)' : d.fin ? 'var(--linea-f)' : 'var(--pino-3)'}"><title>${e(d.t)}: ${U.Q(d.v)}</title></rect>`; }).join('');
    const et = datos.map((d, i) => (i % (o.cada || 5) === 0 ? `<text x="${(i * bw + bw / 2).toFixed(1)}" y="${H - 6}" text-anchor="middle">${e(d.c)}</text>` : '')).join('');
    return `<svg class="barras" viewBox="0 0 ${W} ${H}" role="img" aria-label="${e(o.alt || 'Gráfica')}"><line x1="0" x2="${W}" y1="${H - pad}" y2="${H - pad}" stroke="var(--linea-f)"/><text x="0" y="12">${U.Q(tope).replace('.00', '')}</text>${barra}${et}</svg>`;
  };
  g.U = U;
})(window);
