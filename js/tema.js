/* Colores: por defecto un color por área; al elegir un tono, todo el diseño pasa a ese tono. */
(function (g) {
  const TONOS = {
    menta: { nombre: 'Menta', h: 165 }, cielo: { nombre: 'Cielo', h: 235 }, lavanda: { nombre: 'Lavanda', h: 295 },
    rosa: { nombre: 'Rosa', h: 355 }, durazno: { nombre: 'Durazno', h: 50 }, salvia: { nombre: 'Salvia', h: 125 },
  };
  const CLAVE = 'hhg.tono2';
  const leer = () => { try { const v = localStorage.getItem(CLAVE); return v == null || v === 'areas' ? null : +v; } catch (e) { return null; } };
  function aplicar(t) {
    const r = document.documentElement;
    if (t == null) { delete r.dataset.tono; r.style.removeProperty('--tono'); r.style.setProperty('--h', 235); }
    else { r.dataset.tono = t; r.style.setProperty('--tono', t); r.style.setProperty('--h', t); }
    dispatchEvent(new Event('tema'));
  }
  g.Tema = { TONOS, fijo: leer, actual: () => { const t = leer(); return t == null ? 235 : t; }, aplicar, guardar(t) { try { localStorage.setItem(CLAVE, t == null ? 'areas' : String(t)); } catch (e) { } aplicar(t); } };
  aplicar(leer());
  addEventListener('storage', ev => { if (ev.key === CLAVE) aplicar(leer()); }); // el sistema abierto en otra pantalla cambia junto
})(window);
