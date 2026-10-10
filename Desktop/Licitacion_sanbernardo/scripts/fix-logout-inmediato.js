// El usuario reportó que "no puedo cerrar sesión" junto con que la
// app anda lenta. Causa real: el botón esperaba a que /api/auth/logout
// respondiera ANTES de navegar a /login — si el servidor está lento en
// ese momento (carga, red), el clic se siente colgado varios segundos.
// Se separa: la navegación a /login ocurre al instante, y la llamada
// que limpia la sesión en el servidor se dispara en paralelo con
// keepalive:true para que el navegador la complete igual aunque la
// página ya esté navegando a otro lado (si no, al salir de la página
// el navegador puede cancelar un fetch en curso y la sesión del
// servidor quedaría sin cerrar de verdad).
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
    throw new Error("No se encontró el texto exacto (logout inmediato):\n" + desde.slice(0, 400));
  }
  template = template.replace(desde, () => hasta);
}

reemplazar(
  `      logout: () => { API.cerrarSesion().then(() => { window.location.href = '/login'; }); },`,
  `      logout: () => {
        try { fetch(API_BASE + '/auth/logout', { method: 'POST', keepalive: true }).catch(() => {}); } catch (e) {}
        window.location.href = '/login';
      },`,
);

lines[TEMPLATE_LINE] = JSON.stringify(template).replace(/<\//g, "<\\/");
fs.writeFileSync(filePath, lines.join("\n"));
console.log("OK. Cerrar sesión navega al instante (keepalive para la llamada real):", filePath);
