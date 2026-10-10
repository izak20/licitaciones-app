// El usuario pidió que la exportación completa solo ofrezca CSV y
// Excel (.xlsx) — se quitan "SQL dump (PostgreSQL)" y "XML". De paso,
// el selector de Formato nunca se leía (generarExportacionGo siempre
// mandaba 'a_solicitud' a secas, sin formato): se conecta de verdad,
// así que elegir CSV ahora genera un CSV real, no un Excel disfrazado.
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
    throw new Error("No se encontró el texto exacto (formatos exportacion):\n" + desde.slice(0, 400));
  }
  template = template.replace(desde, () => hasta);
}

// 1. Solo 2 opciones reales.
reemplazar(
  `<option>CSV (UTF-8) + esquema JSON</option>
<option>Excel (.xlsx)</option>
<option>SQL dump (PostgreSQL)</option>
<option>XML</option>`,
  `<option>CSV (UTF-8)</option>
<option>Excel (.xlsx)</option>`,
);

// 2. El botón ahora sí lee el formato elegido.
reemplazar(
  `      generarExportacionGo: this.run('generarExportacion', { tipo: 'a_solicitud' }),`,
  `      generarExportacionGo: () => {
        const formatoTexto = this.leerCampo(document, 'Formato') || '';
        const formato = formatoTexto.indexOf('CSV') === 0 ? 'csv' : 'xlsx';
        this.run('generarExportacion', { tipo: 'a_solicitud', formato })();
      },`,
);

lines[TEMPLATE_LINE] = JSON.stringify(template).replace(/<\//g, "<\\/");
fs.writeFileSync(filePath, lines.join("\n"));
console.log("OK. Exportación: solo CSV/Excel, y el formato elegido ahora es real:", filePath);
