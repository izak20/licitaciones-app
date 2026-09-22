// Bug real reportado por el usuario: los botones de "Plantilla Excel" y
// de descarga de exportaciones usaban window.open(ruta, '_blank'), que
// abre una navegación de nivel superior en una pestaña nueva — en
// varios navegadores/perfiles eso no siempre reenvía las cookies de
// sesión de forma confiable, y además puede toparse con el bloqueador
// de pop-ups. Se reemplaza por una descarga real vía fetch() con
// credenciales de la propia página (mismo mecanismo que ya usan todas
// las demás llamadas a la API, que sí funcionan) + un <a download>
// generado en memoria.
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
    throw new Error("No se encontró el texto exacto (fix descargas):\n" + desde.slice(0, 300));
  }
  template = template.replace(desde, hasta);
}

// 1. Helper de descarga real.
reemplazar(
  `  elegirArchivo = (fn, opts) => {`,
  `  descargarArchivo = (ruta, nombreArchivo) => {
    fetch(API_BASE + ruta, { credentials: 'same-origin' })
      .then(r => {
        if (!r.ok) throw new Error('No se pudo descargar (' + r.status + ')');
        return r.blob();
      })
      .then(blob => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = nombreArchivo;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      })
      .catch(err => this.mostrarError('descargarArchivo', (err && err.message) || 'Error al descargar'));
  };

  elegirArchivo = (fn, opts) => {`,
);

// 2. Los 7 puntos que usaban window.open pasan a usar descargarArchivo.
reemplazar(
  `go: () => window.open(API_BASE + '/movimientos/recepciones/masivo/plantilla', '_blank')`,
  `go: () => this.descargarArchivo('/movimientos/recepciones/masivo/plantilla', 'plantilla-recepciones.xlsx')`,
);
reemplazar(
  `go: () => window.open(API_BASE + '/usuarios/masivo/plantilla', '_blank')`,
  `go: () => this.descargarArchivo('/usuarios/masivo/plantilla', 'plantilla-usuarios.xlsx')`,
);
reemplazar(
  `go: () => window.open(API_BASE + '/bodegas/masivo/plantilla', '_blank')`,
  `go: () => this.descargarArchivo('/bodegas/masivo/plantilla', 'plantilla-bodegas.xlsx')`,
);
reemplazar(
  `go: () => window.open(API_BASE + '/centros-costo/masivo/plantilla', '_blank')`,
  `go: () => this.descargarArchivo('/centros-costo/masivo/plantilla', 'plantilla-centros-costo.xlsx')`,
);
reemplazar(
  `go: () => window.open(API_BASE + '/exportaciones/' + e.id_exportacion + '/descarga', '_blank')`,
  `go: () => this.descargarArchivo('/exportaciones/' + e.id_exportacion + '/descarga', 'exportacion-' + e.id_exportacion + '.xlsx')`,
);
reemplazar(
  `go: () => window.open(API_BASE + '/articulos/masivo/plantilla', '_blank')`,
  `go: () => this.descargarArchivo('/articulos/masivo/plantilla', 'plantilla-articulos.xlsx')`,
);
reemplazar(
  `go: () => window.open(API_BASE + '/proveedores/masivo/plantilla', '_blank')`,
  `go: () => this.descargarArchivo('/proveedores/masivo/plantilla', 'plantilla-proveedores.xlsx')`,
);

lines[TEMPLATE_LINE] = JSON.stringify(template).replace(/<\//g, "<\\/");
fs.writeFileSync(filePath, lines.join("\n"));
console.log("OK. Descargas reemplazadas por fetch() + <a download>:", filePath);
