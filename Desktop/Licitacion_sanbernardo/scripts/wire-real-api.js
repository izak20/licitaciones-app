// One-off script: reemplaza en el HTML del frontend las funciones mock
// de Maestros (artículos, proveedores) y Movimientos (recepción,
// despacho, traspaso) por llamadas fetch() reales a las rutas de API,
// preservando intacto el resto del archivo (fuentes, runtime del
// bundler, demás funciones mock).
const fs = require("fs");
const path = require("path");

const filePath = path.join(
  __dirname,
  "..",
  "Sistema de gestion de bodegas (2).html",
);
const html = fs.readFileSync(filePath, "utf8");
const lines = html.split("\n");

const TEMPLATE_LINE = 392; // 0-indexed => línea 393 del archivo
let template = JSON.parse(lines[TEMPLATE_LINE]);

const apiHelper = `
function apiFetch(metodo, ruta, payload, mensaje) {
  const opciones = { method: metodo, headers: {} };
  if (payload !== undefined && payload !== null && metodo !== 'GET') {
    opciones.headers['Content-Type'] = 'application/json';
    opciones.body = JSON.stringify(payload);
  }
  return fetch(API_BASE + ruta, opciones)
    .then(async r => {
      let data = null;
      try { data = await r.json(); } catch (e) {}
      if (!r.ok) {
        const err = data && data.error;
        const texto = typeof err === 'string' ? err : (err ? JSON.stringify(err) : ('Error ' + r.status));
        return { ok: false, mensaje: texto, data: null };
      }
      return { ok: true, mensaje: mensaje, data: data && 'data' in data ? data.data : data };
    })
    .catch(err => ({ ok: false, mensaje: (err && err.message) || 'Error de conexión', data: null }));
}

function apiUpload(ruta, file, mensaje) {
  const formData = new FormData();
  formData.append('file', file);
  return fetch(API_BASE + ruta, { method: 'POST', body: formData })
    .then(async r => {
      let data = null;
      try { data = await r.json(); } catch (e) {}
      if (!r.ok) {
        const err = data && data.error;
        const texto = typeof err === 'string' ? err : (err ? JSON.stringify(err) : ('Error ' + r.status));
        return { ok: false, mensaje: texto, data: null };
      }
      return { ok: true, mensaje: mensaje, data: data && 'data' in data ? data.data : data };
    })
    .catch(err => ({ ok: false, mensaje: (err && err.message) || 'Error de conexión', data: null }));
}
`;

const marker = "const API = {";
const markerIndex = template.indexOf(marker);
if (markerIndex === -1) {
  throw new Error("No se encontró 'const API = {' en el template");
}
template =
  template.slice(0, markerIndex) + apiHelper + "\n" + template.slice(markerIndex);

const replacements = [
  {
    from: "guardarArticulo:      p => mockRequest('guardarArticulo', 'POST', '/articulos', p, 'Artículo guardado'),",
    to: "guardarArticulo:      p => apiFetch('POST', '/articulos', p, 'Artículo guardado'),",
  },
  {
    from: "exportarArticulos:    p => mockRequest('exportarArticulos', 'GET', '/articulos/export', p, 'Exportación de artículos lista'),",
    to: "exportarArticulos:    p => apiFetch('GET', '/articulos/export', p, 'Exportación de artículos lista'),",
  },
  {
    from: "actualizarViaAdministracion: p => mockRequest('actualizarViaAdministracion', 'PATCH', '/articulos/:id/vias', p, 'Vías de administración actualizadas'),",
    to: "actualizarViaAdministracion: p => apiFetch('PATCH', '/articulos/' + ((p && p.id) || '') + '/vias', p, 'Vías de administración actualizadas'),",
  },
  {
    from: "guardarProveedor:     p => mockRequest('guardarProveedor', 'POST', '/proveedores', p, 'Proveedor guardado'),",
    to: "guardarProveedor:     p => apiFetch('POST', '/proveedores', p, 'Proveedor guardado'),",
  },
  {
    from: "exportarListaPrecios: p => mockRequest('exportarListaPrecios', 'GET', '/proveedores/:id/lista-precios', p, 'Lista de precios exportada'),",
    to: "exportarListaPrecios: p => apiFetch('GET', '/proveedores/' + ((p && p.id) || '') + '/lista-precios', p, 'Lista de precios exportada'),",
  },
  {
    from: "registrarRecepcion:   p => mockRequest('registrarRecepcion', 'POST', '/movimientos/recepciones', p, 'Recepción registrada'),",
    to: "registrarRecepcion:   p => apiFetch('POST', '/movimientos/recepciones', p, 'Recepción registrada'),",
  },
  {
    from: "emitirDespacho:       p => mockRequest('emitirDespacho', 'POST', '/movimientos/despachos', p, 'Guía de despacho emitida'),",
    to: "emitirDespacho:       p => apiFetch('POST', '/movimientos/despachos', p, 'Guía de despacho emitida'),",
  },
  {
    from: "registrarTraspaso:    p => mockRequest('registrarTraspaso', 'POST', '/movimientos/traspasos', p, 'Traspaso registrado'),",
    to: "registrarTraspaso:    p => apiFetch('POST', '/movimientos/traspasos', p, 'Traspaso registrado'),",
  },
  {
    from: "recibirTraspaso:      p => mockRequest('recibirTraspaso', 'POST', '/movimientos/traspasos/:id/recepcion', p, 'Traspaso recibido'),",
    to: "recibirTraspaso:      p => apiFetch('POST', '/movimientos/traspasos/' + ((p && p.id) || '') + '/recepcion', p, 'Traspaso recibido'),",
  },
  {
    from: "adjuntarDocumentoProveedor:   p => mockRequest('adjuntarDocumentoProveedor', 'POST', '/proveedores/:id/documentos', p, 'Documento adjuntado'),",
    to: "adjuntarDocumentoProveedor:   p => (p && p.archivo instanceof File) ? apiUpload('/proveedores/' + ((p && p.id) || '') + '/documentos', p.archivo, 'Documento adjuntado') : mockRequest('adjuntarDocumentoProveedor', 'POST', '/proveedores/:id/documentos', p, 'Documento adjuntado'),",
  },
];

let missing = [];
for (const r of replacements) {
  if (!template.includes(r.from)) {
    missing.push(r.from);
    continue;
  }
  template = template.replace(r.from, r.to);
}

if (missing.length) {
  console.error("No se encontraron estas líneas exactas:");
  missing.forEach((m) => console.error(" - " + m));
  process.exit(1);
}

// Escapar "</" evita que el HTML parser corte el <script> del bundle
// en el primer "</script>" literal que aparezca dentro del contenido
// (p.ej. el que cierra el <script src="...babel..."> del propio template).
lines[TEMPLATE_LINE] = JSON.stringify(template).replace(/<\//g, "<\\/");
fs.writeFileSync(filePath, lines.join("\n"));
console.log("OK. Archivo actualizado:", filePath);
