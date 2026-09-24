// Texto residual de la época "clic para ver el detalle" en el
// gráfico de temperatura, ahora que el tooltip es por hover.
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
    throw new Error("No se encontró el texto exacto (tooltip copy hover):\n" + desde.slice(0, 400));
  }
  template = template.replace(desde, () => hasta);
}

reemplazar(
  `        subtitle: 'Real · últimos ' + recientes.length + ' registros · toca un punto para ver el detalle',`,
  `        subtitle: 'Real · últimos ' + recientes.length + ' registros · pasa el cursor sobre un punto para ver el detalle',`,
);

lines[TEMPLATE_LINE] = JSON.stringify(template).replace(/<\//g, "<\\/");
fs.writeFileSync(filePath, lines.join("\n"));
console.log("OK. Texto del subtítulo actualizado a hover:", filePath);
