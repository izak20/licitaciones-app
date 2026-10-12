// Paso 3/3: conecta movimientos() y movFarmacia() a los filtros
// reales (fechas + estado). Se parte del texto actual de ambos
// métodos (guardado en los pasos anteriores) y se le aplican
// reemplazos puntuales, en vez de reescribirlos enteros a mano, para
// no arriesgar un error de transcripción en las columnas/celdas que
// no cambian.
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

function reemplazarUna(texto, desde, hasta, contexto) {
  if (!texto.includes(desde)) {
    throw new Error("No se encontró el texto exacto (" + contexto + "):\n" + desde.slice(0, 300));
  }
  return texto.replace(desde, () => hasta);
}
function reemplazarTodas(texto, desde, hasta, contexto) {
  if (!texto.includes(desde)) {
    throw new Error("No se encontró el texto exacto (" + contexto + "):\n" + desde.slice(0, 300));
  }
  return texto.split(desde).join(hasta);
}

// ===================== movimientos() (Droguería) =====================
let mov = fs.readFileSync("/tmp/old-movimientos.txt", "utf8");

mov = reemplazarUna(
  mov,
  `  movimientos() {
    const t = this.state.tab;
    const tabs = ['Recepción', 'Despacho', 'Traspaso', 'Devolución'];
    const bId = this.bodegaSeleccionadaId();
    const bSuf = bId ? ('&bodega=' + bId) : '';
    const claves = ['mov_recepcion_' + (bId || 'todas'), 'mov_despacho_' + (bId || 'todas'), 'mov_traspaso_' + (bId || 'todas'), 'mov_devolucion_' + (bId || 'todas')];
    const rutas = ['/api/movimientos?tipo=recepcion' + bSuf, '/api/movimientos?tipo=despacho' + bSuf, '/api/movimientos?tipo=traspaso' + bSuf, '/api/movimientos?tipo=devolucion' + bSuf];
    const filas = this.cargarLista(claves[t], rutas[t]);
    const counts = claves.map(c => (this.state.listas[c] || []).length);

    const cfg = [`,
  `  movimientos() {
    const t = this.state.tab;
    const tabs = ['Recepción', 'Despacho', 'Traspaso', 'Devolución'];
    const bId = this.bodegaSeleccionadaId();
    const desde = this.state.analisisDesde;
    const hasta = this.state.analisisHasta;
    const bSuf = bId ? ('&bodega=' + bId) : '';
    const fSuf = '&desde=' + desde + '&hasta=' + hasta;
    const sufClave = (bId || 'todas') + '_' + desde + '_' + hasta;
    const claves = ['mov_recepcion_' + sufClave, 'mov_despacho_' + sufClave, 'mov_traspaso_' + sufClave, 'mov_devolucion_' + sufClave];
    const rutas = ['/api/movimientos?tipo=recepcion' + bSuf + fSuf, '/api/movimientos?tipo=despacho' + bSuf + fSuf, '/api/movimientos?tipo=traspaso' + bSuf + fSuf, '/api/movimientos?tipo=devolucion' + bSuf + fSuf];
    const filas = this.cargarLista(claves[t], rutas[t]);
    const counts = claves.map(c => (this.state.listas[c] || []).length);
    const { filtro: filtroEstado, filasFiltradas } = this.filtroEstadoControl(filas);

    const cfg = [`,
  "movimientos header",
);

mov = reemplazarTodas(mov, `        filters: [],`, `        filters: [filtroEstado],`, "movimientos filters");
mov = reemplazarTodas(mov, `        rows: filas.map(m => {`, `        rows: filasFiltradas.map(m => {`, "movimientos rows");

mov = reemplazarUna(
  mov,
  `        footer: 'Mostrando ' + filas.length + ' recepciones reales'`,
  `        footer: 'Mostrando ' + filasFiltradas.length + ' de ' + filas.length + ' recepciones reales'`,
  "movimientos footer recepcion",
);
mov = reemplazarUna(
  mov,
  `        footer: 'Mostrando ' + filas.length + ' despachos reales'`,
  `        footer: 'Mostrando ' + filasFiltradas.length + ' de ' + filas.length + ' despachos reales'`,
  "movimientos footer despacho",
);
mov = reemplazarUna(
  mov,
  `        footer: 'Mostrando ' + filas.length + ' traspasos reales · el ícono ↻ abre la confirmación de recepción'`,
  `        footer: 'Mostrando ' + filasFiltradas.length + ' de ' + filas.length + ' traspasos reales · el ícono ↻ abre la confirmación de recepción'`,
  "movimientos footer traspaso",
);
mov = reemplazarUna(
  mov,
  `        footer: 'Mostrando ' + filas.length + ' devoluciones reales'`,
  `        footer: 'Mostrando ' + filasFiltradas.length + ' de ' + filas.length + ' devoluciones reales'`,
  "movimientos footer devolucion",
);

mov = reemplazarUna(
  mov,
  `    return Object.assign({
      isList: true, eyebrow: 'DROGUERÍA · INTERFAZ 15',
      title: 'Movimientos',
      secondary: [`,
  `    return Object.assign({
      isList: true, eyebrow: 'DROGUERÍA · INTERFAZ 15',
      title: 'Movimientos',
      mostrarFechas: true,
      secondary: [`,
  "movimientos mostrarFechas",
);

