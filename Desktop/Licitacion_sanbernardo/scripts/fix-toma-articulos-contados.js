// El usuario notó que en "Toma de inventario" no se podía saber cuántos
// artículos había cargado/contado cada responsable — importante cuando
// varias personas hacen su propia toma el mismo día. Se agrega una
// columna real "Artículos" (contados/total), visible por defecto (no
// "extra"), usando el conteo real que ahora calcula el backend.
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
    throw new Error("No se encontró el texto exacto (toma articulos contados):\n" + desde.slice(0, 400));
  }
  template = template.replace(desde, () => hasta);
}

reemplazar(
  `      columns: cols('Bodega', 'Alcance', 'Responsable', 'Estado', 'Fecha inicio', ['Segundo verificador', 'left', 'extra'], ['Conteo a ciegas', 'left', 'extra']),
      rows: tomas.map(tm => {
        const bodega = this.desanidar(tm.bodega);
        return {
          cells: [txt(bodega ? bodega.nombre : '—'), txt(tm.alcance), txt(tm.responsable || '—'), badge(tm.estado, tm.estado === 'cerrada' ? 'ok' : 'warn'), txt(this.fechaCorta(tm.fecha_inicio)), txt(tm.segundo_verificador || '—'), badge(tm.conteo_a_ciegas ? 'SÍ' : 'NO', tm.conteo_a_ciegas ? 'info' : 'neutral')],
          actions: []
        };
      }),
      footer: 'Mostrando ' + tomas.length + ' tomas de inventario reales'`,
  `      columns: cols('Bodega', 'Alcance', 'Responsable', ['Artículos', 'right'], 'Estado', 'Fecha inicio', ['Segundo verificador', 'left', 'extra'], ['Conteo a ciegas', 'left', 'extra']),
      rows: tomas.map(tm => {
        const bodega = this.desanidar(tm.bodega);
        const total = tm.total_articulos || 0;
        const contados = tm.articulos_contados || 0;
        return {
          cells: [txt(bodega ? bodega.nombre : '—'), txt(tm.alcance), txt(tm.responsable || '—'), mono(contados + ' de ' + total, 'right', contados === total && total > 0 ? B.ok[1] : 'var(--fg-1)'), badge(tm.estado, tm.estado === 'cerrada' ? 'ok' : 'warn'), txt(this.fechaCorta(tm.fecha_inicio)), txt(tm.segundo_verificador || '—'), badge(tm.conteo_a_ciegas ? 'SÍ' : 'NO', tm.conteo_a_ciegas ? 'info' : 'neutral')],
          actions: []
        };
      }),
      footer: 'Mostrando ' + tomas.length + ' tomas de inventario reales'`,
);

lines[TEMPLATE_LINE] = JSON.stringify(template).replace(/<\//g, "<\\/");
fs.writeFileSync(filePath, lines.join("\n"));
console.log("OK. Columna 'Artículos' (contados/total) en Toma de inventario:", filePath);
