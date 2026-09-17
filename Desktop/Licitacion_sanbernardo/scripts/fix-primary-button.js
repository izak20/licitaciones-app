// One-off script: corrige un bug preexistente del mockup (ya presente
// antes de cualquier cableado a datos reales) — varias páginas
// (inventario, abastecimiento, temperatura) devuelven
// `primary: { label, modal }` esperando que algo lo convierta en
// `primary.go`, pero solo movimientos() y movFarmacia() hacían esa
// conversión ellos mismos. El resto quedaba con page.primary.go
// undefined: el botón "Nueva X" no hacía nada al hacer clic.
//
// Fix genérico en renderVals() (mismo lugar donde ya se resuelve
// "secondary"), en vez de parchar cada método de página por separado.
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
    throw new Error("No se encontró el texto exacto:\n" + desde);
  }
  template = template.replace(desde, hasta);
}

reemplazar(
  `      secondary: (page.secondary || []).map(a => Object.assign({}, a, { go: a.go || this.run(a.fn) })),`,
  `      secondary: (page.secondary || []).map(a => Object.assign({}, a, { go: a.go || this.run(a.fn) })),
      primary: page.primary ? Object.assign({}, page.primary, { go: page.primary.go || (page.primary.modal ? this.open(page.primary.modal) : undefined) }) : null,`,
);

lines[TEMPLATE_LINE] = JSON.stringify(template).replace(/<\//g, "<\\/");
fs.writeFileSync(filePath, lines.join("\n"));
console.log("OK. Botón primary con modal corregido:", filePath);
