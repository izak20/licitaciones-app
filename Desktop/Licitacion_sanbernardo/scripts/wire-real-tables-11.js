// Paso 12: el botón "Descargar" del historial de exportaciones estaba
// compartido por todas las filas (this.run('descargarExportacion') sin
// distinguir cuál); se cambia a un handler por fila (e.go) con el id
// real de cada exportación, apuntando a la descarga real.
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
    throw new Error("No se encontró el texto exacto (descarga export):\n" + desde.slice(0, 300));
  }
  template = template.replace(desde, hasta);
}

reemplazar(
  `<button sc-camel-on-click="{{ descargarExportacionGo }}" style="background:transparent;border:none;padding:0;font-size:12px;font-weight:500;color:var(--brand-blue);cursor:pointer" style-hover="color:var(--brand-blue-700)">Descargar</button>`,
  `<button sc-camel-on-click="{{ e.go }}" style="background:transparent;border:none;padding:0;font-size:12px;font-weight:500;color:var(--brand-blue);cursor:pointer" style-hover="color:var(--brand-blue-700)">Descargar</button>`,
);

reemplazar(
  `        exports: historial.map(e => ({
          date: String(e.fecha_generacion || '').slice(0, 16).replace('T', ' '),
          by: e.generado_por || '—',
          format: e.formato,
          size: e.tipo
        }))`,
  `        exports: historial.map(e => ({
          date: String(e.fecha_generacion || '').slice(0, 16).replace('T', ' '),
          by: e.generado_por || '—',
          format: e.formato,
          size: e.tipo,
          go: () => window.open(API_BASE + '/exportaciones/' + e.id_exportacion + '/descarga', '_blank')
        }))`,
);

lines[TEMPLATE_LINE] = JSON.stringify(template).replace(/<\//g, "<\\/");
fs.writeFileSync(filePath, lines.join("\n"));
console.log("OK. Paso 12 (descarga de exportación por fila) aplicado:", filePath);