if (!template.includes(fs.readFileSync("/tmp/old-movimientos.txt", "utf8"))) {
  throw new Error("No se encontró el texto original completo de movimientos() en el template.");
}
template = template.replace(fs.readFileSync("/tmp/old-movimientos.txt", "utf8"), () => mov);

// ===================== movFarmacia() =====================
let farm = fs.readFileSync("/tmp/old-movFarmacia.txt", "utf8");

farm = reemplazarUna(
  farm,
  `  movFarmacia() {
    const t = this.state.tab;
    const bId = this.bodegaSeleccionadaId();
    const bSuf = bId ? ('&bodega=' + bId) : '';
    const claves = ['farm_donacion_' + (bId || 'todas'), 'farm_traspaso_' + (bId || 'todas'), 'farm_despacho_' + (bId || 'todas'), 'farm_vale_' + (bId || 'todas')];
    const rutas = ['/api/movimientos?tipo=donacion' + bSuf, '/api/movimientos?tipo=traspaso' + bSuf, '/api/movimientos?tipo=despacho' + bSuf, '/api/movimientos?tipo=vale_consumo' + bSuf];
    const filas = this.cargarLista(claves[t], rutas[t]);
    const counts = claves.map(c => (this.state.listas[c] || []).length);

    const cfg = [`,
  `  movFarmacia() {
    const t = this.state.tab;
    const bId = this.bodegaSeleccionadaId();
    const desde = this.state.analisisDesde;
    const hasta = this.state.analisisHasta;
    const bSuf = bId ? ('&bodega=' + bId) : '';
    const fSuf = '&desde=' + desde + '&hasta=' + hasta;
    const sufClave = (bId || 'todas') + '_' + desde + '_' + hasta;
    const claves = ['farm_donacion_' + sufClave, 'farm_traspaso_' + sufClave, 'farm_despacho_' + sufClave, 'farm_vale_' + sufClave];
    const rutas = ['/api/movimientos?tipo=donacion' + bSuf + fSuf, '/api/movimientos?tipo=traspaso' + bSuf + fSuf, '/api/movimientos?tipo=despacho' + bSuf + fSuf, '/api/movimientos?tipo=vale_consumo' + bSuf + fSuf];
    const filas = this.cargarLista(claves[t], rutas[t]);
    const counts = claves.map(c => (this.state.listas[c] || []).length);
    const { filtro: filtroEstado, filasFiltradas } = this.filtroEstadoControl(filas);

    const cfg = [`,
  "movFarmacia header",
);

farm = reemplazarTodas(farm, `        filters: [],`, `        filters: [filtroEstado],`, "movFarmacia filters");
farm = reemplazarTodas(farm, `        rows: filas.map(m => {`, `        rows: filasFiltradas.map(m => {`, "movFarmacia rows");

farm = reemplazarUna(
  farm,
  `        footer: 'Mostrando ' + filas.length + ' donaciones reales'`,
  `        footer: 'Mostrando ' + filasFiltradas.length + ' de ' + filas.length + ' donaciones reales'`,
  "movFarmacia footer donacion",
);
farm = reemplazarUna(
  farm,
  `        footer: 'Mostrando ' + filas.length + ' traspasos reales'`,
  `        footer: 'Mostrando ' + filasFiltradas.length + ' de ' + filas.length + ' traspasos reales'`,
  "movFarmacia footer traspaso",
);
farm = reemplazarUna(
  farm,
  `        footer: 'Mostrando ' + filas.length + ' despachos a cuentas internas reales'`,
  `        footer: 'Mostrando ' + filasFiltradas.length + ' de ' + filas.length + ' despachos a cuentas internas reales'`,
  "movFarmacia footer cuentas",
);
farm = reemplazarUna(
  farm,
  `        footer: 'Mostrando ' + filas.length + ' vales de consumo reales'`,
  `        footer: 'Mostrando ' + filasFiltradas.length + ' de ' + filas.length + ' vales de consumo reales'`,
  "movFarmacia footer vale",
);

farm = reemplazarUna(
  farm,
  `    return Object.assign({
      isList: true, eyebrow: 'FARMACIA · INTERFAZ 21', title: 'Movimientos (Farmacia)',
      secondary: [{ label: 'Exportar', icon: ic('download', 13), fn: 'exportarMovimientos' }, { label: 'Imprimir', icon: ic('printer', 13), fn: 'imprimirMovimientos' }],`,
  `    return Object.assign({
      isList: true, eyebrow: 'FARMACIA · INTERFAZ 21', title: 'Movimientos (Farmacia)',
      mostrarFechas: true,
      secondary: [{ label: 'Exportar', icon: ic('download', 13), fn: 'exportarMovimientos' }, { label: 'Imprimir', icon: ic('printer', 13), fn: 'imprimirMovimientos' }],`,
  "movFarmacia mostrarFechas",
);

if (!template.includes(fs.readFileSync("/tmp/old-movFarmacia.txt", "utf8"))) {
  throw new Error("No se encontró el texto original completo de movFarmacia() en el template.");
}
template = template.replace(fs.readFileSync("/tmp/old-movFarmacia.txt", "utf8"), () => farm);

lines[TEMPLATE_LINE] = JSON.stringify(template).replace(/<\//g, "<\\/");
fs.writeFileSync(filePath, lines.join("\n"));
console.log("OK. Paso 3/3: movimientos() y movFarmacia() conectados a filtro de fechas y de Estado:", filePath);
