// Paso 4: movFarmacia() con datos reales (donación/traspaso/despacho
// interno/vale de consumo vía /api/movimientos).
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
    throw new Error("No se encontró el texto exacto (movFarmacia):\n" + desde.slice(0, 300));
  }
  template = template.replace(desde, hasta);
}

const DESDE = `  movFarmacia() {
    const t = this.state.tab;
    const cfg = [
      {
        req: 'Anexo N°4 · bloque Movimientos de Farmacia · donación',
        primary: { label: 'Nueva donación', modal: 'donacion' },
        searchPlaceholder: 'Buscar por donante o artículo',
        filters: [{ label: 'Período', value: 'Sep 2026', icon: ic('calendar', 13) }],
        columns: cols('Fecha', 'Donante', 'Artículo', 'Lote', 'Vencimiento', ['Cantidad', 'right'], 'Estado'),
        rows: [
          ['13 sep 2026', 'Cruz Roja Chilena', 'Suero fisiológico 500 ml', 'L-D0412', '02 ago 2029', '400', ['RECEPCIONADO', 'ok']],
          ['10 sep 2026', 'Fundación Las Rosas', 'Guantes de nitrilo talla M', 'L-D0409', '15 mar 2030', '2.000', ['RECEPCIONADO', 'ok']],
          ['05 sep 2026', 'SEREMI Salud RM', 'Vacuna influenza trivalente', 'L-D0401', '28 feb 2027', '600', ['RECEPCIONADO', 'ok']],
          ['01 sep 2026', 'Laboratorio Chile S.A.', 'Paracetamol 500 mg comprimido', 'L-D0396', '30 abr 2028', '1.200', ['PENDIENTE', 'warn']]
        ].map(r => ({
          cells: [txt(r[0]), txt(r[1]), txt(r[2]), mono(r[3]), txt(r[4]), mono(r[5], 'right'), badge(r[6][0], r[6][1])],
          actions: [{ icon: ic('eye', 14), title: 'Ver', go: this.open('donacion') }]
        })),
        footer: 'Mostrando 4 de 9 donaciones recibidas'
      },
      {
        req: 'Anexo N°4 · traspaso entre bodegas del centro de salud',
        primary: { label: 'Nuevo traspaso', modal: 'traspaso' },
        searchPlaceholder: 'Buscar por artículo o bodega',
        filters: [{ label: 'Período', value: 'Sep 2026', icon: ic('calendar', 13) }, { label: 'Estado', value: 'Todos', icon: ic('filter', 13) }],
        columns: cols('Fecha', 'Bodega origen', 'Bodega destino', 'Artículo', 'Lote', ['Cantidad', 'right'], 'Estado'),
        rows: [
          ['14 sep 2026', 'Bodega farmacia', 'Botiquín urgencia', 'Paracetamol 500 mg comprimido', 'L-22910', '600', ['ENVIADO', 'neutral'], true],
          ['13 sep 2026', 'Bodega farmacia', 'Sala de procedimientos', 'Suero fisiológico 500 ml', 'L-22884', '80', ['RECIBIDO', 'ok'], false],
          ['12 sep 2026', 'Bodega farmacia', 'Vacunatorio', 'Vacuna influenza trivalente', 'L-22901', '200', ['RECIBIDO', 'ok'], false],
          ['11 sep 2026', 'Botiquín urgencia', 'Bodega farmacia', 'Amoxicilina 500 mg cápsula', 'L-22908', '40', ['RECIBIDO', 'ok'], false]
        ].map(r => ({
          cells: [txt(r[0]), txt(r[1]), txt(r[2]), txt(r[3]), mono(r[4]), mono(r[5], 'right'), badge(r[6][0], r[6][1])],
          actions: r[7]
            ? [{ icon: ic('refresh', 14), title: 'Recibir traspaso', go: this.open('recibir') }, { icon: ic('eye', 14), title: 'Ver', go: this.open('traspaso') }]
            : [{ icon: ic('eye', 14), title: 'Ver', go: this.open('traspaso') }]
        })),
        footer: 'Mostrando 4 de 21 traspasos internos'
      },
      {
        req: 'Anexo N°4 · despacho a cuentas internas (centros de costo del establecimiento)',
        primary: { label: 'Nuevo despacho interno', modal: 'cuentas' },
        searchPlaceholder: 'Buscar por folio o cuenta interna',
        filters: [{ label: 'Período', value: 'Sep 2026', icon: ic('calendar', 13) }, { label: 'Cuenta', value: 'Todas', icon: ic('wallet', 13) }],
        columns: cols('Folio', 'Fecha', 'Cuenta interna', 'Centro de costo', ['Ítems', 'right'], 'Solicitante', 'Estado'),
        rows: [
          ['DI-01142', '14 sep 2026', 'Programa Salud Mental', 'CC-1052', '12', 'v.tapia', ['RECEPCIONADO', 'ok']],
          ['DI-01141', '14 sep 2026', 'Programa Odontológico', 'CC-1053', '8', 'v.tapia', ['EN TRÁNSITO', 'warn']],
          ['DI-01138', '12 sep 2026', 'Programa Cardiovascular', 'CC-1054', '15', 'j.alsina', ['RECEPCIONADO', 'ok']],
          ['DI-01134', '10 sep 2026', 'Vacunatorio', 'CC-1042', '6', 'd.fuentes', ['RECEPCIONADO', 'ok']],
          ['DI-01130', '08 sep 2026', 'Programa Salud Mental', 'CC-1052', '9', 'v.tapia', ['RECEPCIONADO', 'ok']]
        ].map(r => ({
          cells: [mono(r[0]), txt(r[1]), txt(r[2]), mono(r[3]), mono(r[4], 'right'), mono(r[5]), badge(r[6][0], r[6][1])],
          actions: [{ icon: ic('eye', 14), title: 'Ver', go: this.open('cuentas') }, { icon: ic('printer', 14), title: 'Imprimir', fn: 'imprimirMovimientos' }]
        })),
        footer: 'Mostrando 5 de 142 despachos a cuentas internas'
      },
      {
        req: 'Anexo N°4 · vales de consumo',
        primary: { label: 'Nuevo vale de consumo', modal: 'vale' },
        searchPlaceholder: 'Buscar por folio o profesional',
        filters: [{ label: 'Período', value: 'Sep 2026', icon: ic('calendar', 13) }, { label: 'Servicio', value: 'Todos', icon: ic('filter', 13) }],
        columns: cols('Folio', 'Fecha', 'Profesional', 'Servicio', ['Ítems', 'right'], 'Estado'),
        rows: [
          ['VC-02291', '14 sep 2026', 'Dra. Paulina Ibáñez', 'Urgencia', '14', ['CONSUMIDO', 'ok']],
          ['VC-02290', '14 sep 2026', 'Mat. Rosa Quintana', 'Matronería', '6', ['CONSUMIDO', 'ok']],
          ['VC-02288', '13 sep 2026', 'Dr. Andrés Molina', 'Medicina general', '9', ['CONSUMIDO', 'ok']],
          ['VC-02287', '13 sep 2026', 'Enf. Luis Carrasco', 'Sala de procedimientos', '11', ['PENDIENTE', 'warn']],
          ['VC-02283', '12 sep 2026', 'Dra. Paulina Ibáñez', 'Urgencia', '7', ['CONSUMIDO', 'ok']]
        ].map(r => ({
          cells: [mono(r[0]), txt(r[1]), txt(r[2]), txt(r[3]), mono(r[4], 'right'), badge(r[5][0], r[5][1])],
          actions: [{ icon: ic('eye', 14), title: 'Ver vale', go: this.open('vale') }, { icon: ic('printer', 14), title: 'Imprimir', fn: 'imprimirMovimientos' }]
        })),
        footer: 'Mostrando 5 de 318 vales de consumo'
      }
    ][t];
    return Object.assign({
      isList: true, eyebrow: 'FARMACIA · INTERFAZ 21', title: 'Movimientos (Farmacia)',
      secondary: [{ label: 'Exportar', icon: ic('download', 13), fn: 'exportarMovimientos' }, { label: 'Imprimir', icon: ic('printer', 13), fn: 'imprimirMovimientos' }],
      tabs: [
        { label: 'Donación', count: 9, i: 0 },
        { label: 'Traspaso', count: 21, i: 1 },
        { label: 'Despacho a cuentas internas', count: 142, i: 2 },
        { label: 'Vales de consumo', count: 318, i: 3 }
      ]
    }, cfg, { primary: { label: cfg.primary.label, go: this.open(cfg.primary.modal) } });
  }

  recepcionConsulta() {`;

