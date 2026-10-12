// La consulta GET /api/abastecimiento/ordenes trae la línea con
// articulo:id_articulo(nombre, codigo_interno) — sin pedir
// "id_articulo" dentro de ese join — así que linea.articulo.id_articulo
// siempre era undefined y el filtro de lotes nunca encontraba nada
// (comparaba contra undefined), aunque sí hubiera stock real.
// orden_abastecimiento_linea.id_articulo ya viene como columna plana
// en la misma línea (gracias al "*" del select), así que no hace
// falta tocar el backend: alcanza con leer linea.id_articulo en vez
// de linea.articulo.id_articulo.
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

function reemplazarTodas(desde, hasta, tag, esperadas) {
  const partes = template.split(desde);
  if (partes.length - 1 !== esperadas) {
    throw new Error(
      "Se esperaban " + esperadas + " coincidencias para '" + tag + "' pero se encontraron " + (partes.length - 1),
    );
  }
  template = partes.join(hasta);
}

function reemplazar(desde, hasta, tag) {
  if (!template.includes(desde)) {
    throw new Error("No se encontró el texto exacto (" + tag + "):\n" + desde.slice(0, 400));
  }
  template = template.replace(desde, () => hasta);
}

reemplazarTodas(
  `const lotesArt = (this.state.refLotes || []).filter(l => l.articulo && l.articulo.id_articulo === art.id_articulo);`,
  `const lotesArt = (this.state.refLotes || []).filter(l => l.articulo && l.articulo.id_articulo === linea.id_articulo);`,
  "lotesArt filter (modal + payload)",
  2,
);

reemplazar(
  `        const idArt = linea.articulo && linea.articulo.id_articulo;`,
  `        const idArt = linea.id_articulo;`,
  "submitAccion guard idArt",
);

lines[TEMPLATE_LINE] = JSON.stringify(template).replace(/<\//g, "<\\/");
fs.writeFileSync(filePath, lines.join("\n"));
console.log("OK. Filtro de lotes por artículo corregido (linea.id_articulo en vez de linea.articulo.id_articulo):", filePath);
