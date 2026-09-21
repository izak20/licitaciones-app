// Paso 6: analisis() tabla con datos reales (GET /api/analisis-consumo/detalle).
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
    throw new Error("No se encontró el texto exacto (analisis):\n" + desde.slice(0, 300));
  }
  template = template.replace(desde, hasta);
}

reemplazar(
  `      columns: cols('Familia', 'Grupo', ['Sep 2026', 'right'], ['Sep 2025', 'right'], ['Variación', 'right'], ['Participación', 'right']),
      rows: rows.map(r => ({
        cells: [txt(r[0]), txt(r[1]), mono(r[2], 'right'), mono(r[3], 'right'), mono(r[4], 'right', B[r[5]][1]), mono(r[6], 'right')],
        actions: [{ icon: ic('chevRight', 14), title: 'Desglosar por producto', fn: 'desglosarPorProducto' }]
      })),
      footer: 'Agrupación disponible por grupo, familia, subfamilia y producto'
    };
  }`,
  `      columns: cols('Grupo/artículo', ['Cantidad total', 'right'], ['N° de movimientos', 'right']),
      rows: this.cargarLista('analisis_detalle', '/api/analisis-consumo/detalle?agrupar=familia').map(r => ({
        cells: [txt(r.clave), mono(r.cantidad_total, 'right'), mono(r.movimientos, 'right')],
        actions: [{ icon: ic('chevRight', 14), title: 'Desglosar por producto', fn: 'desglosarPorProducto' }]
      })),
      footer: 'Mostrando ' + (this.state.listas.analisis_detalle || []).length + ' familias con consumo real'
    };
  }`,
);

lines[TEMPLATE_LINE] = JSON.stringify(template).replace(/<\//g, "<\\/");
fs.writeFileSync(filePath, lines.join("\n"));
console.log("OK. Paso 6 (analisis) aplicado:", filePath);
