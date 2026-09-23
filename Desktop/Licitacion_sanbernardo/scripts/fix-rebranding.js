// Cambio de marca pedido por el usuario: nombre "PMS-Panalbit" y logo
// nuevo (escudo de la Ilustre Municipalidad de San Bernardo, ya
// copiado a public/logo.jpeg). Se reemplaza el logo (dos <img>: el del
// sidebar real y el de la pantalla de login decorativa, que comparten
// el mismo ID de asset) y el nombre visible en el sidebar. No se toca
// "Droguería Comunal" donde se refiere a la bodega real (un dato de
// negocio, no el nombre de la plataforma).
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

function reemplazarTodas(desde, hasta) {
  if (!template.includes(desde)) {
    throw new Error("No se encontró el texto exacto (rebranding):\n" + desde.slice(0, 400));
  }
  template = template.split(desde).join(hasta);
}
function reemplazar(desde, hasta) {
  if (!template.includes(desde)) {
    throw new Error("No se encontró el texto exacto (rebranding):\n" + desde.slice(0, 400));
  }
  template = template.replace(desde, () => hasta);
}

// 1. Logo: las dos apariciones comparten exactamente el mismo id de
// asset -> reemplazo global seguro.
reemplazarTodas(
  `src="a4d0c7d6-8510-430f-b7c6-74bdc224c5ee"`,
  `src="/logo.jpeg"`,
);

// 2. Nombre de la plataforma en el sidebar real (lo que se ve siempre
// que se navega la app, a diferencia de la pantalla de login decorativa
// que no es alcanzable en producción).
reemplazar(
  `<div style="font-size:13px;font-weight:600;letter-spacing:-0.01em;line-height:1.2">Droguería Comunal</div>
<div style="font-size:10px;color:var(--fg-3);line-height:1.2">San Bernardo</div>`,
  `<div style="font-size:13px;font-weight:600;letter-spacing:-0.01em;line-height:1.2">PMS-Panalbit</div>
<div style="font-size:10px;color:var(--fg-3);line-height:1.2">San Bernardo</div>`,
);

lines[TEMPLATE_LINE] = JSON.stringify(template).replace(/<\//g, "<\\/");
fs.writeFileSync(filePath, lines.join("\n"));
console.log("OK. Rebranding aplicado (logo + nombre PMS-Panalbit):", filePath);
