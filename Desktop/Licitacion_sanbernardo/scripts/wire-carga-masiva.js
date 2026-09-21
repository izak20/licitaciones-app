// Carga masiva por Excel (con plantilla descargable) para Artículos,
// Proveedores, Bodegas, Centros de costo, Usuarios y Recepciones
// (stock inicial) — a pedido del usuario, extendiendo el patrón que
// ya existía solo para stock mín/máx.
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
    throw new Error("No se encontró el texto exacto (carga masiva):\n" + desde.slice(0, 300));
  }
  template = template.replace(desde, hasta);
}

// 1. Nuevas funciones API reales (no reemplazan mock, son nuevas).
reemplazar(
  `  recuperarContrasena:          p => mockRequest('recuperarContrasena', 'POST', '/auth/recuperar', p, 'Enviamos las instrucciones a tu correo')
};`,
  `  recuperarContrasena:          p => mockRequest('recuperarContrasena', 'POST', '/auth/recuperar', p, 'Enviamos las instrucciones a tu correo'),
  cargaMasivaArticulos:    p => (p && p.archivo instanceof File) ? apiUpload('/articulos/masivo/archivo', p.archivo, 'Artículos cargados') : mockRequest('cargaMasivaArticulos', 'POST', '/articulos/masivo/archivo', p, 'Artículos cargados'),
  cargaMasivaProveedores:  p => (p && p.archivo instanceof File) ? apiUpload('/proveedores/masivo/archivo', p.archivo, 'Proveedores cargados') : mockRequest('cargaMasivaProveedores', 'POST', '/proveedores/masivo/archivo', p, 'Proveedores cargados'),
  cargaMasivaBodegas:      p => (p && p.archivo instanceof File) ? apiUpload('/bodegas/masivo/archivo', p.archivo, 'Bodegas cargadas') : mockRequest('cargaMasivaBodegas', 'POST', '/bodegas/masivo/archivo', p, 'Bodegas cargadas'),
  cargaMasivaCentros:      p => (p && p.archivo instanceof File) ? apiUpload('/centros-costo/masivo/archivo', p.archivo, 'Centros de costo cargados') : mockRequest('cargaMasivaCentros', 'POST', '/centros-costo/masivo/archivo', p, 'Centros de costo cargados'),
  cargaMasivaUsuarios:     p => (p && p.archivo instanceof File) ? apiUpload('/usuarios/masivo/archivo', p.archivo, 'Usuarios cargados') : mockRequest('cargaMasivaUsuarios', 'POST', '/usuarios/masivo/archivo', p, 'Usuarios cargados'),
  cargaMasivaRecepciones:  p => (p && p.archivo instanceof File) ? apiUpload('/movimientos/recepciones/masivo/archivo', p.archivo, 'Recepciones cargadas') : mockRequest('cargaMasivaRecepciones', 'POST', '/movimientos/recepciones/masivo/archivo', p, 'Recepciones cargadas')
};`,
);

// 2. Toast con resumen: cuando la respuesta trae {aplicados, omitidos},
// el mensaje del toast debe reflejar cuántas filas se aplicaron y
// cuántas se omitieron, no solo "Artículos cargados". Se ajusta
// apiUpload para construir ese mensaje cuando el payload lo trae.
reemplazar(
  `function apiUpload(ruta, file, mensaje) {
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
}`,
  `function apiUpload(ruta, file, mensaje) {
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
      const cuerpo = data && 'data' in data ? data.data : data;
      let mensajeFinal = mensaje;
      if (cuerpo && typeof cuerpo.aplicados === 'number') {
        const omitidas = (cuerpo.omitidos || []).length;
        mensajeFinal = cuerpo.aplicados + ' fila(s) aplicadas' + (omitidas ? ', ' + omitidas + ' omitida(s) (ver consola)' : '');
        if (omitidas) console.warn('[Carga masiva] Filas omitidas:', cuerpo.omitidos);
      }
      return { ok: true, mensaje: mensajeFinal, data: cuerpo };
    })
    .catch(err => ({ ok: false, mensaje: (err && err.message) || 'Error de conexión', data: null }));
}`,
);

// 3. Botones "Plantilla Excel" / "Carga masiva" en cada listado.

