// El usuario reportó dos pantallas de login distintas: la real (/login,
// Next.js + Supabase Auth) y una decorativa dentro de sistema.html que
// solo cambiaba state.screen sin cerrar/abrir sesión de verdad. Se
// unifica todo en una sola: el botón "Cerrar sesión" ahora hace un
// logout real (POST /api/auth/logout) y navega de verdad a /login; la
// pantalla de "login" decorativa (inalcanzable en el flujo normal,
// pero se deja igual de segura) también redirige a /login en vez de
// simular una sesión falsa.
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
    throw new Error("No se encontró el texto exacto (login unificado):\n" + desde.slice(0, 300));
  }
  template = template.replace(desde, hasta);
}

// 1. cerrarSesion: llamada real al logout de Supabase.
reemplazar(
  `  iniciarSesion:        p => mockRequest('iniciarSesion', 'POST', '/auth/login', p, 'Sesión iniciada'),
  cerrarSesion:         p => mockRequest('cerrarSesion', 'POST', '/auth/logout', p, 'Sesión cerrada'),`,
  `  iniciarSesion:        p => mockRequest('iniciarSesion', 'POST', '/auth/login', p, 'Sesión iniciada'),
  cerrarSesion:         p => apiFetch('POST', '/auth/logout', p, 'Sesión cerrada'),`,
);

// 2. logout real: cierra la sesión de Supabase y navega de verdad a
// /login (antes solo mostraba la pantalla decorativa, con la sesión
// real intacta en el servidor).
reemplazar(
  `      enter: () => { API.iniciarSesion({ usuario: 'm.orellana' }).then(() => {}); this.setState({ screen: 'app', page: 'inicio' }); },
      logout: () => { API.cerrarSesion().then(() => {}); this.setState({ screen: 'login', dd: null, toast: null }); },`,
  `      enter: () => { window.location.href = '/login'; },
      logout: () => { API.cerrarSesion().then(() => { window.location.href = '/login'; }); },`,
);

lines[TEMPLATE_LINE] = JSON.stringify(template).replace(/<\//g, "<\\/");
fs.writeFileSync(filePath, lines.join("\n"));
console.log("OK. Login unificado (logout real + pantalla falsa neutralizada):", filePath);