const HASTA = `  movFarmacia() {
    const t = this.state.tab;
    const claves = ['farm_donacion', 'farm_traspaso', 'farm_despacho', 'farm_vale'];
    const rutas = ['/api/movimientos?tipo=donacion', '/api/movimientos?tipo=traspaso', '/api/movimientos?tipo=despacho', '/api/movimientos?tipo=vale_consumo'];
    const filas = this.cargarLista(claves[t], rutas[t]);
    const counts = claves.map(c => (this.state.listas[c] || []).length);

    const cfg = [
      {
        req: 'Anexo N°4 · bloque Movimientos de Farmacia · donación',
        primary: { label: 'Nueva donación', modal: 'donacion' },
        searchPlaceholder: 'Buscar por donante o artículo',
        filters: [],
        columns: cols('Fecha', 'Donante', 'Artículo', 'Lote', 'Vencimiento', ['Cantidad', 'right'], 'Estado'),
        rows: filas.map(m => {
          const lote = this.desanidar(m.lote);
          const articulo = this.desanidar(lote && lote.articulo);
          return {
            cells: [txt(this.fechaCorta(m.fecha_movimiento)), txt(m.observacion || '—'), txt(articulo ? articulo.nombre : '—'), mono(lote ? lote.numero_lote : ''), txt(lote ? lote.fecha_vencimiento : ''), mono(m.cantidad, 'right'), badge(m.estado, this.estadoMov(m.estado))],
            actions: []
          };
        }),
        footer: 'Mostrando ' + filas.length + ' donaciones reales'
      },
      {
        req: 'Anexo N°4 · traspaso entre bodegas del centro de salud',
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
        footer: 'Mostrando ' + filas.length + ' traspasos reales'
      },
      {
        req: 'Anexo N°4 · despacho a cuentas internas (centros de costo del establecimiento)',
        primary: { label: 'Nuevo despacho interno', modal: 'cuentas' },
        searchPlaceholder: 'Buscar por folio o cuenta interna',
        filters: [],
        columns: cols('Fecha', 'Centro de costo', ['Cantidad', 'right'], 'Estado'),
        rows: filas.map(m => {
          const centro = this.desanidar(m.centro_costo);
          return {
            cells: [txt(this.fechaCorta(m.fecha_movimiento)), txt(centro ? centro.nombre : '—'), mono(m.cantidad, 'right'), badge(m.estado, this.estadoMov(m.estado))],
            actions: []
          };
        }),
        footer: 'Mostrando ' + filas.length + ' despachos a cuentas internas reales'
      },
      {
        req: 'Anexo N°4 · vales de consumo',
        primary: { label: 'Nuevo vale de consumo', modal: 'vale' },
        searchPlaceholder: 'Buscar por folio o profesional',
        filters: [],
        columns: cols('Fecha', 'Centro de costo', 'Observación', ['Cantidad', 'right'], 'Estado'),
        rows: filas.map(m => {
          const centro = this.desanidar(m.centro_costo);
          return {
            cells: [txt(this.fechaCorta(m.fecha_movimiento)), txt(centro ? centro.nombre : '—'), txt(m.observacion || '—'), mono(m.cantidad, 'right'), badge(m.estado, this.estadoMov(m.estado))],
            actions: []
          };
        }),
        footer: 'Mostrando ' + filas.length + ' vales de consumo reales'
      }
    ][t];
    return Object.assign({
      isList: true, eyebrow: 'FARMACIA · INTERFAZ 21', title: 'Movimientos (Farmacia)',
      secondary: [{ label: 'Exportar', icon: ic('download', 13), fn: 'exportarMovimientos' }, { label: 'Imprimir', icon: ic('printer', 13), fn: 'imprimirMovimientos' }],
      tabs: [
        { label: 'Donación', count: counts[0], i: 0 },
        { label: 'Traspaso', count: counts[1], i: 1 },
        { label: 'Despacho a cuentas internas', count: counts[2], i: 2 },
        { label: 'Vales de consumo', count: counts[3], i: 3 }
      ]
    }, cfg, { primary: { label: cfg.primary.label, go: this.open(cfg.primary.modal) } });
  }

  recepcionConsulta() {`;

reemplazar(DESDE, HASTA);

lines[TEMPLATE_LINE] = JSON.stringify(template).replace(/<\//g, "<\\/");
fs.writeFileSync(filePath, lines.join("\n"));
console.log("OK. Paso 4 (movFarmacia) aplicado:", filePath);
