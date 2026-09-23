// Accesos rápidos reales a Alertas/Analíticas/Mapa de calor desde el
// Panel de Inicio, para los roles que pueden verlas (back-office).
// El contador de alertas es en vivo (cargarLista contra /api/alertas),
// no un número de ejemplo.
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
    throw new Error("No se encontró el texto exacto (accesos inicio):\n" + desde.slice(0, 400));
  }
  template = template.replace(desde, () => hasta);
}

reemplazar(
  `  dashboard() {
    const r = this.state.role;
    const base = { isDash: true, eyebrow: 'PANEL', title: 'Inicio', req: null };`,
  `  dashboard() {
    const r = this.state.role;
    const base = { isDash: true, eyebrow: 'PANEL', title: 'Inicio', req: null };
    const alertasCount = (this.cargarLista('alertas', '/api/alertas') || []).length;
    const accesosInteligencia = [
      { icon: ic('bell', 18), label: 'Alertas', sub: alertasCount + (alertasCount === 1 ? ' alerta activa' : ' alertas activas'), go: this.go('alertas') },
      { icon: ic('chart', 18), label: 'Analíticas', sub: 'Consumo real · últimos 6 meses', go: this.go('analiticas') },
      { icon: ic('grid', 18), label: 'Mapa de calor', sub: 'Gasto y quiebres por bodega', go: this.go('mapa-calor') }
    ];`,
);

reemplazar(
  `      shortcuts: [
        { icon: ic('chart', 18), label: 'Análisis de consumo', sub: 'Interfaz 20', go: this.go('analisis') },
        { icon: ic('wallet', 18), label: 'Centros de costo', sub: 'Interfaz 6', go: this.go('centros') },
        { icon: ic('database', 18), label: 'Exportación', sub: 'Interfaz 8', go: this.go('exportacion') },
        { icon: ic('scroll', 18), label: 'Log de auditoría', sub: 'Interfaz 7', go: this.go('auditoria') }
      ],`,
  `      shortcuts: [
        { icon: ic('chart', 18), label: 'Análisis de consumo', sub: 'Interfaz 20', go: this.go('analisis') },
        { icon: ic('wallet', 18), label: 'Centros de costo', sub: 'Interfaz 6', go: this.go('centros') },
        { icon: ic('database', 18), label: 'Exportación', sub: 'Interfaz 8', go: this.go('exportacion') },
        { icon: ic('scroll', 18), label: 'Log de auditoría', sub: 'Interfaz 7', go: this.go('auditoria') }
      ].concat(accesosInteligencia),`,
);

reemplazar(
  `      shortcuts: [
        { icon: ic('boxIn', 18), label: 'Nueva recepción', sub: 'Interfaz 15a', go: () => this.setState({ page: 'movimientos', tab: 0, modal: 'recepcion' }) },
        { icon: ic('boxOut', 18), label: 'Nuevo despacho', sub: 'Interfaz 15b', go: () => this.setState({ page: 'movimientos', tab: 1, modal: 'despacho' }) },
        { icon: ic('thermo', 18), label: 'Registrar temperatura', sub: 'Interfaz 16', go: this.go('temperatura') },
        { icon: ic('cart', 18), label: 'Abastecimiento', sub: 'Interfaz 18', go: this.go('abastecimiento') }
      ],`,
  `      shortcuts: [
        { icon: ic('boxIn', 18), label: 'Nueva recepción', sub: 'Interfaz 15a', go: () => this.setState({ page: 'movimientos', tab: 0, modal: 'recepcion' }) },
        { icon: ic('boxOut', 18), label: 'Nuevo despacho', sub: 'Interfaz 15b', go: () => this.setState({ page: 'movimientos', tab: 1, modal: 'despacho' }) },
        { icon: ic('thermo', 18), label: 'Registrar temperatura', sub: 'Interfaz 16', go: this.go('temperatura') },
        { icon: ic('cart', 18), label: 'Abastecimiento', sub: 'Interfaz 18', go: this.go('abastecimiento') }
      ].concat(accesosInteligencia),`,
);

reemplazar(
  `      shortcuts: [
        { icon: ic('users', 18), label: 'Usuarios y perfiles', sub: 'Interfaz 3', go: this.go('usuarios') },
        { icon: ic('warehouse', 18), label: 'Bodegas y sub-bodegas', sub: 'Interfaz 5', go: this.go('bodegas') },
        { icon: ic('swap', 18), label: 'Movimientos', sub: 'Interfaz 15', go: this.go('movimientos') },
        { icon: ic('scroll', 18), label: 'Log de auditoría', sub: 'Interfaz 7', go: this.go('auditoria') }
      ],`,
  `      shortcuts: [
        { icon: ic('users', 18), label: 'Usuarios y perfiles', sub: 'Interfaz 3', go: this.go('usuarios') },
        { icon: ic('warehouse', 18), label: 'Bodegas y sub-bodegas', sub: 'Interfaz 5', go: this.go('bodegas') },
        { icon: ic('swap', 18), label: 'Movimientos', sub: 'Interfaz 15', go: this.go('movimientos') },
        { icon: ic('scroll', 18), label: 'Log de auditoría', sub: 'Interfaz 7', go: this.go('auditoria') }
      ].concat(accesosInteligencia),`,
);

lines[TEMPLATE_LINE] = JSON.stringify(template).replace(/<\//g, "<\\/");
fs.writeFileSync(filePath, lines.join("\n"));
console.log("OK. Accesos rápidos reales a Inteligencia en el Panel de Inicio:", filePath);
