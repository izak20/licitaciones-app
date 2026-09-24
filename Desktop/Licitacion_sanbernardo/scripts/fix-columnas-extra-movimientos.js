// Pasada más completa de columnas extra (agregar datos reales que ya
// existían pero no se mostraban), pedida explícitamente por el
// usuario para "todos los datos posibles". Cubre esta vez: las 4
// pestañas de Movimientos (el módulo más importante), Inventario
// (Toma), Abastecimiento (Faltantes) y Consulta de despachos.
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
    throw new Error("No se encontró el texto exacto (columnas extra movimientos):\n" + desde.slice(0, 400));
  }
  template = template.replace(desde, () => hasta);
}

// 1. Recepción: registrado por, observación y valor (cantidad × precio
// unitario del lote, cuando existe).
reemplazar(
  `        columns: cols('Fecha', 'Artículo', 'Lote', 'Vencimiento', 'Proveedor', 'Estado', ['Cantidad', 'right']),
        rows: filas.map(m => {
          const lote = this.desanidar(m.lote);
          const articulo = this.desanidar(lote && lote.articulo);
          const proveedor = this.desanidar(lote && lote.proveedor);
          return {
            cells: [txt(this.fechaCorta(m.fecha_movimiento)), stack(articulo ? articulo.nombre : '—', articulo ? articulo.codigo_interno : ''), mono(lote ? lote.numero_lote : ''), txt(lote ? lote.fecha_vencimiento : ''), txt(proveedor ? proveedor.razon_social : '—'), badge(m.estado, this.estadoMov(m.estado)), mono(m.cantidad, 'right')],
            actions: []
          };
        }),
        footer: 'Mostrando ' + filas.length + ' recepciones reales'`,
  `        columns: cols('Fecha', 'Artículo', 'Lote', 'Vencimiento', 'Proveedor', 'Estado', ['Cantidad', 'right'], ['Registrado por', 'left', 'extra'], ['Observación', 'left', 'extra'], ['Valor', 'right', 'extra']),
        rows: filas.map(m => {
          const lote = this.desanidar(m.lote);
          const articulo = this.desanidar(lote && lote.articulo);
          const proveedor = this.desanidar(lote && lote.proveedor);
          const valor = lote && lote.precio_unitario != null ? '$' + Math.round(m.cantidad * lote.precio_unitario).toLocaleString('es-CL') : 'sin precio';
          return {
            cells: [txt(this.fechaCorta(m.fecha_movimiento)), stack(articulo ? articulo.nombre : '—', articulo ? articulo.codigo_interno : ''), mono(lote ? lote.numero_lote : ''), txt(lote ? lote.fecha_vencimiento : ''), txt(proveedor ? proveedor.razon_social : '—'), badge(m.estado, this.estadoMov(m.estado)), mono(m.cantidad, 'right'), txt(m.registrado_por || '—'), txt(m.observacion || '—'), txt(valor, 'right')],
            actions: []
          };
        }),
        footer: 'Mostrando ' + filas.length + ' recepciones reales'`,
);

// 2. Despacho: le faltaba directamente el artículo despachado; se
// agrega junto a bodega origen, registrado por y observación.
reemplazar(
  `        columns: cols('Folio', 'Fecha', 'Centro de costo', ['Cantidad', 'right'], 'Estado'),
        rows: filas.map(m => {
          const centro = this.desanidar(m.centro_costo);
          return {
            cells: [mono(m.folio || '—'), txt(this.fechaCorta(m.fecha_movimiento)), txt(centro ? centro.nombre : '—'), mono(m.cantidad, 'right'), badge(m.estado, this.estadoMov(m.estado))],
            actions: []
          };
        }),
        footer: 'Mostrando ' + filas.length + ' despachos reales'`,
  `        columns: cols('Folio', 'Fecha', 'Centro de costo', ['Cantidad', 'right'], 'Estado', ['Artículo', 'left', 'extra'], ['Bodega origen', 'left', 'extra'], ['Registrado por', 'left', 'extra'], ['Observación', 'left', 'extra']),
        rows: filas.map(m => {
          const centro = this.desanidar(m.centro_costo);
          const lote = this.desanidar(m.lote);
          const articulo = this.desanidar(lote && lote.articulo);
          const origen = this.desanidar(m.bodega_origen);
          return {
            cells: [mono(m.folio || '—'), txt(this.fechaCorta(m.fecha_movimiento)), txt(centro ? centro.nombre : '—'), mono(m.cantidad, 'right'), badge(m.estado, this.estadoMov(m.estado)), txt(articulo ? articulo.nombre : '—'), txt(origen ? origen.nombre : '—'), txt(m.registrado_por || '—'), txt(m.observacion || '—')],
            actions: []
          };
        }),
        footer: 'Mostrando ' + filas.length + ' despachos reales'`,
);

