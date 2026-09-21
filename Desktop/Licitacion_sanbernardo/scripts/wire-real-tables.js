// One-off script: reemplaza las filas de mockup de las tablas por datos
// reales, agregando un mecanismo genérico de carga con caché
// (cargarLista) y helpers de desanidado (desanidar) para los embeds de
// Supabase. Sigue el mismo patrón de edición quirúrgica por texto
// exacto que los scripts anteriores (wire-real-api.js, wire-forms.js,
// wire-input-values.js, wire-real-api-2.js).
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
    throw new Error("No se encontró el texto exacto:\n" + desde.slice(0, 200));
  }
  template = template.replace(desde, hasta);
}

// ============================================================
// 1. Estado: agrega la caché de listados reales.
// ============================================================
reemplazar(
  `    refBodegas: [], refArticulos: [], refProveedores: [], refCentrosCosto: [], refLotes: [], refPendientes: [],
    viasActivas: null, ultimoArticuloId: null, ultimoTraspasoId: null
  };`,
  `    refBodegas: [], refArticulos: [], refProveedores: [], refCentrosCosto: [], refLotes: [], refPendientes: [],
    viasActivas: null, ultimoArticuloId: null, ultimoTraspasoId: null, listas: {}
  };`,
);

// ============================================================
// 2. cargarLista(): fetch con caché por clave; mientras no haya datos
// devuelve [] (la tabla se ve vacía un instante y se repuebla sola al
// llegar la respuesta, sin bloquear el render). run(): al terminar
// cualquier acción exitosa, se limpia toda la caché para que la
// próxima vista de cada lista se recargue con datos frescos.
// ============================================================
reemplazar(
  `  opcionesLotes = () => (this.state.refLotes || []).map(this.etiquetaLote);`,
  `  opcionesLotes = () => (this.state.refLotes || []).map(this.etiquetaLote);

  desanidar = (v) => (Array.isArray(v) ? v[0] : v) || null;

  cargarLista = (clave, ruta) => {
    if (this.state.listas[clave] === undefined) {
      this.setState((s) => ({ listas: Object.assign({}, s.listas, { [clave]: null }) }));
      fetch(ruta)
        .then((r) => r.json())
        .then((d) => {
          this.setState((s) => ({
            listas: Object.assign({}, s.listas, { [clave]: d.data || [] }),
          }));
        })
        .catch(() => {
          this.setState((s) => ({ listas: Object.assign({}, s.listas, { [clave]: [] }) }));
        });
    }
    return this.state.listas[clave] || [];
  };`,
);
reemplazar(
  `    fn(payload).then(res => {
      this.setState(st => ({
        toast: { fn: nombre, estado: res.ok ? 'ok' : 'error', mensaje: res.mensaje },
        modal: o.mantenerModal ? st.modal : null,
        drawer: o.mantenerModal ? st.drawer : false
      }));
      if (res.ok && o.onOk) o.onOk(res.data);
      this._toastTimer = setTimeout(() => this.setState({ toast: null }), 3400);
    });`,
  `    fn(payload).then(res => {
      this.setState(st => ({
        toast: { fn: nombre, estado: res.ok ? 'ok' : 'error', mensaje: res.mensaje },
        modal: o.mantenerModal ? st.modal : null,
        drawer: o.mantenerModal ? st.drawer : false,
        listas: res.ok ? {} : st.listas
      }));
      if (res.ok && o.onOk) o.onOk(res.data);
      this._toastTimer = setTimeout(() => this.setState({ toast: null }), 3400);
    });`,
);

lines[TEMPLATE_LINE] = JSON.stringify(template).replace(/<\//g, "<\\/");
fs.writeFileSync(filePath, lines.join("\n"));
console.log("OK. Paso 1 (mecanismo de listas reales) aplicado:", filePath);
