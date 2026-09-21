// Paso 2: reemplaza movimientos() (Droguería) para leer datos reales
// vía /api/movimientos en sus 4 tabs (Recepción/Despacho/Traspaso/
// Devolución), usando cargarLista() + desanidar() del paso 1.
const fs = require("fs");
const path = require("path");

const filePath = path.join(
  __dirname,
  "..",
  "Sistema de gestion de bodegas (2).html",
);
const html = fs.readFileSync(filePath, "utf8");
const lines = html.split("\n");

const TEMPLATE_LINE = 392;
let template = JSON.parse(lines[TEMPLATE_LINE]);

function reemplazar(desde, hasta) {
  if (!template.includes(desde)) {
    throw new Error("No se encontró el texto exacto (movimientos):\n" + desde.slice(0, 300));
  }
  template = template.replace(desde, hasta);
}

const DESDE = `  movimientos() {
    const tabs = ['Recepción', 'Despacho', 'Traspaso', 'Devolución'];
    const counts = [128, 96, 34, 12];
    const t = this.state.tab;
    const cfg = [
      {
        req: 'Anexo N°4 · parte de entrada con trazabilidad por lote y vencimiento',
        primary: { label: 'Nueva recepción', modal: 'recepcion' },
        searchPlaceholder: 'Buscar por artículo, lote o proveedor',
        filters: [{ label: 'Período', value: 'Sep 2026', icon: ic('calendar', 13) }, { label: 'Proveedor', value: 'Todos', icon: ic('truck', 13) }],
        columns: cols('Fecha', 'Artículo', 'Lote', 'Vencimiento', 'Proveedor', 'Estado', ['Cantidad', 'right']),
        rows: [
          ['14 sep 2026', 'Paracetamol 500 mg comprimido', 'Medicamentos / Analgésicos', 'L-22910', '30 abr 2028', 'Laboratorio Chile', ['RECEPCIONADO', 'ok'], '12.000'],
          ['14 sep 2026', 'Amoxicilina 500 mg cápsula', 'Medicamentos / Antibióticos', 'L-22908', '12 ene 2028', 'Saval', ['RECEPCIONADO', 'ok'], '6.400'],
          ['13 sep 2026', 'Fentanilo 0,05 mg/ml ampolla', 'Medicamentos / Controlados', 'L-22903', '05 jun 2027', 'Sanderson', ['PENDIENTE', 'warn'], '240'],
          ['13 sep 2026', 'Vacuna influenza trivalente', 'Vacunas / Cadena de frío', 'L-22901', '28 feb 2027', 'Instituto de Salud Pública', ['RECEPCIONADO', 'ok'], '1.500'],
          ['12 sep 2026', 'Insulina NPH 100 UI/ml', 'Medicamentos / Cadena de frío', 'L-22887', '19 nov 2027', 'Novo Nordisk Chile', ['CON REPAROS', 'bad'], '320'],
          ['12 sep 2026', 'Suero fisiológico 500 ml', 'Insumos / Soluciones', 'L-22884', '02 ago 2029', 'Fresenius Kabi', ['RECEPCIONADO', 'ok'], '2.200'],
          ['11 sep 2026', 'Guantes de nitrilo talla M', 'Insumos / Protección', 'L-22879', '15 mar 2030', 'Distribuidora Andes', ['RECEPCIONADO', 'ok'], '18.000'],
          ['11 sep 2026', 'Metformina 850 mg comprimido', 'Medicamentos / Antidiabéticos', 'L-22874', '30 sep 2028', 'Laboratorio Chile', ['RECEPCIONADO', 'ok'], '9.600']
        ].map(r => ({
          cells: [txt(r[0]), stack(r[1], r[2]), mono(r[3]), txt(r[4]), txt(r[5]), badge(r[6][0], r[6][1]), mono(r[7], 'right')],
          actions: [{ icon: ic('eye', 14), title: 'Ver guía', go: this.open('recepcion') }, { icon: ic('printer', 14), title: 'Imprimir', fn: 'imprimirRecepcion' }]
        })),
        footer: 'Mostrando 8 de 128 recepciones · bodega ' + this.state.bodega
      },
      {
        req: 'Anexo N°4 · bloque Nuevo Despacho (9 ítems) · estado de pedido (esp. general #18)',
        primary: { label: 'Nuevo despacho', modal: 'despacho' },
        searchPlaceholder: 'Buscar por folio o destino',
        filters: [{ label: 'Período', value: 'Sep 2026', icon: ic('calendar', 13) }, { label: 'Estado', value: 'Todos', icon: ic('filter', 13) }],
        columns: cols('Folio', 'Fecha', 'Destino', ['Ítems', 'right'], 'Transporte', 'Estado'),
        rows: [
          ['DES-04812', '14 sep 2026', CENTROS[0], 'CC-1042', '32', '76.412.900-1 · J. Sepúlveda', ['EN TRÁNSITO', 'warn']],
          ['DES-04811', '14 sep 2026', CENTROS[1], 'CC-1043', '18', '76.412.900-1 · J. Sepúlveda', ['EN TRÁNSITO', 'warn']],
          ['DES-04809', '13 sep 2026', CENTROS[3], 'CC-1051', '45', '77.019.320-4 · M. Cáceres', ['RECEPCIONADO', 'ok']],
          ['DES-04805', '13 sep 2026', CENTROS[2], 'CC-1044', '11', '77.019.320-4 · M. Cáceres', ['RECEPCIONADO', 'ok']],
          ['DES-04799', '12 sep 2026', CENTROS[0], 'CC-1042', '18', '76.412.900-1 · J. Sepúlveda', ['RECEPCIONADO', 'ok']],
          ['DES-04791', '12 sep 2026', CENTROS[1], 'CC-1043', '27', '76.412.900-1 · J. Sepúlveda', ['ENVIADO', 'neutral']],
          ['DES-04780', '11 sep 2026', CENTROS[1], 'CC-1043', '22', '77.019.320-4 · M. Cáceres', ['CON REPAROS', 'bad']],
          ['DES-04771', '10 sep 2026', CENTROS[3], 'CC-1051', '41', '76.412.900-1 · J. Sepúlveda', ['RECEPCIONADO', 'ok']]
        ].map(r => ({
          cells: [mono(r[0]), txt(r[1]), stack(r[2], r[3]), mono(r[4], 'right'), txt(r[5]), badge(r[6][0], r[6][1])],
          actions: [{ icon: ic('eye', 14), title: 'Ver despacho', go: this.open('despacho') }, { icon: ic('printer', 14), title: 'Imprimir guía', fn: 'imprimirGuiaDespacho' }]
        })),
        footer: 'Mostrando 8 de 96 despachos · estados: Enviado · En tránsito · Recepcionado'
      },
      {
        req: 'Anexo N°4 · traspaso entre bodegas y recepción de traspaso',
        primary: { label: 'Nuevo traspaso', modal: 'traspaso' },
        searchPlaceholder: 'Buscar por artículo o bodega',
        filters: [{ label: 'Período', value: 'Sep 2026', icon: ic('calendar', 13) }, { label: 'Estado', value: 'Todos', icon: ic('filter', 13) }],
        columns: cols('Fecha', 'Bodega origen', 'Bodega destino', 'Artículo', 'Lote', ['Cantidad', 'right'], 'Estado'),
        rows: [
          ['14 sep 2026', 'Bodega general', 'Bodega controlados', 'Fentanilo 0,05 mg/ml ampolla', 'L-22903', '120', ['ENVIADO', 'neutral'], true],
          ['13 sep 2026', 'Bodega general', 'Bodega refrigerada 2', 'Insulina NPH 100 UI/ml', 'L-22887', '80', ['ENVIADO', 'neutral'], true],
          ['13 sep 2026', 'Bodega refrigerada 1', 'Bodega refrigerada 2', 'Vacuna influenza trivalente', 'L-22901', '400', ['RECIBIDO', 'ok'], false],
          ['12 sep 2026', 'Bodega general', 'Bodega informática', 'Impresora térmica de etiquetas', 'S/L', '2', ['RECIBIDO', 'ok'], false],
          ['11 sep 2026', 'Bodega controlados', 'Bodega general', 'Morfina 10 mg/ml ampolla', 'L-22861', '40', ['RECIBIDO', 'ok'], false],
          ['10 sep 2026', 'Bodega general', 'Bodega insumos', 'Guantes de nitrilo talla M', 'L-22879', '4.000', ['RECIBIDO', 'ok'], false]
        ].map(r => ({
          cells: [txt(r[0]), txt(r[1]), txt(r[2]), txt(r[3]), mono(r[4]), mono(r[5], 'right'), badge(r[6][0], r[6][1])],
          actions: r[7]
            ? [{ icon: ic('refresh', 14), title: 'Recibir traspaso', go: this.open('recibir') }, { icon: ic('eye', 14), title: 'Ver', go: this.open('traspaso') }]
            : [{ icon: ic('eye', 14), title: 'Ver', go: this.open('traspaso') }]
        })),
        footer: 'Mostrando 6 de 34 traspasos · el ícono ↻ abre la confirmación de recepción'
      },
      {
        req: 'Anexo N°4 · devolución a proveedor',
        primary: { label: 'Nueva devolución', modal: 'devolucion' },
        searchPlaceholder: 'Buscar por proveedor o artículo',
        filters: [{ label: 'Período', value: 'Sep 2026', icon: ic('calendar', 13) }, { label: 'Motivo', value: 'Todos', icon: ic('filter', 13) }],
        columns: cols('Fecha', 'Proveedor', 'Artículo', 'Lote', ['Cantidad', 'right'], 'Motivo', 'Estado'),
        rows: [
          ['13 sep 2026', 'Novo Nordisk Chile', 'Insulina NPH 100 UI/ml', 'L-22887', '40', 'Cadena de frío interrumpida', ['ENVIADO', 'neutral']],
          ['11 sep 2026', 'Distribuidora Andes', 'Guantes de nitrilo talla M', 'L-22879', '600', 'Empaque dañado', ['RECIBIDO', 'ok']],
          ['09 sep 2026', 'Saval', 'Amoxicilina 500 mg cápsula', 'L-22790', '200', 'Vencimiento próximo', ['RECIBIDO', 'ok']],
          ['05 sep 2026', 'Laboratorio Chile', 'Metformina 850 mg comprimido', 'L-22712', '150', 'Error en cantidad recibida', ['RECIBIDO', 'ok']]
        ].map(r => ({
          cells: [txt(r[0]), txt(r[1]), txt(r[2]), mono(r[3]), mono(r[4], 'right'), txt(r[5]), badge(r[6][0], r[6][1])],
          actions: [{ icon: ic('eye', 14), title: 'Ver', go: this.open('devolucion') }, { icon: ic('printer', 14), title: 'Imprimir', fn: 'imprimirDevolucion' }]
        })),
        footer: 'Mostrando 4 de 12 devoluciones'
      }
    ][t];

    return Object.assign({
      isList: true, eyebrow: 'DROGUERÍA · INTERFAZ 15',
      title: 'Movimientos',
      secondary: [
        { label: 'Exportar', icon: ic('download', 13), fn: 'exportarMovimientos' },
        { label: 'Imprimir', icon: ic('printer', 13), fn: 'imprimirMovimientos' }
      ],
      tabs: tabs.map((label, i) => ({ label, count: counts[i], i }))
    }, cfg, { primary: { label: cfg.primary.label, go: this.open(cfg.primary.modal) } });
  }

  inventario(farmacia) {`;

