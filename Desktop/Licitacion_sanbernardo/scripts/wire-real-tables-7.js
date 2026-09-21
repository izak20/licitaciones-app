// Paso 7: recepcionConsulta() con datos reales (despachos/traspasos ya
// recepcionados, vía GET /api/despachos filtrado client-side).
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
    throw new Error("No se encontró el texto exacto (recepcionConsulta):\n" + desde.slice(0, 300));
  }
  template = template.replace(desde, hasta);
}

const DESDE = `  recepcionConsulta() {
    return {
      isList: true, eyebrow: 'FARMACIA · INTERFAZ 24', title: 'Consulta de recepción',
      req: 'Anexo N°4 · seleccionar Orden de Recepción a partir de Orden de Despacho · con o sin reparos',
      primary: { label: 'Nueva recepción', go: this.open('recepcionOD') },
      secondary: [{ label: 'Exportar', icon: ic('download', 13), fn: 'exportarRecepciones' }, { label: 'Imprimir', icon: ic('printer', 13), fn: 'imprimirRecepciones' }],
      searchPlaceholder: 'Buscar por N° de orden de despacho',
      filters: [{ label: 'Fecha', value: '01–15 sep 2026', icon: ic('calendar', 13) }, { label: 'Conformidad', value: 'Todas', icon: ic('filter', 13) }],
      columns: cols('N° recepción', 'Orden de despacho', 'Fecha recepción', 'Origen', ['Ítems', 'right'], 'Conformidad', 'Recibido por'),
      rows: [
        ['REC-02214', 'DES-04809', '14 sep 2026', 'Droguería Comunal', '45', ['SIN REPAROS', 'ok'], 'v.tapia'],
        ['REC-02213', 'DES-04805', '13 sep 2026', 'Droguería Comunal', '11', ['SIN REPAROS', 'ok'], 'd.fuentes'],
        ['REC-02211', 'DES-04799', '12 sep 2026', 'Droguería Comunal', '18', ['SIN REPAROS', 'ok'], 'v.tapia'],
        ['REC-02208', 'DES-04780', '11 sep 2026', 'Droguería Comunal', '22', ['CON REPAROS', 'bad'], 'j.alsina'],
        ['REC-02204', 'DES-04771', '10 sep 2026', 'Droguería Comunal', '41', ['SIN REPAROS', 'ok'], 'c.bravo'],
        ['REC-02199', 'DES-04766', '09 sep 2026', 'Droguería Comunal', '38', ['CON REPAROS', 'bad'], 'c.bravo']
      ].map(r => ({
        cells: [mono(r[0]), mono(r[1]), txt(r[2]), txt(r[3]), mono(r[4], 'right'), badge(r[5][0], r[5][1]), mono(r[6])],
        actions: [{ icon: ic('eye', 14), title: 'Ver recepción', go: this.open('recepcionOD') }, { icon: ic('printer', 14), title: 'Imprimir', fn: 'imprimirRecepciones' }]
      })),
      footer: 'Mostrando 6 de 214 recepciones · filtrable por fecha y N° de orden de despacho'
    };
  }`;

const HASTA = `  recepcionConsulta() {
    const filas = this.cargarLista('recepciones_od', '/api/despachos').filter(m => (m.estado || '').indexOf('recepcionado') === 0);
    return {
      isList: true, eyebrow: 'FARMACIA · INTERFAZ 24', title: 'Consulta de recepción',
      req: 'Anexo N°4 · seleccionar Orden de Recepción a partir de Orden de Despacho · con o sin reparos',
      primary: { label: 'Nueva recepción', go: this.open('recepcionOD') },
      secondary: [{ label: 'Exportar', icon: ic('download', 13), fn: 'exportarRecepciones' }, { label: 'Imprimir', icon: ic('printer', 13), fn: 'imprimirRecepciones' }],
      searchPlaceholder: 'Buscar por N° de orden de despacho',
      filters: [],
      columns: cols('Orden de despacho', 'Fecha recepción', 'Origen', ['Cantidad', 'right'], 'Conformidad'),
      rows: filas.map(m => {
        const origen = this.desanidar(m.bodega_origen);
        return {
          cells: [mono(m.folio || String(m.id_movimiento).slice(0, 8)), txt(this.fechaCorta(m.fecha_movimiento)), txt(origen ? origen.nombre : '—'), mono(m.cantidad, 'right'), badge(m.estado === 'recepcionado_con_reparos' ? 'CON REPAROS' : 'SIN REPAROS', this.estadoMov(m.estado))],
          actions: []
        };
      }),
      footer: 'Mostrando ' + filas.length + ' recepciones reales'
    };
  }`;

reemplazar(DESDE, HASTA);

lines[TEMPLATE_LINE] = JSON.stringify(template).replace(/<\//g, "<\\/");
fs.writeFileSync(filePath, lines.join("\n"));
console.log("OK. Paso 7 (recepcionConsulta) aplicado:", filePath);
