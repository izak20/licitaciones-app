// Probado en vivo: sc-camel-on-change en un <select> no dispara nada
// en este motor de plantillas (el evento DOM "change" sí se emite,
// pero el framework no lo está escuchando ahí) — por eso el aviso de
// rango de temperatura se quedaba pegado en la primera bodega.
// sc-camel-on-input sí es un mecanismo ya probado y funcionando en
// cada campo de texto de toda la app; un <select> también emite
// "input" al cambiar de opción, así que se reutiliza ese mismo canal
// en vez de "change".
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
    throw new Error("No se encontró el texto exacto (select oninput):\n" + desde.slice(0, 400));
  }
  template = template.replace(desde, () => hasta);
}

reemplazar(
  `<sc-raw-select sc-camel-on-change="{{ f.onChange }}" style="width:100%;height:34px;padding:0 9px;font-size:12.5px;border:1px solid var(--border-2);border-radius:4px;background:var(--surface);color:var(--fg-1)">`,
  `<sc-raw-select sc-camel-on-input="{{ f.onChange }}" style="width:100%;height:34px;padding:0 9px;font-size:12.5px;border:1px solid var(--border-2);border-radius:4px;background:var(--surface);color:var(--fg-1)">`,
);

lines[TEMPLATE_LINE] = JSON.stringify(template).replace(/<\//g, "<\\/");
fs.writeFileSync(filePath, lines.join("\n"));
console.log("OK. select ahora usa on-input (probado) en vez de on-change (no soportado):", filePath);
