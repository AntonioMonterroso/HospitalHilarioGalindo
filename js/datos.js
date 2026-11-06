/* Catálogos de ejemplo. Todos los nombres, montos y documentos son ficticios. */
(function (g) {
  const C = {};

  C.HOSPITAL = {
    nombre: 'Patronato Pro-Salud del Hospital Hilario Galindo',
    corto: 'Hospital Hilario Galindo',
    lugar: 'San Felipe, Retalhuleu',
    nit: '0000000-0', // ejemplo: el real se configura al implementar
  };

  /* Bodegas y puntos de consumo */
  C.BODEGAS = [
    { id: 'BC', nombre: 'Bodega central', tipo: 'central' },
    { id: 'FX', nombre: 'Farmacia', tipo: 'farmacia' },
    { id: 'QX', nombre: 'Quirófano', tipo: 'servicio' },
    { id: 'EM', nombre: 'Emergencia', tipo: 'servicio' },
    { id: 'EN', nombre: 'Encamamiento', tipo: 'servicio' },
    { id: 'LB', nombre: 'Laboratorio', tipo: 'servicio' },
  ];

  /* Roles: qué pantallas y qué acciones tiene cada uno */
  C.ROLES = {
    direccion: { nombre: 'Dirección', desc: 'Junta y administración general. Ve todo y aprueba compras grandes.', vistas: ['inicio', 'mapa', 'cuentas', 'inventario', 'compras', 'ley', 'reportes', 'bitacora', 'usuarios', 'config'], acciones: ['lote.bloquear', 'oc.aprobar', 'ajuste.aprobar', 'descuento.resolver', 'config', 'usuarios', 'solicitud.resolver'] },
    admision: { nombre: 'Admisión', desc: 'Registra pacientes y abre cuentas.', vistas: ['inicio', 'admision', 'cuentas'], acciones: ['paciente', 'cuenta.abrir', 'cuenta.cargo.servicio', 'descuento.pedir'] },
    caja: { nombre: 'Caja', desc: 'Cobra, factura y cierra su turno.', vistas: ['inicio', 'caja', 'cuentas', 'admision'], acciones: ['caja', 'cuenta.facturar', 'cuenta.cargo.servicio', 'paciente', 'cuenta.abrir', 'descuento.pedir'] },
    farmacia: { nombre: 'Farmacia (regente)', desc: 'Vende y cobra en mostrador, despacha pedidos y lleva los controlados.', vistas: ['inicio', 'farmacia', 'mapa', 'inventario', 'cuentas'], acciones: ['caja', 'cuenta.facturar', 'lote.bloquear', 'farmacia', 'cuenta.cargo.producto', 'inv.solicitar', 'inv.recibir', 'inv.baja', 'inv.ajuste', 'compras.solicitar'] },
    enfermeria: { nombre: 'Enfermería', desc: 'Pide a farmacia y carga lo que usa cada paciente.', vistas: ['inicio', 'sala', 'mapa', 'cuentas'], acciones: ['pedido', 'cuenta.cargo.servicio', 'inv.solicitar', 'inv.recibir'] },
    quirofano: { nombre: 'Quirófano', desc: 'Registra el consumo de cada cirugía.', vistas: ['inicio', 'sala', 'mapa', 'cuentas', 'inventario'], acciones: ['pedido', 'cuenta.cargo.producto', 'cuenta.cargo.servicio', 'inv.solicitar', 'inv.recibir', 'compras.solicitar'] },
    bodega: { nombre: 'Bodega central', desc: 'Recibe, ubica, traslada y cuenta el inventario.', vistas: ['inicio', 'inventario', 'compras', 'mapa'], acciones: ['lote.bloquear', 'inv.enviar', 'inv.recibir', 'inv.solicitar', 'inv.ajuste', 'inv.baja', 'inv.conteo', 'compras.recibir', 'donacion', 'producto'] },
    compras: { nombre: 'Compras', desc: 'Convierte solicitudes en órdenes de compra.', vistas: ['inicio', 'compras', 'inventario'], acciones: ['compras.solicitar', 'solicitud.resolver', 'compras.oc', 'proveedor', 'producto'] },
    contabilidad: { nombre: 'Contabilidad', desc: 'Libros de ley, cuentas por pagar y partidas.', vistas: ['inicio', 'ley', 'compras', 'inventario', 'cuentas', 'reportes', 'bitacora'], acciones: ['compras.pagar', 'ajuste.aprobar', 'nota.credito'] },
    social: { nombre: 'Trabajo social', desc: 'Resuelve los descuentos por estudio socioeconómico.', vistas: ['inicio', 'social', 'cuentas', 'admision'], acciones: ['descuento.resolver', 'descuento.pedir'] },
    auditoria: { nombre: 'Auditoría interna', desc: 'Solo lectura de todo el sistema.', vistas: ['inicio', 'mapa', 'cuentas', 'inventario', 'compras', 'ley', 'reportes', 'bitacora'], acciones: [] },
  };

  C.USUARIOS = [
    { id: 'u1', nombre: 'Lic. Rebeca Ovalle', rol: 'direccion', pin: '1000', disp: 'Computadora · Dirección' },
    { id: 'u2', nombre: 'Sandra Tzoc', rol: 'admision', pin: '2000', disp: 'Computadora · Admisión 1' },
    { id: 'u3', nombre: 'Heidy Coyoy', rol: 'caja', pin: '3000', disp: 'Computadora · Caja 1' },
    { id: 'u4', nombre: 'Marvin Ixcot', rol: 'caja', pin: '3100', disp: 'Computadora · Caja 2' },
    { id: 'u5', nombre: 'Q.F. Lourdes Barrios', rol: 'farmacia', pin: '4000', disp: 'Computadora · Farmacia' },
    { id: 'u6', nombre: 'Enf. Dora Xicará', rol: 'enfermeria', pin: '5000', disp: 'Tablet · Encamamiento' },
    { id: 'u7', nombre: 'Enf. Wilson Batz', rol: 'quirofano', pin: '6000', disp: 'Tablet · Quirófano' },
    { id: 'u8', nombre: 'Elmer Ajanel', rol: 'bodega', pin: '7000', disp: 'Teléfono · Bodega' },
    { id: 'u9', nombre: 'Karla Maldonado', rol: 'compras', pin: '8000', disp: 'Computadora · Compras' },
    { id: 'u10', nombre: 'Lic. Óscar Figueroa', rol: 'contabilidad', pin: '9000', disp: 'Computadora · Contabilidad' },
    { id: 'u11', nombre: 'T.S. Irma Cux', rol: 'social', pin: '1100', disp: 'Computadora · Trabajo social' },
    { id: 'u12', nombre: 'Lic. Mynor Pineda', rol: 'auditoria', pin: '1200', disp: 'Computadora · Auditoría' },
  ];

  C.TIPOS_CUENTA = {
    consulta: { nombre: 'Consulta externa', area: 'Consulta externa', bod: 'FX' },
    emergencia: { nombre: 'Emergencia', area: 'Emergencia', bod: 'EM' },
    encamamiento: { nombre: 'Encamamiento', area: 'Encamamiento', bod: 'EN' },
    cirugia: { nombre: 'Cirugía', area: 'Quirófano', bod: 'QX' },
    laboratorio: { nombre: 'Laboratorio e imagen', area: 'Laboratorio', bod: 'LB' },
    farmacia: { nombre: 'Venta de farmacia', area: 'Farmacia', bod: 'FX' },
  };

  C.SERVICIOS = [
    ['S001', 'Consulta medicina general', 'Consulta externa', 75], ['S002', 'Consulta pediatría', 'Consulta externa', 100], ['S003', 'Consulta ginecología', 'Consulta externa', 125],
    ['S004', 'Consulta cirugía general', 'Consulta externa', 125], ['S005', 'Consulta urología', 'Consulta externa', 150], ['S006', 'Consulta traumatología', 'Consulta externa', 150],
    ['S007', 'Consulta otorrinolaringología', 'Consulta externa', 150], ['S008', 'Control prenatal', 'Consulta externa', 90], ['S009', 'Curación menor', 'Consulta externa', 60],
    ['S010', 'Atención de emergencia', 'Emergencia', 200], ['S011', 'Sutura', 'Emergencia', 175], ['S012', 'Nebulización', 'Emergencia', 65], ['S013', 'Observación por hora', 'Emergencia', 80], ['S014', 'Inyección', 'Emergencia', 25],
    ['S020', 'Hematología completa', 'Laboratorio', 60], ['S021', 'Glucosa', 'Laboratorio', 25], ['S022', 'Orina completa', 'Laboratorio', 30], ['S023', 'Perfil lipídico', 'Laboratorio', 130], ['S024', 'Creatinina', 'Laboratorio', 35],
    ['S025', 'Prueba de embarazo', 'Laboratorio', 45], ['S026', 'Heces completas', 'Laboratorio', 30], ['S027', 'Tipo de sangre y Rh', 'Laboratorio', 40], ['S028', 'Tiempo de protrombina', 'Laboratorio', 75],
    ['S030', 'Rayos X de tórax', 'Imagen', 150], ['S031', 'Rayos X de extremidad', 'Imagen', 125], ['S032', 'Ultrasonido abdominal', 'Imagen', 275], ['S033', 'Ultrasonido obstétrico', 'Imagen', 225], ['S034', 'Electrocardiograma', 'Imagen', 150],
    ['S040', 'Día de cama general', 'Encamamiento', 350], ['S041', 'Día de cama privada', 'Encamamiento', 650], ['S042', 'Cuidados de enfermería por día', 'Encamamiento', 150], ['S043', 'Visita médica', 'Encamamiento', 125],
    ['S050', 'Uso de quirófano, cirugía menor', 'Quirófano', 1200], ['S051', 'Uso de quirófano, cirugía mayor', 'Quirófano', 3500], ['S052', 'Anestesia general', 'Quirófano', 1800], ['S053', 'Anestesia regional', 'Quirófano', 1100], ['S054', 'Honorarios de cirujano', 'Quirófano', 2500], ['S055', 'Recuperación posoperatoria', 'Quirófano', 450],
  ].map(([cod, nombre, area, precio], i) => ({ id: 'sv' + (i + 1), cod, nombre, area, precio }));

  /* [nombre base, presentación, precio venta, costo, categoría, marca especial] */
  const MED = [
    ['Acetaminofén 500 mg', 'Tableta', 1.0, .28], ['Acetaminofén 120 mg/5 ml', 'Jarabe 120 ml', 28, 12.4], ['Ibuprofeno 400 mg', 'Tableta', 1.5, .42], ['Ibuprofeno 100 mg/5 ml', 'Suspensión 120 ml', 32, 14.6],
    ['Diclofenaco 50 mg', 'Tableta', 1.25, .35], ['Diclofenaco 75 mg/3 ml', 'Ampolla', 9, 3.1], ['Ketorolaco 30 mg/ml', 'Ampolla', 18, 6.2], ['Naproxeno 550 mg', 'Tableta', 2.5, .8], ['Metamizol 1 g/2 ml', 'Ampolla', 11, 3.8],
    ['Amoxicilina 500 mg', 'Cápsula', 2.25, .7], ['Amoxicilina 250 mg/5 ml', 'Suspensión 100 ml', 38, 16.5], ['Amoxicilina + clavulánico 875 mg', 'Tableta', 9, 3.9], ['Azitromicina 500 mg', 'Tableta', 12, 4.6], ['Ciprofloxacina 500 mg', 'Tableta', 4.5, 1.5],
    ['Ceftriaxona 1 g', 'Vial', 45, 14.8], ['Cefalexina 500 mg', 'Cápsula', 3.75, 1.2], ['Clindamicina 300 mg', 'Cápsula', 8, 3.1], ['Metronidazol 500 mg', 'Tableta', 1.75, .5], ['Metronidazol 500 mg/100 ml', 'Frasco IV', 42, 15], ['Gentamicina 80 mg/2 ml', 'Ampolla', 12, 4],
    ['Trimetoprim sulfa 800/160 mg', 'Tableta', 2.5, .75], ['Nitrofurantoína 100 mg', 'Cápsula', 3.5, 1.1], ['Fluconazol 150 mg', 'Cápsula', 14, 4.5], ['Aciclovir 400 mg', 'Tableta', 6, 2.1], ['Albendazol 400 mg', 'Tableta', 7, 2.2],
    ['Omeprazol 20 mg', 'Cápsula', 2, .55], ['Omeprazol 40 mg', 'Vial', 55, 21], ['Ranitidina 50 mg/2 ml', 'Ampolla', 12, 4.2], ['Metoclopramida 10 mg/2 ml', 'Ampolla', 9, 2.9], ['Ondansetrón 8 mg/4 ml', 'Ampolla', 32, 11.5], ['Loperamida 2 mg', 'Tableta', 2, .6],
    ['Sales de rehidratación oral', 'Sobre', 6, 2], ['Losartán 50 mg', 'Tableta', 2.5, .7], ['Enalapril 10 mg', 'Tableta', 1.5, .4], ['Amlodipino 5 mg', 'Tableta', 2, .55], ['Metoprolol 100 mg', 'Tableta', 3, .9], ['Furosemida 40 mg', 'Tableta', 1.25, .35], ['Furosemida 20 mg/2 ml', 'Ampolla', 10, 3.2],
    ['Atorvastatina 20 mg', 'Tableta', 4.5, 1.4], ['Ácido acetilsalicílico 100 mg', 'Tableta', 1, .25], ['Metformina 850 mg', 'Tableta', 1.75, .5], ['Glibenclamida 5 mg', 'Tableta', 1.25, .32], ['Levotiroxina 100 mcg', 'Tableta', 2.75, .9],
    ['Salbutamol 100 mcg', 'Inhalador', 65, 27], ['Salbutamol 5 mg/ml', 'Solución 20 ml', 48, 19], ['Loratadina 10 mg', 'Tableta', 1.75, .45], ['Clorfeniramina 10 mg/ml', 'Ampolla', 9, 3], ['Dexametasona 8 mg/2 ml', 'Ampolla', 14, 4.8], ['Hidrocortisona 100 mg', 'Vial', 38, 13.5], ['Prednisona 5 mg', 'Tableta', 1.25, .3],
    ['Hierro + ácido fólico', 'Tableta', 1.5, .42], ['Vitamina B compleja', 'Ampolla', 12, 3.9], ['Enoxaparina 40 mg', 'Jeringa', 85, 36], ['Heparina 5000 UI/ml', 'Vial', 72, 29], ['Tranexámico 500 mg/5 ml', 'Ampolla', 36, 13],
    ['Lidocaína 2 %', 'Frasco 50 ml', 42, 16], ['Bupivacaína 0.5 % pesada', 'Ampolla', 68, 27], ['Propofol 1 %', 'Ampolla 20 ml', 74, 31], ['Atropina 1 mg/ml', 'Ampolla', 14, 4.6], ['Efedrina 50 mg/ml', 'Ampolla', 44, 17], ['Adrenalina 1 mg/ml', 'Ampolla', 22, 8],
    ['Solución salina 0.9 % 500 ml', 'Bolsa', 28, 10], ['Solución salina 0.9 % 1000 ml', 'Bolsa', 36, 13], ['Hartmann 1000 ml', 'Bolsa', 38, 14], ['Dextrosa 5 % 1000 ml', 'Bolsa', 36, 13], ['Agua estéril 10 ml', 'Ampolla', 4, 1.1],
  ].map(r => [...r, 'Medicamento']);

  const FRIO = [
    ['Insulina NPH 100 UI/ml', 'Vial 10 ml', 195, 92], ['Insulina regular 100 UI/ml', 'Vial 10 ml', 205, 97], ['Oxitocina 10 UI/ml', 'Ampolla', 24, 9], ['Rocuronio 50 mg/5 ml', 'Vial', 165, 74], ['Succinilcolina 100 mg', 'Vial', 92, 40], ['Toxoide tetánico', 'Ampolla', 45, 18],
  ].map(r => [...r, 'Medicamento', 'frio']);

  const CTRL = [
    ['Diazepam 10 mg/2 ml', 'Ampolla', 18, 6.5, 'psicotropico'], ['Diazepam 5 mg', 'Tableta', 2.5, .8, 'psicotropico'], ['Midazolam 15 mg/3 ml', 'Ampolla', 52, 21, 'psicotropico'], ['Clonazepam 2 mg', 'Tableta', 4, 1.4, 'psicotropico'], ['Lorazepam 2 mg', 'Tableta', 4.5, 1.6, 'psicotropico'],
    ['Fenobarbital 100 mg', 'Tableta', 3, 1, 'psicotropico'], ['Ketamina 500 mg/10 ml', 'Vial', 118, 52, 'psicotropico'], ['Morfina 10 mg/ml', 'Ampolla', 46, 19, 'estupefaciente'], ['Fentanilo 0.5 mg/10 ml', 'Ampolla', 58, 24, 'estupefaciente'], ['Petidina 100 mg/2 ml', 'Ampolla', 62, 26, 'estupefaciente'], ['Tramadol 100 mg/2 ml', 'Ampolla', 21, 7.5, 'psicotropico'],
  ].map(([n, p, v, c, k]) => [n, p, v, c, 'Medicamento', k]);

  const INS = [
    ['Jeringa 3 ml', 'Unidad', 2.5, .75], ['Jeringa 5 ml', 'Unidad', 3, .9], ['Jeringa 10 ml', 'Unidad', 4, 1.2], ['Aguja 21G', 'Unidad', 1, .25], ['Catéter IV 18G', 'Unidad', 14, 4.8], ['Catéter IV 20G', 'Unidad', 14, 4.8], ['Catéter IV 22G', 'Unidad', 14, 4.8],
    ['Venoclisis', 'Unidad', 16, 5.2], ['Guantes de examen M', 'Par', 3, .9], ['Guantes de examen L', 'Par', 3, .9], ['Guantes estériles 7', 'Par', 11, 3.8], ['Guantes estériles 7.5', 'Par', 11, 3.8], ['Gasa estéril 4x4', 'Sobre', 3.5, 1], ['Gasa simple 10 yd', 'Rollo', 62, 24], ['Algodón 1 lb', 'Rollo', 55, 23],
    ['Esparadrapo 1"', 'Rollo', 22, 8], ['Micropore 1"', 'Rollo', 26, 10], ['Venda elástica 4"', 'Unidad', 18, 6.2], ['Venda de yeso 4"', 'Unidad', 28, 11], ['Alcohol 70 % galón', 'Galón', 110, 52], ['Yodopovidona 1 L', 'Litro', 98, 44], ['Clorhexidina 4 %', 'Litro', 145, 66], ['Agua oxigenada 1 L', 'Litro', 38, 14],
    ['Sonda Foley 16 Fr', 'Unidad', 34, 12.5], ['Sonda Foley 18 Fr', 'Unidad', 34, 12.5], ['Bolsa recolectora de orina', 'Unidad', 24, 8.5], ['Sonda nasogástrica 16 Fr', 'Unidad', 26, 9.5], ['Sutura nylon 3-0', 'Sobre', 38, 14.5], ['Sutura nylon 4-0', 'Sobre', 38, 14.5], ['Sutura catgut crómico 2-0', 'Sobre', 44, 17], ['Sutura vicryl 2-0', 'Sobre', 72, 31], ['Sutura vicryl 3-0', 'Sobre', 72, 31], ['Sutura seda 2-0', 'Sobre', 36, 13],
    ['Hoja de bisturí 15', 'Unidad', 5, 1.5], ['Hoja de bisturí 22', 'Unidad', 5, 1.5], ['Campo quirúrgico estéril', 'Unidad', 48, 19], ['Bata quirúrgica estéril', 'Unidad', 68, 28], ['Gorro desechable', 'Unidad', 2, .5], ['Mascarilla quirúrgica', 'Unidad', 2, .45], ['Mascarilla N95', 'Unidad', 14, 5.2], ['Electrodo de ECG', 'Unidad', 3.5, 1], ['Tubo endotraqueal 7.5', 'Unidad', 44, 16], ['Cánula nasal adulto', 'Unidad', 24, 8], ['Mascarilla para nebulizar', 'Unidad', 34, 12], ['Aposito transparente', 'Unidad', 19, 6.8], ['Malla de polipropileno 15x15', 'Unidad', 680, 310], ['Drenaje Penrose', 'Unidad', 36, 13],
  ].map(r => [...r, 'Insumo médico']);

  const LAB = [
    ['Tira de glucosa', 'Unidad', 6, 2.4], ['Reactivo hematología', 'Frasco', 980, 520], ['Reactivo creatinina', 'Kit', 720, 380], ['Reactivo colesterol', 'Kit', 690, 360], ['Prueba rápida de embarazo', 'Unidad', 14, 4.2], ['Tubo con EDTA', 'Unidad', 2.75, .9], ['Tubo seco', 'Unidad', 2.5, .75], ['Lanceta', 'Unidad', 1, .22], ['Portaobjetos', 'Caja', 54, 22], ['Placa de rayos X 14x17', 'Unidad', 42, 19], ['Gel para ultrasonido', 'Galón', 165, 78],
  ].map(r => [...r, 'Laboratorio e imagen']);

  const GRAL = [
    ['Papel térmico para factura', 'Rollo', 0, 8.5], ['Bolsa roja bioinfecciosos', 'Unidad', 0, 1.8], ['Guardián para punzocortantes', 'Unidad', 0, 18], ['Detergente hospitalario', 'Galón', 0, 48], ['Hipoclorito 5 %', 'Galón', 0, 26],
  ].map(r => [...r, 'Uso interno']);

  /* Laboratorios: da más artículos reales al catálogo (misma molécula, varias marcas) */
  const LABS = ['Bonin', 'Gardel', 'Selecto', 'Vijosa', 'Laprin', 'Infasa'];

  C.crearProductos = function () {
    const out = []; let n = 0;
    const add = (r, marca) => {
      const [nombre, pres, venta, costo, cat, esp] = r; n++;
      const pref = { 'Medicamento': 'MED', 'Insumo médico': 'INS', 'Laboratorio e imagen': 'LAB', 'Uso interno': 'GEN' }[cat];
      const dosisAlta = costo > 200;
      out.push({
        id: 'p' + n, cod: pref + '-' + String(n).padStart(4, '0'), nombre: marca ? nombre + ' · ' + marca : nombre, pres, venta, costoRef: costo, cat,
        controlado: esp === 'psicotropico' || esp === 'estupefaciente' ? esp : null, frio: esp === 'frio',
        generico: cat === 'Medicamento' && !marca && !esp && n % 3 !== 0, // inscrito como genérico: exento de IVA (Art. 7 num. 15)
        registro: cat === 'Medicamento' ? 'PF-' + (20000 + n * 37) : null,
        min: dosisAlta ? 6 : venta < 5 ? 400 : 60, max: dosisAlta ? 24 : venta < 5 ? 2000 : 300, activo: true,
        qty: 0, valor: 0, ex: {},
      });
    };
    let i = 0;
    for (const r of MED) { add(r); if (i++ % 2 === 0) add([r[0], r[1], +(r[2] * 1.18).toFixed(2), +(r[3] * 1.3).toFixed(2), r[4]], LABS[i % LABS.length]); if (i % 3 === 0) add([r[0], r[1], +(r[2] * 1.32).toFixed(2), +(r[3] * 1.5).toFixed(2), r[4]], LABS[(i + 2) % LABS.length]); }
    FRIO.forEach(r => add(r)); CTRL.forEach(r => add(r));
    INS.forEach((r, k) => { add(r); if (k % 3 === 0) add([r[0], r[1], +(r[2] * 1.15).toFixed(2), +(r[3] * 1.25).toFixed(2), r[4]], 'Importado'); });
    LAB.forEach(r => add(r)); GRAL.forEach(r => add(r));
    return out;
  };

  C.PROVEEDORES = [
    ['Droguería Costa Sur, S.A.', '1234567-8', 'Medicamentos', 30, false], ['Distribuidora Médica del Pacífico, S.A.', '2345678-9', 'Insumos', 30, false], ['Farmacéutica Quetzal, S.A.', '3456789-0', 'Medicamentos', 45, false],
    ['Insumos Hospitalarios de Occidente', '4567890-1', 'Insumos', 15, true], ['Laboratorios Xelajú, S.A.', '5678901-2', 'Laboratorio', 30, false], ['Quirúrgica del Sur, S.A.', '6789012-3', 'Insumos', 30, false],
    ['Comercial La Ceiba', '7890123-4', 'Uso interno', 0, true], ['Radiología y Equipo, S.A.', '8901234-5', 'Laboratorio', 30, false], ['Droguería San Sebastián', '9012345-6', 'Medicamentos', 15, true], ['Suministros Muluá', '1122334-5', 'Uso interno', 0, true],
  ].map(([nombre, nit, rubro, dias, simplificado], i) => ({ id: 'v' + (i + 1), cod: 'PR-' + String(i + 1).padStart(3, '0'), nombre, nit, rubro, dias, regimen: ['Sujeto a pagos trimestrales','Opcional simplificado','Sujeto a pagos trimestrales','Opcional simplificado','Sujeto a pagos trimestrales','Opcional simplificado','Pequeño contribuyente','Sujeto a pagos trimestrales','Opcional simplificado','Pequeño contribuyente'][i], tel: '7771-' + String(1000 + i * 137), activo: true }));

  C.DONANTES = ['Misión médica visitante (ejemplo)', 'Iglesia local (ejemplo)', 'Club de servicio (ejemplo)', 'Empresa donante (ejemplo)'];

  C.NOMBRES = ['María', 'Juana', 'Ana', 'Rosa', 'Marta', 'Lucía', 'Elena', 'Carmen', 'Gloria', 'Sonia', 'Blanca', 'Dulce', 'Yesenia', 'Mayra', 'Claudia', 'Wendy', 'Andrea', 'Josefa', 'Catarina', 'Santos', 'Isabel', 'Fernanda', 'Glenda', 'Silvia', 'Paola', 'José', 'Juan', 'Carlos', 'Luis', 'Pedro', 'Miguel', 'Manuel', 'Francisco', 'Diego', 'Mario', 'Julio', 'Óscar', 'Edgar', 'Byron', 'Selvin', 'Kevin', 'Marvin', 'Nery', 'Rony', 'Erick', 'Gerson', 'Otto', 'Mynor', 'Walter', 'Rigoberto'];
  C.APELLIDOS = ['Pérez', 'López', 'García', 'González', 'Hernández', 'Rodríguez', 'Morales', 'Ramírez', 'Martínez', 'Castillo', 'Reyes', 'Ortiz', 'Mejía', 'Barrios', 'Velásquez', 'Méndez', 'Orozco', 'Fuentes', 'Juárez', 'Cifuentes', 'Ajanel', 'Tzoc', 'Xicará', 'Batz', 'Cux', 'Ixcot', 'Coyoy', 'Tzul', 'Chávez', 'Chan', 'Sic', 'Tax', 'Ajú', 'Yac', 'Cojulún', 'Vicente', 'Calel', 'Gómez', 'Domingo', 'Marroquín', 'Escobar', 'Monzón', 'Rabanales', 'Alvarado', 'Paz', 'Solís', 'Navarro', 'De León', 'Maldonado', 'Figueroa'];
  C.MUNICIPIOS = ['San Felipe', 'Retalhuleu', 'San Sebastián', 'Santa Cruz Muluá', 'El Asintal', 'Nuevo San Carlos', 'San Martín Zapotitlán', 'Champerico', 'Mazatenango', 'San Andrés Villa Seca', 'Coatepeque', 'Quetzaltenango', 'Pueblo Nuevo', 'San Francisco Zapotitlán'];
  C.MEDICOS = [['Dra. Ana Lucía Ruano', '10234'], ['Dr. Ronaldo Paiz', '11876'], ['Dra. Silvia Cardona', '12933'], ['Dr. Hugo Samayoa', '9841'], ['Dr. Alex Monroy', '13420'], ['Dra. Vivian Recinos', '14102']];

  g.Catalogo = C;
})(typeof window !== 'undefined' ? window : globalThis);