// Artículos
reemplazar(
  `      secondary: [
        { label: 'Exportar a Excel', icon: ic('download', 13), fn: 'exportarArticulos' },
        { label: 'Imprimir', icon: ic('printer', 13), fn: 'imprimirArticulos' }
      ],`,
  `      secondary: [
        { label: 'Exportar a Excel', icon: ic('download', 13), fn: 'exportarArticulos' },
        { label: 'Imprimir', icon: ic('printer', 13), fn: 'imprimirArticulos' },
        { label: 'Plantilla Excel', icon: ic('download', 13), go: () => window.open(API_BASE + '/articulos/masivo/plantilla', '_blank') },
        { label: 'Carga masiva', icon: ic('upload', 13), go: () => this.elegirArchivo('cargaMasivaArticulos') }
      ],`,
);

// Proveedores
reemplazar(
  `      secondary: [{ label: 'Exportar', icon: ic('download', 13), fn: 'exportarProveedores' }],`,
  `      secondary: [
        { label: 'Exportar', icon: ic('download', 13), fn: 'exportarProveedores' },
        { label: 'Plantilla Excel', icon: ic('download', 13), go: () => window.open(API_BASE + '/proveedores/masivo/plantilla', '_blank') },
        { label: 'Carga masiva', icon: ic('upload', 13), go: () => this.elegirArchivo('cargaMasivaProveedores') }
      ],`,
);

// Usuarios
reemplazar(
  `        primary: { label: 'Nuevo usuario', go: this.open('usuario') },
        secondary: [],`,
  `        primary: { label: 'Nuevo usuario', go: this.open('usuario') },
        secondary: [
          { label: 'Plantilla Excel', icon: ic('download', 13), go: () => window.open(API_BASE + '/usuarios/masivo/plantilla', '_blank') },
          { label: 'Carga masiva', icon: ic('upload', 13), go: () => this.elegirArchivo('cargaMasivaUsuarios') }
        ],`,
);

// Bodegas
reemplazar(
  `        primary: { label: 'Agregar bodega', go: this.open('bodega') },
        secondary: [],`,
  `        primary: { label: 'Agregar bodega', go: this.open('bodega') },
        secondary: [
          { label: 'Plantilla Excel', icon: ic('download', 13), go: () => window.open(API_BASE + '/bodegas/masivo/plantilla', '_blank') },
          { label: 'Carga masiva', icon: ic('upload', 13), go: () => this.elegirArchivo('cargaMasivaBodegas') }
        ],`,
);

// Centros de costo
reemplazar(
  `        primary: { label: 'Nuevo centro de costo', go: this.open('centro') },
        secondary: [],`,
  `        primary: { label: 'Nuevo centro de costo', go: this.open('centro') },
        secondary: [
          { label: 'Plantilla Excel', icon: ic('download', 13), go: () => window.open(API_BASE + '/centros-costo/masivo/plantilla', '_blank') },
          { label: 'Carga masiva', icon: ic('upload', 13), go: () => this.elegirArchivo('cargaMasivaCentros') }
        ],`,
);

// Movimientos — Droguería, tab Recepción: plantilla/carga de stock inicial.
reemplazar(
  `      secondary: [
        { label: 'Exportar', icon: ic('download', 13), fn: 'exportarMovimientos' },
        { label: 'Imprimir', icon: ic('printer', 13), fn: 'imprimirMovimientos' }
      ],
      tabs: tabs.map((label, i) => ({ label, count: counts[i], i }))`,
  `      secondary: [
        { label: 'Exportar', icon: ic('download', 13), fn: 'exportarMovimientos' },
        { label: 'Imprimir', icon: ic('printer', 13), fn: 'imprimirMovimientos' }
      ].concat(t === 0 ? [
        { label: 'Plantilla Excel', icon: ic('download', 13), go: () => window.open(API_BASE + '/movimientos/recepciones/masivo/plantilla', '_blank') },
        { label: 'Carga masiva', icon: ic('upload', 13), go: () => this.elegirArchivo('cargaMasivaRecepciones') }
      ] : []),
      tabs: tabs.map((label, i) => ({ label, count: counts[i], i }))`,
);

lines[TEMPLATE_LINE] = JSON.stringify(template).replace(/<\//g, "<\\/");
fs.writeFileSync(filePath, lines.join("\n"));
console.log("OK. Carga masiva (6 entidades + plantillas) aplicada:", filePath);
