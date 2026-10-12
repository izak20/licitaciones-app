// Paso 2/3: agrega el helper compartido filtroEstadoControl (calcula
// los estados reales presentes en una lista de movimientos y arma el
// objeto que necesita el filtro + las filas ya filtradas), reutilizado
// por las 8 pestañas de Movimientos (4 Droguería + 4 Farmacia).
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
    throw new Error("No se encontró el texto exacto (filtros movimientos paso 2):\n" + desde.slice(0, 400));
  }
  template = template.replace(desde, () => hasta);
}

reemplazar(
  `  estadoMov = (e) => {
    if (e === 'recepcionado_con_reparos') return 'bad';
    if (e === 'recepcionado_sin_reparos') return 'ok';
    if (e === 'enviado' || e === 'en_transito') return 'warn';
    return 'neutral';
  };`,
  `  estadoMov = (e) => {
    if (e === 'recepcionado_con_reparos') return 'bad';
    if (e === 'recepcionado_sin_reparos') return 'ok';
    if (e === 'enviado' || e === 'en_transito') return 'warn';
    return 'neutral';
  };
  // Calcula, a partir de los movimientos reales ya cargados (sin
  // inventar una lista fija de estados), las opciones del filtro de
  // Estado para la pestaña activa, y devuelve también las filas ya
  // filtradas según lo que esté elegido.
  filtroEstadoControl = (filas) => {
    const actual = this.state.filtroEstado;
    const labelEstado = (e) => String(e || '').replace(/_/g, ' ').replace(/^./, c => c.toUpperCase());
    const conteo = {};
    filas.forEach(m => { conteo[m.estado] = (conteo[m.estado] || 0) + 1; });
    const estados = Object.keys(conteo).sort();
    const elegir = (valor) => () => this.setState({ filtroEstado: valor, dd: null });
    const opciones = [{ label: 'Todos', count: filas.length, go: elegir(null), bg: actual ? 'transparent' : 'var(--brand-blue-050)' }]
      .concat(estados.map(e => ({ label: labelEstado(e), count: conteo[e], go: elegir(e), bg: actual === e ? 'var(--brand-blue-050)' : 'transparent' })));
    const filtro = {
      label: 'Estado', value: actual ? labelEstado(actual) : 'Todos', icon: ic('filter', 13),
      go: this.dd('filtroEstado'), ddAbierto: this.state.dd === 'filtroEstado', opciones
    };
    const filasFiltradas = actual ? filas.filter(m => m.estado === actual) : filas;
    return { filtro, filasFiltradas };
  };`,
);

lines[TEMPLATE_LINE] = JSON.stringify(template).replace(/<\//g, "<\\/");
fs.writeFileSync(filePath, lines.join("\n"));
console.log("OK. Paso 2/3 (helper filtroEstadoControl agregado):", filePath);
