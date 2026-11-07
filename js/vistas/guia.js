/* Guía paso a paso: lleva a la pantalla, señala la pieza y explica para qué sirve. */
(function (g) {
  const { U, App: A, Motor: M } = g; const e = U.esc;
  const G = {
    base: { t: 'Conocer el sistema', p: [
      ['#/inicio', '#menu', 'Su menú', 'Cada área tiene su color. Solo ve lo que le toca a su rol.'],
      ['#/inicio', '.vista .pend, .vista .seccion', 'Qué falta', 'Lo primero que debe atender está aquí. Toque una línea y va directo.'],
      ['#/inicio', '.buscar-global', 'Buscar', 'Encuentra pacientes, productos, cuentas y documentos desde cualquier pantalla.'],
    ] },
    farmacia: { t: 'Vender en el mostrador', r: ['farmacia'], p: [
      ['#/farmacia', '#mq', 'Escanee o escriba', 'Con lector, el producto entra solo. También puede buscar por nombre.'],
      ['#/farmacia', '.prods', 'Elija el producto', 'Muestra precio, existencia y vencimiento. Si se agotó, ofrece alternativas.'],
      ['#/farmacia', '.pos-der', 'La venta', 'Al cobrar baja del inventario y sale el documento, todo en un paso. F9 cobra.'],
    ] },
    pedidos: { t: 'Despachar pedidos de sala', r: ['farmacia'], p: [
      ['#/farmacia/pedidos', '.tabla-marco', 'Pedidos en vivo', 'Los urgentes van primero. Toque uno para despacharlo: se carga solo a la cuenta del paciente.'],
    ] },
    ingreso: { t: 'Ingresar mercadería', r: ['bodega'], p: [
      ['#/inventario/ingreso', '.flujo', 'Cuatro pasos', 'Siempre es igual: de dónde viene, sus datos, los productos y revisar.'],
      ['#/inventario/ingreso', '.origen', 'Elija el origen', 'Factura en mano, XML, Excel, orden de compra o donación.'],
    ] },
    traslado: { t: 'Enviar un traslado', r: ['bodega'], p: [
      ['#/inventario/traslados', '.tabla-marco', 'Traslados', 'Toque uno solicitado y envíelo. Quien lo pidió confirma cuando llega.'],
    ] },
    cobro: { t: 'Cobrar una cuenta', r: ['caja'], p: [
      ['#/caja', '.cifras', 'Su turno', 'Lo cobrado por forma de pago, al momento.'],
      ['#/caja', '.tabla-marco', 'Cuentas por cobrar', 'Toque Cobrar. Una cuenta no se puede cobrar dos veces, aunque otra caja lo intente.'],
    ] },
    pedir: { t: 'Pedir a farmacia', r: ['enfermeria', 'quirofano'], p: [
      ['#/sala', '.tabla-marco', 'Sus pacientes', 'Toque al paciente y elija Pedir a farmacia. Si es controlado, pide la receta.'],
    ] },
    admision: { t: 'Abrir una cuenta', r: ['admision'], p: [
      ['#/admision', '.filtros', 'Busque primero', 'Por nombre, DPI, NIT o teléfono, para no duplicar expedientes.'],
      ['#/admision', '.tabla-marco', 'Elija al paciente', 'Abra su ficha y toque Abrir cuenta.'],
    ] },
    orden: { t: 'Crear una orden de compra', r: ['compras'], p: [
      ['#/compras/ordenes', '.cabeza .btn.pri', 'Nueva orden', 'Elija proveedor y agregue lo que está bajo el mínimo con un toque.'],
      ['#/compras/solicitudes', '.tabla-marco', 'Solicitudes', 'Lo que piden las áreas se convierte en orden desde aquí.'],
    ] },
    tablero: { t: 'Leer el tablero', r: ['direccion'], p: [
      ['#/inicio', '.portada-t', 'El dinero de hoy', 'Comparado con el mismo día de la semana pasada, a la misma hora.'],
      ['#/inicio', '.pend', 'Lo que necesita su decisión', 'Compras grandes, ajustes y descuentos.'],
      ['#/mapa', '.plano', 'Mapa del hospital', 'Camas, quirófanos y áreas en vivo. Toque un área para ver el detalle.'],
      ['#/config/reglas', '.seccion', 'Sus reglas', 'Aquí decide quién aprueba y desde qué monto.'],
    ] },
    libros: { t: 'Revisar los libros', r: ['contabilidad'], p: [
      ['#/ley/ventas', '.cifras', 'Libro de ventas', 'Se arma solo. Exento, gravado e IVA de cada venta.'],
      ['#/ley/retenciones', '.vista .tabs', 'Todo lo demás', 'Compras, retenciones, inventario valorado, partidas y donaciones.'],
    ] },
  };
  A.guias = function () {
    const r = M.sesion.rol, l = Object.entries(G).filter(([, x]) => !x.r || x.r.includes(r));
    const h = U.hoja({ titulo: 'Guía', sub: 'Elija qué quiere aprender', ancho: 480, cuerpo: `<div class="pend">${l.map(([k, x]) => `<a class="fila-pend" href="#" data-a="ir" data-id="${k}"><span class="q">${e(x.t)}<span>${x.p.length} ${x.p.length === 1 ? 'paso' : 'pasos'}</span></span>${U.ic('chevron-right')}</a>`).join('')}</div>`, acciones: { ir(k) { h.cerrar(); iniciar(G[k]); } } });
  };
  let capa = null;
  function cerrar() { if (capa) capa.remove(); capa = null; removeEventListener('keydown', teclas); }
  function teclas(ev) { if (ev.key === 'Escape') { ev.stopPropagation(); cerrar(); } }
  function iniciar(gu) {
    cerrar(); let i = 0;
    capa = document.createElement('div'); capa.className = 'guia';
    capa.innerHTML = `<div class="guia-foco"></div><div class="guia-card" role="dialog" aria-label="Guía"><span class="peq mudo g-n"></span><h3 class="g-t"></h3><p class="g-d"></p><div class="acciones"><button class="btn nada" data-g="salir">Salir</button><button class="btn" data-g="atras">Atrás</button><button class="btn pri" data-g="sig">Siguiente</button></div></div>`;
    document.body.append(capa); addEventListener('keydown', teclas);
    const foco = capa.querySelector('.guia-foco'), card = capa.querySelector('.guia-card');
    async function ir() {
      const [ruta, sel, t, d] = gu.p[i];
      if (location.hash !== ruta) { location.hash = ruta; await new Promise(r => setTimeout(r, 260)); }
      const el = document.querySelector(sel);
      capa.querySelector('.g-n').textContent = `Paso ${i + 1} de ${gu.p.length}`;
      capa.querySelector('.g-t').textContent = t; capa.querySelector('.g-d').textContent = d;
      capa.querySelector('[data-g=atras]').style.display = i ? '' : 'none';
      capa.querySelector('[data-g=sig]').textContent = i === gu.p.length - 1 ? 'Terminar' : 'Siguiente';
      if (el && el.offsetParent !== null) {
        el.scrollIntoView({ block: 'center' });
        await new Promise(r => setTimeout(r, 60));
        const b = el.getBoundingClientRect(), y = Math.max(8, b.top - 6), hh = Math.min(b.height + 12, innerHeight - y - 8);
        foco.style.cssText = `display:block;left:${Math.max(4, b.left - 6)}px;top:${y}px;width:${Math.min(b.width + 12, innerWidth - 8)}px;height:${hh}px`;
        const abajo = innerHeight - (y + hh) > 210;
        card.style.top = innerWidth < 720 ? 'auto' : abajo ? `${y + hh + 12}px` : `${Math.max(12, y - 200)}px`;
        card.style.left = innerWidth < 720 ? '' : `${Math.min(Math.max(12, b.left), innerWidth - 392)}px`;
      } else { foco.style.display = 'none'; card.style.top = '30vh'; card.style.left = `${Math.max(12, innerWidth / 2 - 190)}px`; }
    }
    capa.addEventListener('click', ev => {
      const b = ev.target.closest('[data-g]'); if (!b) return;
      if (b.dataset.g === 'salir') return cerrar();
      if (b.dataset.g === 'atras') { i--; return ir(); }
      if (i === gu.p.length - 1) { cerrar(); return U.aviso('Guía terminada.'); }
      i++; ir();
    });
    ir();
  }
  A.iniciarGuia = k => iniciar(G[k]);
})(window);
