// La guía de despacho de una donación la emite quien la envía (el
// donante), no nosotros — a diferencia de un despacho propio, donde
// el sistema sí genera su propio folio (fn_siguiente_folio_despacho)
// porque ahí somos los responsables del envío. Acá sólo agregamos
// dónde anotar el número que el donante haya traído, si trajo uno
// (igual que "N° de factura o guía" ya existe en Recepción).
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

function reemplazar(desde, hasta, tag) {
  if (!template.includes(desde)) {
    throw new Error("No se encontró el texto exacto (" + tag + "):\n" + desde.slice(0, 400));
  }
  template = template.replace(desde, () => hasta);
}

// 1. Campo nuevo en el modal.
reemplazar(
  `      donacion: {
        eyebrow: 'INTERFAZ 21 · MODAL SOBRE MOVIMIENTOS (FARMACIA)', title: 'Nueva donación',
        width: '540px', cta: 'Registrar donación', ctaBg: 'var(--brand-blue)',
        fields: [
          inp('Donante', 'Cruz Roja Chilena', 2),
          inp('N° de acta de donación', 'DON-2026-041', 1),
          { label: 'Fecha de recepción', isInput: true, inputType: 'date', value: '2026-09-15', span: 1 },
          sel('Artículo', this.opcionesArticulos(), 2),
          inp('Lote', 'L-D0413'), { label: 'Fecha de vencimiento', isInput: true, inputType: 'date', value: campoValor('Fecha de vencimiento', '2029-08-02'), onInput: onCampo('Fecha de vencimiento'), span: 1 },
          inp('Cantidad', '400'), sel('Bodega de ingreso', this.opcionesBodegas(), 1),
          note('Las donaciones ingresan con trazabilidad por lote y vencimiento, igual que una recepción de proveedor, pero sin costo asociado.', 'info', 'info')
        ]
      },`,
  `      donacion: {
        eyebrow: 'INTERFAZ 21 · MODAL SOBRE MOVIMIENTOS (FARMACIA)', title: 'Nueva donación',
        width: '540px', cta: 'Registrar donación', ctaBg: 'var(--brand-blue)',
        fields: [
          inp('Donante', 'Cruz Roja Chilena', 2),
          inp('N° de acta de donación', 'DON-2026-041', 1),
          inp('N° de guía de despacho', campoValor('N° de guía de despacho', ''), 1, 'Si el donante no trajo guía, déjalo en blanco'),
          { label: 'Fecha de recepción', isInput: true, inputType: 'date', value: '2026-09-15', span: 1 },
          sel('Artículo', this.opcionesArticulos(), 2),
          inp('Lote', 'L-D0413'), { label: 'Fecha de vencimiento', isInput: true, inputType: 'date', value: campoValor('Fecha de vencimiento', '2029-08-02'), onInput: onCampo('Fecha de vencimiento'), span: 1 },
          inp('Cantidad', '400'), sel('Bodega de ingreso', this.opcionesBodegas(), 1),
          note('Las donaciones ingresan con trazabilidad por lote y vencimiento, igual que una recepción de proveedor, pero sin costo asociado. La guía de despacho la trae el donante — no la genera este sistema.', 'info', 'info')
        ]
      },`,
  "modal donacion",
);

// 2. Payload real: se manda sólo si se escribió algo (el campo es
//    opcional, como corresponde — no todas las donaciones llegan con
//    guía).
reemplazar(
  `    if (nombre === 'registrarDonacion') {
      const bodega = (this.state.refBodegas || []).find(b => b.nombre === leerModal('Bodega de ingreso'));
      const articulo = (this.state.refArticulos || []).find(a => a.nombre === leerModal('Artículo'));
      const acta = leerModal('N° de acta de donación');
      return {
        id_bodega: bodega && bodega.id_bodega,
        id_articulo: articulo && articulo.id_articulo,
        cantidad: this.numero(leerModal('Cantidad')),
        numero_lote: leerModal('Lote'),
        fecha_vencimiento: leerModal('Fecha de vencimiento'),
        donante: leerModal('Donante'),
        observacion: acta ? ('Acta: ' + acta) : undefined
      };
    }`,
  `    if (nombre === 'registrarDonacion') {
      const bodega = (this.state.refBodegas || []).find(b => b.nombre === leerModal('Bodega de ingreso'));
      const articulo = (this.state.refArticulos || []).find(a => a.nombre === leerModal('Artículo'));
      const acta = leerModal('N° de acta de donación');
      const guiaDespacho = leerModal('N° de guía de despacho');
      return {
        id_bodega: bodega && bodega.id_bodega,
        id_articulo: articulo && articulo.id_articulo,
        cantidad: this.numero(leerModal('Cantidad')),
        numero_lote: leerModal('Lote'),
        fecha_vencimiento: leerModal('Fecha de vencimiento'),
        donante: leerModal('Donante'),
        guia_despacho: guiaDespacho || undefined,
        observacion: acta ? ('Acta: ' + acta) : undefined
      };
    }`,
  "recolectarPayload registrarDonacion",
);

// 3. Columna para ver el número guardado (oculta por defecto, como
//    el resto de las columnas de referencia).
reemplazar(
  `        columns: cols('Fecha', 'Donante', 'Artículo', 'Lote', 'Vencimiento', ['Cantidad', 'right'], 'Estado'),
        rows: filasFiltradas.map(m => {
          const lote = this.desanidar(m.lote);
          const articulo = this.desanidar(lote && lote.articulo);
          return {
            cells: [txt(this.fechaCorta(m.fecha_movimiento)), txt(m.observacion || '—'), txt(articulo ? articulo.nombre : '—'), mono(lote ? lote.numero_lote : ''), txt(lote ? lote.fecha_vencimiento : ''), mono(m.cantidad, 'right'), badge(m.estado, this.estadoMov(m.estado))],
            actions: []
          };
        }),
        footer: 'Mostrando ' + filasFiltradas.length + ' de ' + filas.length + ' donaciones reales'`,
  `        columns: cols('Fecha', 'Donante', 'Artículo', 'Lote', 'Vencimiento', ['Cantidad', 'right'], 'Estado', ['Guía de despacho', 'left', 'extra']),
        rows: filasFiltradas.map(m => {
          const lote = this.desanidar(m.lote);
          const articulo = this.desanidar(lote && lote.articulo);
          return {
            cells: [txt(this.fechaCorta(m.fecha_movimiento)), txt(m.observacion || '—'), txt(articulo ? articulo.nombre : '—'), mono(lote ? lote.numero_lote : ''), txt(lote ? lote.fecha_vencimiento : ''), mono(m.cantidad, 'right'), badge(m.estado, this.estadoMov(m.estado)), txt(m.folio || '—')],
            actions: []
          };
        }),
        footer: 'Mostrando ' + filasFiltradas.length + ' de ' + filas.length + ' donaciones reales'`,
  "tabla donacion columna guia",
);

lines[TEMPLATE_LINE] = JSON.stringify(template).replace(/<\//g, "<\\/");
fs.writeFileSync(filePath, lines.join("\n"));
console.log("OK. Campo real de N° de guía de despacho en Donación:", filePath);
