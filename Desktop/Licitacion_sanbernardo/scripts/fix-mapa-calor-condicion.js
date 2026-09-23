// Bug real reportado por el usuario: al llegar el dato real, el mapa
// de calor se quedaba completamente en blanco (ni el mensaje de "sin
// datos" ni la grilla). Causa: los dos bloques sc-if usaban la MISMA
// condición value="{{ page.tilesVacio }}" (solo cambiaba el hint de
// skeleton, que no afecta el render real) — cuando tilesVacio pasaba a
// false (sí hay datos), NINGUNO de los dos bloques calzaba. Se agrega
// un booleano independiente (hayTiles) para la grilla.
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
    throw new Error("No se encontró el texto exacto (mapa calor condicion):\n" + desde.slice(0, 400));
  }
  template = template.replace(desde, () => hasta);
}

// 1. Nuevo booleano independiente en el page-builder.
reemplazar(
  `      tiles,
      tilesVacio: tiles.length === 0,`,
  `      tiles,
      tilesVacio: tiles.length === 0,
      hayTiles: tiles.length > 0,`,
);

// 2. La grilla debe mostrarse cuando SÍ hay datos, no reutilizando la
// misma condición que el mensaje de "sin datos".
reemplazar(
  `<sc-if value="{{ page.tilesVacio }}" hint-placeholder-val="{{ true }}">
<div style="display:grid;grid-template-columns:repeat(auto-fill, minmax(210px, 1fr));gap:12px">`,
  `<sc-if value="{{ page.hayTiles }}" hint-placeholder-val="{{ true }}">
<div style="display:grid;grid-template-columns:repeat(auto-fill, minmax(210px, 1fr));gap:12px">`,
);

lines[TEMPLATE_LINE] = JSON.stringify(template).replace(/<\//g, "<\\/");
fs.writeFileSync(filePath, lines.join("\n"));
console.log("OK. Mapa de calor: condición de la grilla corregida:", filePath);
