/* Dibujos del hospital: edificios en maqueta 3D y avatares por puesto. Todo es SVG hecho por código. */
(function (g) {
  const D = {};
  const K = .866, S = .5;
  const P = (x, y, z = 0) => [(x - y) * K, (x + y) * S - z];
  const pts = a => a.map(p => p.map(n => n.toFixed(1)).join(',')).join(' ');
  const pol = (a, f) => `<polygon points="${pts(a)}" fill="${f}"/>`;
  const col = (h, l, c = .03) => `oklch(${l}% ${c} ${h})`;
  const PARED = { top: l => col(250, l, .008) };

  /* Caja con sus tres caras visibles. t: techo, a: cara izquierda, b: cara derecha */
  function caja(x, y, z, w, d, h, o = {}) {
    const hue = o.hue != null ? o.hue : 250, c = o.c != null ? o.c : .01, L = o.l != null ? o.l : 96;
    const t = o.techo || col(hue, L - 6, c + .03);
    return pol([P(x, y + d, z), P(x + w, y + d, z), P(x + w, y + d, z + h), P(x, y + d, z + h)], o.a || col(hue, L - 9, c))
      + pol([P(x + w, y + d, z), P(x + w, y, z), P(x + w, y, z + h), P(x + w, y + d, z + h)], o.b || col(hue, L - 19, c))
      + pol([P(x, y, z + h), P(x + w, y, z + h), P(x + w, y + d, z + h), P(x, y + d, z + h)], t);
  }
  const qa = (x0, x1, z0, z1, y, f) => pol([P(x0, y, z0), P(x1, y, z0), P(x1, y, z1), P(x0, y, z1)], f); // cara izquierda
  const qb = (y0, y1, z0, z1, x, f) => pol([P(x, y0, z0), P(x, y1, z0), P(x, y1, z1), P(x, y0, z1)], f); // cara derecha
  function ventanas(x, y, w, d, pisos, alto, hue, nA, nB, z0 = 8) {
    let s = ''; const f1 = col(hue, 42, .05), f2 = col(hue, 34, .05);
    for (let p = 0; p < pisos; p++) {
      const z = z0 + p * alto, zt = z + alto * .58;
      for (let i = 0; i < nA; i++) { const a = x + (i + .22) * w / nA, b = x + (i + .78) * w / nA; s += qa(a, b, z, zt, y + d, f1); }
      for (let i = 0; i < nB; i++) { const a = y + d - (i + .22) * d / nB, b = y + d - (i + .78) * d / nB; s += qb(a, b, z, zt, x + w, f2); }
    }
    return s;
  }
  const cruz = (x, z, y, t, f) => qa(x - t / 2, x + t / 2, z - t * 1.5, z + t * 1.5, y, f) + qa(x - t * 1.5, x + t * 1.5, z - t / 2, z + t / 2, y, f);
  function letrero(x, y, z, hue, rojo) {
    const f = rojo ? 'oklch(50% .15 25)' : col(hue, 42, .09);
    return caja(x, y, z, 26, 3, 26, { l: 100, c: 0, techo: col(250, 92, .004) }) + cruz(x + 13, z + 13, y + 3, 5, f);
  }
  const arbol = (x, y, s = 1) => { const [a, b] = P(x, y); return `<ellipse cx="${a}" cy="${b + 1}" rx="${9 * s}" ry="${4.5 * s}" fill="oklch(35% .02 150 / .14)"/><rect x="${a - 1.3}" y="${b - 13 * s}" width="2.6" height="${13 * s}" fill="oklch(42% .04 60)"/><circle cx="${a}" cy="${b - 19 * s}" r="${11 * s}" fill="oklch(58% .07 150)"/><circle cx="${a - 3 * s}" cy="${b - 22 * s}" r="${6 * s}" fill="oklch(66% .07 150)"/>`; };
  const sombra = (w, d) => pol([P(0, 0), P(w + 12, 0), P(w + 12, d + 12), P(0, d + 12)], 'oklch(35% .02 250 / .1)');

  const EDIF = {
    em: h => sombra(110, 74) + caja(0, 0, 0, 110, 74, 36, { hue: h }) + ventanas(0, 0, 110, 74, 1, 24, h, 3, 3)
      + qa(40, 70, 0, 22, 74, col(h, 34, .05)) + caja(26, 74, 22, 58, 28, 4, { hue: h, techo: col(h, 62, .12) })
      + caja(30, 98, 0, 3, 3, 22, { hue: h }) + caja(78, 98, 0, 3, 3, 22, { hue: h })
      + caja(44, 104, 0, 34, 15, 15, { l: 100, c: 0, techo: col(250, 94, .004) }) + qa(44, 78, 6, 9, 119, col(h, 52, .13))
      + letrero(42, 30, 36, h, true),
    ad: h => sombra(96, 82) + caja(0, 0, 0, 96, 82, 44, { hue: h }) + ventanas(0, 0, 96, 82, 2, 19, h, 4, 3)
      + qa(34, 62, 0, 24, 82, col(h, 80, .04)) + caja(26, 82, 24, 44, 16, 3, { hue: h, techo: col(h, 58, .1) }),
    ce: h => sombra(92, 74) + caja(0, 0, 0, 92, 74, 66, { hue: h }) + ventanas(0, 0, 92, 74, 3, 20, h, 4, 3)
      + caja(12, 14, 66, 30, 24, 7, { hue: h }),
    lb: h => sombra(86, 74) + caja(0, 0, 0, 86, 74, 46, { hue: h }) + ventanas(0, 0, 86, 74, 2, 19, h, 3, 3)
      + caja(12, 12, 46, 22, 20, 10, { hue: h, l: 88 }) + caja(48, 28, 46, 16, 16, 15, { hue: h, techo: col(h, 62, .1) }),
    fx: h => sombra(88, 72) + caja(0, 0, 0, 88, 72, 38, { hue: h })
      + qa(8, 80, 5, 25, 72, col(h, 72, .05)) + qa(40, 48, 0, 25, 72, col(h, 96, .01)) + qb(62, 12, 8, 26, 88, col(h, 40, .05))
      + caja(4, 72, 25, 80, 12, 3, { hue: h, techo: col(h, 60, .1) }) + letrero(30, 32, 38, h),
    bc: h => sombra(124, 86) + caja(0, 0, 0, 124, 86, 42, { hue: h, techo: col(h, 78, .07) })
      + qa(14, 50, 0, 28, 86, col(h, 58, .04)) + qa(68, 104, 0, 28, 86, col(h, 58, .04))
      + [6, 13, 20].map(z => qa(14, 50, z, z + 1, 86, col(h, 46, .04)) + qa(68, 104, z, z + 1, 86, col(h, 46, .04))).join('')
      + qb(70, 14, 28, 34, 124, col(h, 44, .05))
      + caja(52, 96, 0, 14, 14, 13, { hue: h, l: 80, c: .05 }) + caja(70, 98, 0, 13, 13, 11, { hue: h, l: 84, c: .05 }) + caja(56, 100, 13, 10, 10, 9, { hue: h, l: 88, c: .05 }),
    qx: h => sombra(112, 88) + caja(0, 0, 0, 112, 88, 46, { hue: h }) + ventanas(0, 0, 112, 88, 1, 30, h, 4, 3, 12)
      + caja(18, 16, 46, 72, 52, 15, { hue: h }) + ventanas(18, 16, 72, 52, 1, 10, h, 4, 2, 50) + caja(40, 30, 61, 26, 22, 6, { hue: h, techo: col(h, 62, .1) }),
    en: h => sombra(112, 76) + caja(0, 0, 0, 112, 76, 100, { hue: h }) + ventanas(0, 0, 112, 76, 5, 18, h, 6, 4)
      + caja(30, 20, 100, 52, 36, 3, { hue: h, techo: col(h, 62, .08) }) + letrero(44, 24, 103, h, true),
    of: h => sombra(70, 62) + caja(0, 0, 0, 70, 62, 76, { hue: h }) + ventanas(0, 0, 70, 62, 4, 17, h, 3, 3),
    pa: h => EDIF.en(h),
  };
  /* Tamaño de cada dibujo para que quepa y quede centrado */
  const CAJA = { em: [-120, -80, 240, 215], ad: [-100, -62, 210, 190], ce: [-90, -86, 190, 210], lb: [-85, -74, 175, 170], fx: [-90, -66, 190, 165], bc: [-110, -62, 240, 180], qx: [-105, -82, 215, 195], en: [-90, -120, 220, 240], of: [-70, -90, 150, 190], pa: [-90, -120, 220, 240] };
  /* Niveles de seguridad, y qué protege cada área */
  D.NIVELES = [
    ['Entrada', 'Cada persona entra con su propia cuenta. Se activa con contraseña segura y doble verificación.', 'Al implementar'],
    ['Permisos por puesto', 'Cada puesto ve y hace solo lo suyo. Al implementar, la base de datos también lo hace cumplir.', 'En el demo'],
    ['Reglas que no se saltan', 'Nadie aprueba lo suyo, no se vende lo vencido ni lo que no hay, y los controlados exigen receta.', 'En el demo'],
    ['Bitácora sin borrar', 'Queda quién, cuándo y desde qué dispositivo. Lo rechazado también se registra.', 'En el demo'],
    ['Datos protegidos', 'Conexión cifrada, información cifrada en el servidor y respaldos diarios.', 'Al implementar'],
  ];
  D.SEG = {
    fx: ['Máxima', ['Controlados solo con receta y médico', 'Lo vencido o bloqueado no se vende', 'Caja propia con arqueo a ciegas', 'Cada venta queda con puesto y hora']],
    bc: ['Máxima', ['Solo Bodega ingresa mercadería', 'Conteo a ciegas: quien cuenta no ve el sistema', 'Ajustes con aprobación de otra persona', 'Una factura no entra dos veces']],
    ad: ['Alta', ['Cada cajero responde por su turno', 'Una cuenta no se cobra dos veces', 'Arqueo a ciegas al cerrar', 'Un DPI no se repite en dos expedientes']],
    em: ['Alta', ['Datos del paciente solo para quien lo atiende', 'Cada cargo queda con quién lo hizo', 'Controlados exigen receta']],
    ce: ['Estándar', ['Datos del paciente por puesto', 'Cada cargo queda en la bitácora']],
    lb: ['Estándar', ['Reactivos con lote y vencimiento', 'Datos del paciente por puesto']],
    qx: ['Máxima', ['Consumo registrado por cirugía', 'Anestésicos controlados con receta', 'Lo vencido no sale de bodega']],
    en: ['Alta', ['Pedidos con puesto y hora', 'Medicina ligada a la cuenta del paciente', 'Devoluciones regresan a su lote']],
  };

  /* Piezas para los interiores */
  Object.assign(D, { P, caja, pol, qa, qb, col });
  D.centro = id => { const c = SITIO.find(x => x[0] === id); return P(c[1] + 44, c[2] + 36, 20); };
  const UNIF = { direccion: 'oklch(32% .02 250)', admision: 'oklch(52% .09 300)', caja: 'oklch(42% .1 245)', farmacia: 'oklch(95% .006 250)', enfermeria: 'oklch(56% .08 200)', quirofano: 'oklch(52% .07 165)', bodega: 'oklch(66% .15 55)', compras: 'oklch(90% .03 85)', contabilidad: 'oklch(92% .01 275)', social: 'oklch(62% .08 350)', auditoria: 'oklch(52% .012 250)', paciente: 'oklch(82% .03 235)', seguridad: 'oklch(30% .05 255)' };
  /* Figura de cuerpo entero, de pie, sin rostro ni manos */
  D.mini = function (rol, i = 0) {
    const a = AV[rol], piel = PIEL[a ? a[0] : 'abc'[i % 3]], u = UNIF[rol] || UNIF.paciente;
    const pelo = [PELO.n, PELO.c, PELO.g][i % 3];
    const gorro = rol === 'seguridad' ? `<path d="M-6 -29a6 6 0 0 1 12 0z" fill="oklch(26% .05 255)"/><path d="M-7.500 -29.500h15v1.800h-15z" fill="oklch(20% .04 255)"/>` : rol === 'quirofano' ? `<path d="M-5.500 -29a5.500 5.500 0 0 1 11 0z" fill="oklch(46% .08 165)"/>` : rol === 'bodega' ? `<path d="M-6 -29a6 6 0 0 1 12 0zM-7.500 -29.800h15v1.600h-15z" fill="oklch(80% .13 90)"/>` : `<path d="M-5.500 -28.500a5.500 5.500 0 0 1 11 0c-2-1.500-9-1.500-11 0z" fill="${pelo}"/>`;
    return `<ellipse cx="0" cy="0" rx="8" ry="4" fill="oklch(30% .02 250 / .2)"/><rect x="-4.500" y="-9" width="3.800" height="9" rx="1.500" fill="oklch(30% .02 250)"/><rect x=".7" y="-9" width="3.800" height="9" rx="1.500" fill="oklch(30% .02 250)"/><path d="M-6.500 -8v-9c0-3 2.500-5 6.500-5s6.500 2 6.500 5v9z" fill="${u}" stroke="oklch(30% .02 250 / .22)" stroke-width=".6"/><circle cx="0" cy="-27.500" r="5.400" fill="${piel}"/>${gorro}`;
  };
  function estante(x, y, w, hue) { let s = caja(x, y, 0, w, 9, 30, { hue: 60, l: 78, c: .03 }); [7, 15, 23].forEach((z, k) => { for (let i = 0; i * 9 + 3 < w - 4; i++) s += qa(x + i * 9 + 3, x + i * 9 + 8, z, z + 6, y + 9, col((hue + i * 40 + k * 25) % 360, 66, .08)); }); return s; }
  D.mueble = function ([t, x, y, w = 40, o = {}], hue) {
    if (t === 'mostrador') return caja(x, y, 0, w, 13, 15, { hue, c: .02, techo: col(60, 78, .05) });
    if (t === 'estante') return estante(x, y, w, hue);
    if (t === 'cama') { const l = o.llena; return caja(x, y, 0, 20, 36, 7, { l: 100, c: 0, techo: l ? col(hue, 74, .07) : col(250, 96, .004) }) + caja(x + 3, y + 2, 7, 14, 8, 2.500, { l: 100, c: 0, techo: col(250, 99, .002) }); }
    if (t === 'silla') return caja(x, y, 0, 7, 7, 6, { hue, l: 76, c: .05 }) + caja(x, y, 6, 7, 2, 7, { hue, l: 72, c: .05 });
    if (t === 'frio') return caja(x, y, 0, 16, 14, 32, { l: 100, c: 0, techo: col(235, 92, .02) }) + qa(x + 2, x + 14, 4, 28, y + 14, col(235, 84, .05));
    if (t === 'caja') return caja(x, y, 0, 16, 14, 22, { hue: 250, l: 54, c: .02 }) + qa(x + 6, x + 10, 10, 13, y + 14, col(250, 80, .01));
    if (t === 'equipo') return caja(x, y, 0, 13, 13, 24, { l: 94, c: 0 }) + qa(x + 2, x + 11, 12, 21, y + 13, col(hue, 40, .07));
    if (t === 'escritorio') return caja(x, y, 0, w, 16, 11, { hue: 60, l: 80, c: .04 }) + caja(x + 6, y + 3, 11, 12, 2, 9, { hue: 250, l: 34, c: .02 });
    if (t === 'quirurgica') return caja(x, y, 0, 16, 36, 12, { hue, l: 88, c: .03 }) + `<ellipse cx="${P(x + 8, y + 18, 44)[0]}" cy="${P(x + 8, y + 18, 44)[1]}" rx="13" ry="6.500" fill="oklch(95% .02 90)" stroke="oklch(60% .02 250)"/>`;
    if (t === 'pila') return caja(x, y, 0, 15, 15, 13, { hue: 55, l: 80, c: .05 }) + caja(x + 18, y + 1, 0, 13, 13, 11, { hue: 55, l: 84, c: .05 }) + caja(x + 3, y + 3, 13, 11, 11, 9, { hue: 55, l: 88, c: .05 });
    return '';
  };

  D.HUE = { em: 15, ad: 245, ce: 300, lb: 190, fx: 155, bc: 55, qx: 275, en: 200, of: 85 };
  const fijo = () => (g.Tema ? g.Tema.fijo() : null);
  D.edificio = function (k, h, cl = '') { const f = fijo(), hue = f != null ? f : h != null ? h : D.HUE[k] || 235, v = CAJA[k]; return `<svg class="edif ${cl}" viewBox="${v.join(' ')}" aria-hidden="true">${EDIF[k](hue)}</svg>`; };

  /* Avatares: busto con uniforme, sin rostro detallado */
  const PIEL = { a: 'oklch(68% .08 55)', b: 'oklch(60% .08 50)', c: 'oklch(74% .07 60)' };
  const PELO = { n: 'oklch(24% .02 50)', c: 'oklch(32% .04 50)', g: 'oklch(52% .01 250)' };
  const cuerpo = c => `<path d="M12 100C12 76 28 67 48 67s36 9 36 33z" fill="${c}"/>`;
  const cuello = p => `<path d="M41 50h14v16c0 4-3 7-7 7s-7-3-7-7z" fill="${p}"/><path d="M41 56c4 3 10 3 14 0v-6H41z" fill="oklch(30% .03 50 / .18)"/>`;
  const cabeza = p => `<ellipse cx="48" cy="38" rx="15" ry="17.5" fill="${p}"/><path d="M48 20.5c8.3 0 15 7.800 15 17.500S56.300 55.500 48 55.500c5-5 7-11 7-17.500s-2-13-7-17.500z" fill="oklch(30% .03 50 / .13)"/>`;
  const corto = c => `<path d="M32.500 38C31 24 39 17 48 17s17 7 15.500 21c-1-6-4-10-7-11-5 2-14 2-18 1-3 2-5 6-6 10z" fill="${c}"/>`;
  const largo = c => `<path d="M31 62c-4-12-3-26 2-34 3-7 9-11 15-11s12 4 15 11c5 8 6 22 2 34-2-2-3-4-3-8 1-9 0-18-5-24-6 3-14 3-19 1-5 6-6 14-5 23 0 4-1 6-2 8z" fill="${c}"/>`;
  const chongo = c => `<circle cx="48" cy="14" r="6.500" fill="${c}"/>` + corto(c);
  const lentes = `<g fill="none" stroke="oklch(25% .02 250)" stroke-width="1.600"><circle cx="41.500" cy="38" r="5"/><circle cx="54.500" cy="38" r="5"/><path d="M46.500 38h3"/></g>`;
  const AV = {
    direccion: ['a', p => cuerpo('oklch(32% .02 250)') + cuello(p) + `<path d="M40 67l8 17 8-17-8 4z" fill="oklch(96% .004 250)"/><path d="M46 71h4l1.500 14-3.500 5-3.500-5z" fill="oklch(40% .1 25)"/>` + cabeza(p) + corto(PELO.g)],
    admision: ['c', p => cuerpo('oklch(52% .09 300)') + cuello(p) + `<path d="M40 67l8 11 8-11-8 3z" fill="oklch(90% .03 300)"/>` + cabeza(p) + largo(PELO.c) + `<path d="M31 38c0-22 34-22 34 0" fill="none" stroke="oklch(30% .02 250)" stroke-width="2.400"/><rect x="28" y="35" width="5.500" height="10" rx="2.500" fill="oklch(30% .02 250)"/><rect x="62.500" y="35" width="5.500" height="10" rx="2.500" fill="oklch(30% .02 250)"/>`],
    caja: ['b', p => cuerpo('oklch(90% .02 245)') + `<path d="M12 100C12 76 28 67 40 67l8 33zM84 100c0-24-16-33-28-33l-8 33z" fill="oklch(42% .1 245)"/>` + cuello(p) + `<rect x="58" y="80" width="13" height="8" rx="1.500" fill="oklch(97% .004 250)"/>` + cabeza(p) + corto(PELO.n)],
    farmacia: ['c', p => cuerpo('oklch(97% .004 250)') + `<path d="M41 67l7 20 7-20-7 3z" fill="oklch(50% .09 155)"/><path d="M41 67l7 20-12 13-6-30zM55 67l-7 20 12 13 6-30z" fill="oklch(90% .006 250)"/>` + cuello(p) + `<path d="M62 79h3v3h3v3h-3v3h-3v-3h-3v-3h3z" fill="oklch(46% .11 155)"/>` + cabeza(p) + chongo(PELO.n)],
    enfermeria: ['a', p => cuerpo('oklch(56% .08 200)') + `<path d="M40 67l8 13 8-13-8 3z" fill="oklch(46% .08 200)"/>` + cuello(p) + `<path d="M36 69c0 16 6 22 12 22s12-6 12-22" fill="none" stroke="oklch(25% .02 250)" stroke-width="2"/><circle cx="48" cy="92" r="3.500" fill="oklch(75% .01 250)"/>` + cabeza(p) + largo(PELO.n)],
    quirofano: ['b', p => cuerpo('oklch(52% .07 165)') + `<path d="M40 67l8 13 8-13-8 3z" fill="oklch(42% .07 165)"/>` + cuello(p) + cabeza(p) + `<path d="M32.500 36c-2-14 6-20 15.500-20s17.500 6 15.500 20c-9-5-22-5-31 0z" fill="oklch(50% .08 165)"/><path d="M34 42c9 2 19 2 28 0 0 9-5 15-14 15s-14-6-14-15z" fill="oklch(92% .02 200)"/><path d="M36 47h24M37 51h22" stroke="oklch(80% .02 200)" stroke-width="1"/>`],
    bodega: ['a', p => cuerpo('oklch(46% .03 250)') + `<path d="M26 74c4-4 10-6 14-7l3 33H26zM70 74c-4-4-10-6-14-7l-3 33h17z" fill="oklch(66% .15 55)"/><path d="M27 84h16M53 84h16" stroke="oklch(92% .02 90)" stroke-width="3"/>` + cuello(p) + cabeza(p) + `<path d="M31 34c0-12 7-19 17-19s17 7 17 19z" fill="oklch(80% .13 90)"/><rect x="28" y="32" width="40" height="4.500" rx="2" fill="oklch(72% .13 85)"/>`],
    compras: ['c', p => cuerpo('oklch(94% .02 85)') + cuello(p) + `<path d="M40 67l8 7 8-7-8 3z" fill="oklch(86% .03 85)"/><path d="M46 72h4l1.500 14-3.500 5-3.500-5z" fill="oklch(48% .09 75)"/>` + cabeza(p) + corto(PELO.c)],
    contabilidad: ['b', p => cuerpo('oklch(96% .006 275)') + cuello(p) + `<path d="M40 67l8 7 8-7-8 3z" fill="oklch(88% .01 275)"/><path d="M46 72h4l1.500 14-3.500 5-3.500-5z" fill="oklch(40% .09 275)"/>` + cabeza(p) + corto(PELO.n) + lentes],
    social: ['c', p => cuerpo('oklch(62% .08 350)') + `<path d="M40 67l8 18 8-18-8 3z" fill="oklch(95% .01 350)"/>` + cuello(p) + `<rect x="58" y="80" width="12" height="9" rx="1.500" fill="oklch(97% .004 250)"/>` + cabeza(p) + largo(PELO.c)],
    auditoria: ['a', p => cuerpo('oklch(52% .012 250)') + cuello(p) + `<path d="M40 67l8 16 8-16-8 4z" fill="oklch(96% .004 250)"/><path d="M46 71h4l1 13-3 4-3-4z" fill="oklch(32% .02 250)"/>` + cabeza(p) + corto(PELO.n) + lentes],
  };
  AV.seguridad = ['b', p => cuerpo('oklch(30% .05 255)') + `<path d="M40 67l8 12 8-12-8 3z" fill="oklch(24% .04 255)"/><path d="M60 78l6 2v6c0 3-3 5-6 6-3-1-6-3-6-6v-6z" fill="oklch(80% .12 90)"/>` + cuello(p) + cabeza(p) + `<path d="M31 32c0-11 8-17 17-17s17 6 17 17z" fill="oklch(26% .05 255)"/><path d="M28 31h40c1 3-2 5-6 5H34c-4 0-7-2-6-5z" fill="oklch(20% .04 255)"/><path d="M48 19l3 3-3 4-3-4z" fill="oklch(80% .12 90)"/>`];
  const FONDO = { seguridad: 255, direccion: 235, admision: 300, caja: 245, farmacia: 155, enfermeria: 200, quirofano: 165, bodega: 55, compras: 85, contabilidad: 275, social: 350, auditoria: 230 };
  let n = 0;
  D.avatar = function (rol, t = 40) {
    const a = AV[rol] || AV.auditoria, id = 'av' + (++n);
    return `<svg class="avatar" width="${t}" height="${t}" viewBox="0 0 96 96" aria-hidden="true"><defs><clipPath id="${id}"><circle cx="48" cy="48" r="48"/></clipPath></defs><g clip-path="url(#${id})"><rect width="96" height="96" fill="oklch(93% .03 ${fijo() != null ? fijo() : FONDO[rol] || 235})"/>${a[1](PIEL[a[0]])}</g></svg>`;
  };
  D.AV_ROLES = Object.keys(AV);

  /* El hospital completo visto desde arriba */
  const SITIO = [ // id, x, y, alto para la etiqueta, orden de atrás hacia adelante
    ['en', 40, 30, 116], ['qx', 200, 30, 74], ['bc', 370, 30, 58], ['ce', 40, 170, 86], ['lb', 200, 170, 66], ['fx', 330, 170, 58], ['em', 40, 300, 56], ['ad', 210, 300, 62],
  ];
  D.campus = function (tags) {
    const G = [[-10, -10], [510, -10], [510, 420], [-10, 420]];
    let s = pol(G.map(p => P(p[0], p[1], 0)), 'oklch(94% .02 150)') + pol([P(-10, 420), P(510, 420), P(510, 420, -12), P(-10, 420, -12)], 'oklch(86% .02 150)') + pol([P(510, 420), P(510, -10), P(510, -10, -12), P(510, 420, -12)], 'oklch(78% .02 150)');
    const via = (a, b, c, d) => pol([P(a, b), P(c, b), P(c, d), P(a, d)], 'oklch(97% .006 250)');
    s += via(-10, 140, 510, 158) + via(-10, 270, 510, 288) + via(170, -10, 188, 420) + via(320, -10, 338, 140);
    [[20, 150], [165, 20], [180, 130], [350, 150], [470, 130], [480, 260], [490, 400], [470, 300], [20, 400], [340, 400], [190, 410], [10, 280]].forEach(([x, y], i) => { if (i % 1 === 0) s += arbol(x, y, .85 + (i % 3) * .1); });
    for (const [id, x, y] of SITIO) { const [a, b] = P(x, y); s += `<g class="bld" data-a="zona" data-id="${id}" transform="translate(${a.toFixed(1)} ${b.toFixed(1)})">${EDIF[id](fijo() != null ? fijo() : D.HUE[id])}</g>`; }
    for (const [id, x, y, alto] of SITIO) {
      const t = tags[id]; if (!t) continue;
      const [a, b] = P(x + 44, y + 36, alto + 20), w = Math.max(116, Math.max(t.t.length, t.v.length) * 7.4 + 46), av = t.rol ? D.avatar(t.rol, 30).replace('<svg ', `<svg x="${(a - w / 2 + 6).toFixed(1)}" y="${(b - 38).toFixed(1)}" `) : '';
      s += `<g class="pin ${t.alerta ? 'alerta' : ''}" data-a="zona" data-id="${id}" role="button" tabindex="0" aria-label="${t.t}: ${t.v}"><path d="M${a - 7} ${b - 3}L${a} ${b + 7}L${a + 7} ${b - 3}z" class="pin-f"/><rect x="${a - w / 2}" y="${b - 42}" width="${w}" height="40" rx="10" class="pin-f"/>${av}<text x="${a - w / 2 + 42}" y="${b - 25}" class="pin-t">${t.t}</text><text x="${a - w / 2 + 42}" y="${b - 10}" class="pin-v">${t.v}</text></g>`;
    }
    return `<svg class="campus" viewBox="-395 -128 900 660" role="img" aria-label="Maqueta del hospital con el estado de cada área">${s}</svg>`;
  };
  g.Dibujo = D;
})(window);