const HASTA = `  estadoMov = (e) => {
    if (e === 'recepcionado_con_reparos') return 'bad';
    if (e === 'recepcionado_sin_reparos') return 'ok';
    if (e === 'enviado' || e === 'en_transito') return 'warn';
    return 'neutral';
  };
  fechaCorta = (f) => String(f || '').slice(0, 10);

  movimientos() {
    const t = this.state.tab;
    const tabs = ['Recepción', 'Despacho', 'Traspaso', 'Devolución'];
    const claves = ['mov_recepcion', 'mov_despacho', 'mov_traspaso', 'mov_devolucion'];
    const rutas = ['/api/movimientos?tipo=recepcion', '/api/movimientos?tipo=despacho', '/api/movimientos?tipo=traspaso', '/api/movimientos?tipo=devolucion'];
    const filas = this.cargarLista(claves[t], rutas[t]);
    const counts = claves.map(c => (this.state.listas[c] || []).length);

    const cfg = [
      {
        req: 'Anexo N°4 · parte de entrada con trazabilidad por lote y vencimiento',
        primary: { label: 'Nueva recepción', modal: 'recepcion' },
        searchPlaceholder: 'Buscar por artículo, lote o proveedor',
        filters: [],
        columns: cols('Fecha', 'Artículo', 'Lote', 'Vencimiento', 'Proveedor', 'Estado', ['Cantidad', 'right']),
        rows: filas.map(m => {
          const lote = this.desanidar(m.lote);
          const articulo = this.desanidar(lote && lote.articulo);
          const proveedor = this.desanidar(lote && lote.proveedor);
          return {
            cells: [txt(this.fechaCorta(m.fecha_movimiento)), stack(articulo ? articulo.nombre : '—', articulo ? articulo.codigo_interno : ''), mono(lote ? lote.numero_lote : ''), txt(lote ? lote.fecha_vencimiento : ''), txt(proveedor ? proveedor.razon_social : '—'), badge(m.estado, this.estadoMov(m.estado)), mono(m.cantidad, 'right')],
            actions: []
          };
        }),
        footer: 'Mostrando ' + filas.length + ' recepciones reales'
      },
      {
        req: 'Anexo N°4 · bloque Nuevo Despacho (9 ítems) · estado de pedido (esp. general #18)',
        primary: { label: 'Nuevo despacho', modal: 'despacho' },
        searchPlaceholder: 'Buscar por folio o destino',
        filters: [],
        columns: cols('Folio', 'Fecha', 'Centro de costo', ['Cantidad', 'right'], 'Estado'),
        rows: filas.map(m => {
          const centro = this.desanidar(m.centro_costo);
          return {
            cells: [mono(m.folio || '—'), txt(this.fechaCorta(m.fecha_movimiento)), txt(centro ? centro.nombre : '—'), mono(m.cantidad, 'right'), badge(m.estado, this.estadoMov(m.estado))],
            actions: []
          };
        }),
        footer: 'Mostrando ' + filas.length + ' despachos reales'
      },
      {
        req: 'Anexo N°4 · traspaso entre bodegas y recepción de traspaso',
        primary: { label: 'Nuevo traspaso', modal: 'traspaso' },
        searchPlaceholder: 'Buscar por artículo o bodega',
        filters: [],
        columns: cols('Fecha', 'Bodega origen', 'Bodega destino', 'Artículo', 'Lote', ['Cantidad', 'right'], 'Estado'),
        rows: filas.map(m => {
          const origen = this.desanidar(m.bodega_origen);
          const destino = this.desanidar(m.bodega_destino);
          const lote = this.desanidar(m.lote);
          const articulo = this.desanidar(lote && lote.articulo);
          const pendiente = m.estado === 'enviado' || m.estado === 'en_transito';
          return {
            cells: [txt(this.fechaCorta(m.fecha_movimiento)), txt(origen ? origen.nombre : '—'), txt(destino ? destino.nombre : '—'), txt(articulo ? articulo.nombre : '—'), mono(lote ? lote.numero_lote : ''), mono(m.cantidad, 'right'), badge(m.estado, this.estadoMov(m.estado))],
            actions: pendiente ? [{ icon: ic('refresh', 14), title: 'Recibir traspaso', go: () => { this.setState({ ultimoTraspasoId: m.id_movimiento }); this.open('recibir')(); } }] : []
          };
        }),
        footer: 'Mostrando ' + filas.length + ' traspasos reales · el ícono ↻ abre la confirmación de recepción'
      },
      {
        req: 'Anexo N°4 · devolución a proveedor',
        primary: { label: 'Nueva devolución', modal: 'devolucion' },
        searchPlaceholder: 'Buscar por proveedor o artículo',
        filters: [],
        columns: cols('Fecha', 'Proveedor', 'Artículo', 'Lote', ['Cantidad', 'right'], 'Motivo', 'Estado'),
        rows: filas.map(m => {
          const lote = this.desanidar(m.lote);
          const articulo = this.desanidar(lote && lote.articulo);
          const proveedor = this.desanidar(lote && lote.proveedor);
          return {
            cells: [txt(this.fechaCorta(m.fecha_movimiento)), txt(proveedor ? proveedor.razon_social : '—'), txt(articulo ? articulo.nombre : '—'), mono(lote ? lote.numero_lote : ''), mono(m.cantidad, 'right'), txt(m.observacion || '—'), badge(m.estado, this.estadoMov(m.estado))],
            actions: []
          };
        }),
        footer: 'Mostrando ' + filas.length + ' devoluciones reales'
      }
    ][t];

    return Object.assign({
      isList: true, eyebrow: 'DROGUERÍA · INTERFAZ 15',
      title: 'Movimientos',
      secondary: [
        { label: 'Exportar', icon: ic('download', 13), fn: 'exportarMovimientos' },
        { label: 'Imprimir', icon: ic('printer', 13), fn: 'imprimirMovimientos' }
      ],
      tabs: tabs.map((label, i) => ({ label, count: counts[i], i }))
    }, cfg, { primary: { label: cfg.primary.label, go: this.open(cfg.primary.modal) } });
  }

  inventario(farmacia) {`;

reemplazar(DESDE, HASTA);

lines[TEMPLATE_LINE] = JSON.stringify(template).replace(/<\//g, "<\\/");
fs.writeFileSync(filePath, lines.join("\n"));
console.log("OK. Paso 2 (movimientos con datos reales) aplicado:", filePath);
