// Paso 5: despachosConsulta() con datos reales (GET /api/despachos).
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
    throw new Error("No se encontró el texto exacto (despachosConsulta):\n" + desde.slice(0, 300));
  }
  template = template.replace(desde, hasta);
}

const DESDE = `  despachosConsulta() {
    return {
      isList: true, eyebrow: 'DROGUERÍA · INTERFAZ 19', title: 'Consulta de despachos',
      req: 'Anexo N°4 · consultar Orden de Despacho por tipo · aviso cuando exista recepción con diferencias',
      primary: null,
      secondary: [{ label: 'Exportar', icon: ic('download', 13), fn: 'exportarDespachos' }, { label: 'Imprimir', icon: ic('printer', 13), fn: 'imprimirDespachos' }],
      searchPlaceholder: 'Buscar por folio o destino',
      filters: [{ label: 'Tipo', value: 'Todos', icon: ic('filter', 13) }, { label: 'Período', value: 'Sep 2026', icon: ic('calendar', 13) }],
      banner: { bg: B.bad[0], border: B.bad[2], fg: B.bad[1], icon: ic('alert', 15), text: 'Dos recepciones registran diferencias respecto de la orden de despacho. El sistema ya emitió el aviso automático al centro de notificaciones.' },
      columns: cols('Folio', 'Fecha despacho', 'Destino', ['Ítems', 'right'], 'Tipo de recepción', 'Aviso'),
      rows: [
        ['DES-04780', '11 sep 2026', CENTROS[1], 'CC-1043', '22', ['RECEPCIONADA CON REPAROS', 'bad'], [['AVISO EMITIDO', 'bad', 'alert']]],
        ['DES-04766', '09 sep 2026', CENTROS[3], 'CC-1051', '38', ['RECEPCIONADA CON REPAROS', 'bad'], [['AVISO EMITIDO', 'bad', 'alert']]],
        ['DES-04812', '14 sep 2026', CENTROS[0], 'CC-1042', '32', ['PROCESADA', 'neutral'], []],
        ['DES-04811', '14 sep 2026', CENTROS[1], 'CC-1043', '18', ['PROCESADA', 'neutral'], []],
        ['DES-04809', '13 sep 2026', CENTROS[3], 'CC-1051', '45', ['RECEPCIONADA SIN REPAROS', 'ok'], []],
        ['DES-04805', '13 sep 2026', CENTROS[2], 'CC-1044', '11', ['RECEPCIONADA SIN REPAROS', 'ok'], []],
        ['DES-04799', '12 sep 2026', CENTROS[0], 'CC-1042', '18', ['RECEPCIONADA SIN REPAROS', 'ok'], []]
      ].map(r => ({
        cells: [mono(r[0]), txt(r[1]), stack(r[2], r[3]), mono(r[4], 'right'), badge(r[5][0], r[5][1]), flags(r[6])],
        actions: [{ icon: ic('eye', 14), title: 'Ver detalle de recepción', go: this.open('reparos') }, { icon: ic('printer', 14), title: 'Imprimir', fn: 'imprimirDespachos' }]
      })),
      footer: 'Mostrando 7 de 96 órdenes de despacho · filtrable por Procesada · Sin reparos · Con reparos'
    };
  }

  analisis(farmacia) {`;

const HASTA = `  despachosConsulta() {
    const filas = this.cargarLista('despachos_consulta', '/api/despachos');
    return {
      isList: true, eyebrow: 'DROGUERÍA · INTERFAZ 19', title: 'Consulta de despachos',
      req: 'Anexo N°4 · consultar Orden de Despacho por tipo · aviso cuando exista recepción con diferencias',
      primary: null,
      secondary: [{ label: 'Exportar', icon: ic('download', 13), fn: 'exportarDespachos' }, { label: 'Imprimir', icon: ic('printer', 13), fn: 'imprimirDespachos' }],
      searchPlaceholder: 'Buscar por folio o destino',
      filters: [],
      columns: cols('Folio', 'Fecha despacho', 'Tipo', 'Destino', ['Cantidad', 'right'], 'Estado'),
      rows: filas.map(m => {
        const centro = this.desanidar(m.centro_costo);
        const destino = this.desanidar(m.bodega_destino);
        return {
          cells: [mono(m.folio || '—'), txt(this.fechaCorta(m.fecha_movimiento)), txt(m.tipo), txt(centro ? centro.nombre : (destino ? destino.nombre : '—')), mono(m.cantidad, 'right'), badge(m.estado, this.estadoMov(m.estado))],
          actions: m.estado === 'enviado' || m.estado === 'en_transito' ? [{ icon: ic('alert', 14), title: 'Registrar diferencias', go: () => { const obs = window.prompt('Describe la diferencia encontrada:'); if (obs) this.run('gestionarDiferencia', { id: m.id_movimiento, observacion: obs })(); } }] : []
        };
      }),
      footer: 'Mostrando ' + filas.length + ' despachos/traspasos reales'
    };
  }

  analisis(farmacia) {`;

reemplazar(DESDE, HASTA);

// Ahora que despachosConsulta() usa ids reales, se puede cablear
// gestionarDiferencia (antes quedaba deliberadamente sin conectar por
// no tener de dónde sacar un id real).
reemplazar(
  `  gestionarDiferencia:  p => mockRequest('gestionarDiferencia', 'POST', '/despachos/:id/diferencias', p, 'Diferencia enviada a gestión'),`,
  `  gestionarDiferencia:  p => apiFetch('POST', '/despachos/' + ((p && p.id) || '') + '/diferencias', p, 'Diferencia registrada y aviso emitido'),`,
);

lines[TEMPLATE_LINE] = JSON.stringify(template).replace(/<\//g, "<\\/");
fs.writeFileSync(filePath, lines.join("\n"));
console.log("OK. Paso 5 (despachosConsulta) aplicado:", filePath);
