// El usuario reportó que el selector de bodega del header "no filtra
// nada". Es cierto, pero solo en parte: el mecanismo en sí funciona
// (ya probado para Movimientos), el problema es que CASI NINGUNA otra
// página real lo usaba, aunque sus backends YA soportaban ?bodega=
// desde que se construyeron (Temperatura, Inventario, Abastecimiento).
// Se conecta el filtro a esas páginas, con el mismo patrón exacto que
// ya usa movimientos() (cache por bodega, para que cambiar de bodega
// dispare una consulta nueva en vez de reusar datos viejos).
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
    throw new Error("No se encontró el texto exacto (filtro bodega general):\n" + desde.slice(0, 400));
  }
  template = template.replace(desde, () => hasta);
}

// 1. Temperatura.
reemplazar(
  `  temperatura() {
    const registros = this.cargarLista('temperatura', '/api/temperatura/registros') || [];`,
  `  temperatura() {
    const bId = this.bodegaSeleccionadaId();
    const bPrefijo = bId ? ('?bodega=' + bId) : '';
    const registros = this.cargarLista('temperatura_' + (bId || 'todas'), '/api/temperatura/registros' + bPrefijo) || [];`,
);

// 2. Inventario (Toma de inventario + Ajustes/vencidos), ambas pestañas.
reemplazar(
  `  inventario(farmacia) {
    const t = this.state.tab;
    const base = {`,
  `  inventario(farmacia) {
    const t = this.state.tab;
    const bId = this.bodegaSeleccionadaId();
    const bPrefijo = bId ? ('?bodega=' + bId) : '';
    const base = {`,
);
reemplazar(
  `      const vencidos = this.cargarLista('inventario_vencidos', '/api/inventario/lotes-vencidos');`,
  `      const vencidos = this.cargarLista('inventario_vencidos_' + (bId || 'todas'), '/api/inventario/lotes-vencidos' + bPrefijo);`,
);
reemplazar(
  `    const tomas = this.cargarLista('inventario_tomas', '/api/inventario/tomas');`,
  `    const tomas = this.cargarLista('inventario_tomas_' + (bId || 'todas'), '/api/inventario/tomas' + bPrefijo);`,
);

// 3. Abastecimiento (Órdenes + Faltantes), ambas pestañas.
reemplazar(
  `  abastecimiento() {
    const t = this.state.tab;
    const base = {`,
  `  abastecimiento() {
    const t = this.state.tab;
    const bId = this.bodegaSeleccionadaId();
    const bPrefijo = bId ? ('?bodega=' + bId) : '';
    const base = {`,
);
reemplazar(
  `      const faltantes = this.cargarLista('abastecimiento_faltantes', '/api/abastecimiento/faltantes');`,
  `      const faltantes = this.cargarLista('abastecimiento_faltantes_' + (bId || 'todas'), '/api/abastecimiento/faltantes' + bPrefijo);`,
);
reemplazar(
  `    const ordenes = this.cargarLista('abastecimiento_ordenes', '/api/abastecimiento/ordenes');`,
  `    const ordenes = this.cargarLista('abastecimiento_ordenes_' + (bId || 'todas'), '/api/abastecimiento/ordenes' + bPrefijo);`,
);

lines[TEMPLATE_LINE] = JSON.stringify(template).replace(/<\//g, "<\\/");
fs.writeFileSync(filePath, lines.join("\n"));
console.log("OK. Filtro de bodega del header conectado a Temperatura, Inventario y Abastecimiento:", filePath);
