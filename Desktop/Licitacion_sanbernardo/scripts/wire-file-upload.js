// Paso: agrega un <input type="file"> oculto real y compartido (no
// existía ninguno en todo el archivo — los botones "Adjuntar" /
// "Cargar planilla" eran 100% decorativos, sin forma de elegir un
// archivo real desde el navegador). Un solo input global, gatillado
// por elegirArchivo(fn), cubre los 3 puntos de carga de archivo del
// sistema: documentos de proveedor, resolución sanitaria y la carga
// masiva de stock mín/máx vía Excel.
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
    throw new Error("No se encontró el texto exacto (file-upload):\n" + desde.slice(0, 300));
  }
  template = template.replace(desde, hasta);
}

// 1. Input de archivo oculto, único, siempre presente mientras haya
// sesión (dentro del wrapper "isApp").
reemplazar(
  `<sc-if value="{{ isApp }}" hint-placeholder-val="{{ true }}">
<div style="display:flex;min-height:100vh;background:var(--canvas)">`,
  `<sc-if value="{{ isApp }}" hint-placeholder-val="{{ true }}">
<div style="display:flex;min-height:100vh;background:var(--canvas)">
<input data-file-picker type="file" style="display:none" sc-camel-on-change="{{ onFileChange }}">`,
);

// 2. elegirArchivo()/onFileChange(): abren el selector nativo y, al
// elegir un archivo, llaman a la función API real con { archivo: File }.
reemplazar(
  `  desanidar = (v) => (Array.isArray(v) ? v[0] : v) || null;`,
  `  desanidar = (v) => (Array.isArray(v) ? v[0] : v) || null;

  elegirArchivo = (fn, opts) => {
    this._pendingFileFn = fn;
    this._pendingFileOpts = opts || {};
    const inp = document.querySelector('[data-file-picker]');
    if (inp) inp.click();
  };

  onFileChange = (e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!file || !this._pendingFileFn) return;
    const fn = this._pendingFileFn;
    const opts = this._pendingFileOpts || {};
    this._pendingFileFn = null;
    this.run(fn, Object.assign({ archivo: file }, opts.payload), { mantenerModal: opts.mantenerModal !== false })();
  };`,
);

// 3. Botón "Validar y aplicar" del panel de Inventario (carga masiva).
reemplazar(
  `        uploadGo: this.run(p.uploadFn)`,
  `        uploadGo: () => this.elegirArchivo(p.uploadFn)`,
);

// 4. Campos isFile de modales/fichas (documentos de proveedor,
// resolución sanitaria, planilla de stock masivo en el modal "masivo").
reemplazar(
  `chips: f.chips || [], fileGo: this.run(f.fileFn, { campo: f.label }, { mantenerModal: true })`,
  `chips: f.chips || [], fileGo: () => this.elegirArchivo(f.fileFn, { mantenerModal: true, payload: { id: this.state.ultimoProveedorId } })`,
);

// 5. Funciones API reales para los 3 puntos de carga de archivo.
reemplazar(
  `  seleccionarArchivoStockMasivo: p => mockRequest('seleccionarArchivoStockMasivo', 'POST', '/inventario/stock-masivo/archivo', p, 'Planilla cargada y validada'),`,
  `  seleccionarArchivoStockMasivo: p => (p && p.archivo instanceof File) ? apiUpload('/inventario/stock-masivo/archivo', p.archivo, 'Planilla cargada y stock actualizado') : mockRequest('seleccionarArchivoStockMasivo', 'POST', '/inventario/stock-masivo/archivo', p, 'Planilla cargada y validada'),`,
);
reemplazar(
  `  reemplazarResolucionSanitaria: p => mockRequest('reemplazarResolucionSanitaria', 'PUT', '/proveedores/:id/resolucion-sanitaria', p, 'Resolución sanitaria reemplazada'),`,
  `  reemplazarResolucionSanitaria: p => (p && p.archivo instanceof File) ? apiUpload('/proveedores/' + ((p && p.id) || '') + '/documentos', p.archivo, 'Resolución sanitaria reemplazada') : mockRequest('reemplazarResolucionSanitaria', 'PUT', '/proveedores/:id/resolucion-sanitaria', p, 'Resolución sanitaria reemplazada'),`,
);

reemplazar(
  `    viasActivas: null, ultimoArticuloId: null, ultimoTraspasoId: null, listas: {}
  };`,
  `    viasActivas: null, ultimoArticuloId: null, ultimoTraspasoId: null, ultimoProveedorId: null, listas: {}
  };`,
);

// 6. Rastrear el id del proveedor recién guardado en esta sesión (igual
// que ya se hace con ultimoArticuloId), para que "Reemplazar"/"Adjuntar"
// en el mismo modal sepan a qué proveedor apuntar.
reemplazar(
  `    if (nombre === 'guardarArticulo') {
      opts.onOk = (data) => {
        if (data && data.id_articulo) this.setState({ ultimoArticuloId: data.id_articulo });
      };
    }`,
  `    if (nombre === 'guardarArticulo') {
      opts.onOk = (data) => {
        if (data && data.id_articulo) this.setState({ ultimoArticuloId: data.id_articulo });
      };
    }
    if (nombre === 'guardarProveedor') {
      opts.onOk = (data) => {
        if (data && data.id_proveedor) this.setState({ ultimoProveedorId: data.id_proveedor });
      };
    }`,
);

lines[TEMPLATE_LINE] = JSON.stringify(template).replace(/<\//g, "<\\/");
fs.writeFileSync(filePath, lines.join("\n"));
console.log("OK. Carga de archivos real (input file + 3 puntos) aplicada:", filePath);