// 3. Traspaso: registrado por y motivo.
reemplazar(
  `        columns: cols('Fecha', 'Bodega origen', 'Bodega destino', 'Artículo', 'Lote', ['Cantidad', 'right'], 'Estado'),
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
        footer: 'Mostrando ' + filas.length + ' traspasos reales · el ícono ↻ abre la confirmación de recepción'`,
  `        columns: cols('Fecha', 'Bodega origen', 'Bodega destino', 'Artículo', 'Lote', ['Cantidad', 'right'], 'Estado', ['Registrado por', 'left', 'extra'], ['Motivo', 'left', 'extra']),
        rows: filas.map(m => {
          const origen = this.desanidar(m.bodega_origen);
          const destino = this.desanidar(m.bodega_destino);
          const lote = this.desanidar(m.lote);
          const articulo = this.desanidar(lote && lote.articulo);
          const pendiente = m.estado === 'enviado' || m.estado === 'en_transito';
          return {
            cells: [txt(this.fechaCorta(m.fecha_movimiento)), txt(origen ? origen.nombre : '—'), txt(destino ? destino.nombre : '—'), txt(articulo ? articulo.nombre : '—'), mono(lote ? lote.numero_lote : ''), mono(m.cantidad, 'right'), badge(m.estado, this.estadoMov(m.estado)), txt(m.registrado_por || '—'), txt(m.observacion || '—')],
            actions: pendiente ? [{ icon: ic('refresh', 14), title: 'Recibir traspaso', go: () => { this.setState({ ultimoTraspasoId: m.id_movimiento }); this.open('recibir')(); } }] : []
          };
        }),
        footer: 'Mostrando ' + filas.length + ' traspasos reales · el ícono ↻ abre la confirmación de recepción'`,
);

// 4. Devolución: registrado por y bodega de origen.
reemplazar(
  `        columns: cols('Fecha', 'Proveedor', 'Artículo', 'Lote', ['Cantidad', 'right'], 'Motivo', 'Estado'),
        rows: filas.map(m => {
          const lote = this.desanidar(m.lote);
          const articulo = this.desanidar(lote && lote.articulo);
          const proveedor = this.desanidar(lote && lote.proveedor);
          return {
            cells: [txt(this.fechaCorta(m.fecha_movimiento)), txt(proveedor ? proveedor.razon_social : '—'), txt(articulo ? articulo.nombre : '—'), mono(lote ? lote.numero_lote : ''), mono(m.cantidad, 'right'), txt(m.observacion || '—'), badge(m.estado, this.estadoMov(m.estado))],
            actions: []
          };
        }),
        footer: 'Mostrando ' + filas.length + ' devoluciones reales'`,
  `        columns: cols('Fecha', 'Proveedor', 'Artículo', 'Lote', ['Cantidad', 'right'], 'Motivo', 'Estado', ['Registrado por', 'left', 'extra'], ['Bodega', 'left', 'extra']),
        rows: filas.map(m => {
          const lote = this.desanidar(m.lote);
          const articulo = this.desanidar(lote && lote.articulo);
          const proveedor = this.desanidar(lote && lote.proveedor);
          const origen = this.desanidar(m.bodega_origen);
          return {
            cells: [txt(this.fechaCorta(m.fecha_movimiento)), txt(proveedor ? proveedor.razon_social : '—'), txt(articulo ? articulo.nombre : '—'), mono(lote ? lote.numero_lote : ''), mono(m.cantidad, 'right'), txt(m.observacion || '—'), badge(m.estado, this.estadoMov(m.estado)), txt(m.registrado_por || '—'), txt(origen ? origen.nombre : '—')],
            actions: []
          };
        }),
        footer: 'Mostrando ' + filas.length + ' devoluciones reales'`,
);

