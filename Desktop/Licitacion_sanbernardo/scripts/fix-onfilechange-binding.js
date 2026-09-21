// Bug real: sc-camel-on-change="{{ onFileChange }}" necesita que
// "onFileChange" exista como clave en el objeto que arma renderVals()
// (igual que closeAll/toggleBodega/etc.), no basta con definirlo como
// método de la clase. Sin este fix, el input de archivo real nunca
// dispara su handler: cualquier carga masiva o adjunto de documento
// quedaba muda.
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
    throw new Error("No se encontró el texto exacto (onFileChange binding):\n" + desde.slice(0, 300));
  }
  template = template.replace(desde, hasta);
}

reemplazar(
  `      openEliminar: this.open('eliminar'),
      closeAll: this.close,`,
  `      openEliminar: this.open('eliminar'),
      closeAll: this.close,
      onFileChange: this.onFileChange,`,
);

lines[TEMPLATE_LINE] = JSON.stringify(template).replace(/<\//g, "<\\/");
fs.writeFileSync(filePath, lines.join("\n"));
console.log("OK. onFileChange conectado en renderVals():", filePath);
