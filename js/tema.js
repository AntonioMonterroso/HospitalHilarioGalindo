/* Colores personalizables: un solo tono por tema. Lo comparten la propuesta y el sistema. */
(function (g) {
  const TONOS = {
    menta: { nombre: 'Menta', h: 165 }, cielo: { nombre: 'Cielo', h: 235 }, lavanda: { nombre: 'Lavanda', h: 295 },
    rosa: { nombre: 'Rosa', h: 355 }, durazno: { nombre: 'Durazno', h: 50 }, salvia: { nombre: 'Salvia', h: 125 },
  };
  const CLAVE = 'hhg.tono';
  const leer = () => { try { const v = localStorage.getItem(CLAVE); return v == null ? 165 : +v; } catch (e) { return 165; } };
  function aplicar(h) {
    const r = document.documentElement.style, c = (l, k) => `oklch(${l}% ${k} ${h})`;
    r.setProperty('--h', h);
    const t = { '--papel': c(97.6, .012), '--hoja': c(99.2, .005), '--hoja-2': c(95.2, .018), '--linea': c(89.5, .018), '--linea-f': c(80, .026), '--tinta': c(25, .03), '--tinta-2': c(42, .03), '--tinta-3': c(50, .026), '--pino': c(32, .055), '--pino-2': c(39, .065), '--pino-3': c(47, .08), '--pino-suave': c(93, .035), '--sobre-pino': c(95, .022), '--sobre-pino-2': c(83, .04) };
    for (const k in t) r.setProperty(k, t[k]);
  }
  g.Tema = { TONOS, actual: leer, aplicar, guardar(h) { try { localStorage.setItem(CLAVE, String(h)); } catch (e) { } aplicar(h); } };
  aplicar(leer());
  addEventListener('storage', ev => { if (ev.key === CLAVE) aplicar(leer()); }); // la vitrina de la propuesta cambia junto con ella
})(window);