// 5. Inventario (Toma): segundo verificador y si el conteo fue a ciegas.
reemplazar(
  `      columns: cols('Bodega', 'Alcance', 'Responsable', 'Estado', 'Fecha inicio'),
      rows: tomas.map(tm => {
        const bodega = this.desanidar(tm.bodega);
        return {
          cells: [txt(bodega ? bodega.nombre : '—'), txt(tm.alcance), txt(tm.responsable || '—'), badge(tm.estado, tm.estado === 'cerrada' ? 'ok' : 'warn'), txt(this.fechaCorta(tm.fecha_inicio))],
          actions: []
        };
      }),
      footer: 'Mostrando ' + tomas.length + ' tomas de inventario reales'`,
  `      columns: cols('Bodega', 'Alcance', 'Responsable', 'Estado', 'Fecha inicio', ['Segundo verificador', 'left', 'extra'], ['Conteo a ciegas', 'left', 'extra']),
      rows: tomas.map(tm => {
        const bodega = this.desanidar(tm.bodega);
        return {
          cells: [txt(bodega ? bodega.nombre : '—'), txt(tm.alcance), txt(tm.responsable || '—'), badge(tm.estado, tm.estado === 'cerrada' ? 'ok' : 'warn'), txt(this.fechaCorta(tm.fecha_inicio)), txt(tm.segundo_verificador || '—'), badge(tm.conteo_a_ciegas ? 'SÍ' : 'NO', tm.conteo_a_ciegas ? 'info' : 'neutral')],
          actions: []
        };
      }),
      footer: 'Mostrando ' + tomas.length + ' tomas de inventario reales'`,
);

// 6. Abastecimiento (Faltantes): stock máximo, ya se consultaba pero
// no se mostraba.
reemplazar(
  `        columns: cols('Artículo', 'Bodega', ['Stock actual', 'right'], ['Stock mínimo', 'right'], ['Déficit', 'right']),
        rows: faltantes.map(f => {
          const articulo = this.desanidar(f.articulo);
          const bodega = this.desanidar(f.bodega);
          return {
            cells: [txt(articulo ? articulo.nombre : '—'), txt(bodega ? bodega.nombre : '—'), mono(f.stock_actual, 'right'), mono(f.stock_minimo, 'right'), mono(f.stock_actual - f.stock_minimo, 'right', B.bad[1])],`,
  `        columns: cols('Artículo', 'Bodega', ['Stock actual', 'right'], ['Stock mínimo', 'right'], ['Déficit', 'right'], ['Stock máximo', 'right', 'extra']),
        rows: faltantes.map(f => {
          const articulo = this.desanidar(f.articulo);
          const bodega = this.desanidar(f.bodega);
          return {
            cells: [txt(articulo ? articulo.nombre : '—'), txt(bodega ? bodega.nombre : '—'), mono(f.stock_actual, 'right'), mono(f.stock_minimo, 'right'), mono(f.stock_actual - f.stock_minimo, 'right', B.bad[1]), mono(f.stock_maximo, 'right')],`,
);

// 7. Consulta de despachos: qué artículo y desde qué bodega, datos que
// ya llegaban en la respuesta pero no se mostraban.
reemplazar(
  `      columns: cols('Folio', 'Fecha despacho', 'Tipo', 'Destino', ['Cantidad', 'right'], 'Estado'),
      rows: filas.map(m => {
        const centro = this.desanidar(m.centro_costo);
        const destino = this.desanidar(m.bodega_destino);
        return {
          cells: [mono(m.folio || '—'), txt(this.fechaCorta(m.fecha_movimiento)), txt(m.tipo), txt(centro ? centro.nombre : (destino ? destino.nombre : '—')), mono(m.cantidad, 'right'), badge(m.estado, this.estadoMov(m.estado))],`,
  `      columns: cols('Folio', 'Fecha despacho', 'Tipo', 'Destino', ['Cantidad', 'right'], 'Estado', ['Artículo', 'left', 'extra'], ['Bodega origen', 'left', 'extra']),
      rows: filas.map(m => {
        const centro = this.desanidar(m.centro_costo);
        const destino = this.desanidar(m.bodega_destino);
        const lote = this.desanidar(m.lote);
        const articulo = this.desanidar(lote && lote.articulo);
        const origen = this.desanidar(m.bodega_origen);
        return {
          cells: [mono(m.folio || '—'), txt(this.fechaCorta(m.fecha_movimiento)), txt(m.tipo), txt(centro ? centro.nombre : (destino ? destino.nombre : '—')), mono(m.cantidad, 'right'), badge(m.estado, this.estadoMov(m.estado)), txt(articulo ? articulo.nombre : '—'), txt(origen ? origen.nombre : '—')],`,
);

lines[TEMPLATE_LINE] = JSON.stringify(template).replace(/<\//g, "<\\/");
fs.writeFileSync(filePath, lines.join("\n"));
console.log("OK. Columnas extra: Movimientos (4 tabs), Inventario, Abastecimiento, Despachos:", filePath);
