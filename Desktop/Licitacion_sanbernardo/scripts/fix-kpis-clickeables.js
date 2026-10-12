// El usuario no entendía qué significaban 2 de los 4 KPI del Inicio
// (Administrador) ni dónde verificar esos números. Se agrega:
// 1) Clic real en cada tarjeta, que navega a la pantalla exacta donde
//    se puede contar/verificar ese número:
//    - Artículos activos -> Artículos (el API ya filtra activo=true,
//      así que el listado muestra exactamente esa cantidad).
//    - Movimientos del mes -> Movimientos, con el filtro de fechas ya
//      puesto en el mes actual (para que coincida el número).
//    - Recepciones con reparos -> Movimientos > Recepción, con el
//      filtro de Estado (agregado hace poco) ya puesto en "con
//      reparos" y el rango de fechas abierto a todo el histórico (este
//      KPI es un total de siempre, no solo del mes).
//    - Usuarios activos -> Usuarios.
// 2) El markup de la tarjeta ahora acepta un clic (cursor:pointer +
//    on-click), de forma segura para los otros 3 dashboards
//    (Droguería/Finanzas/Cliente Interno) que todavía no mandan "go".
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
    throw new Error("No se encontró el texto exacto (kpis clickeables):\n" + desde.slice(0, 400));
  }
  template = template.replace(desde, () => hasta);
}

// 1. Markup: la tarjeta de KPI ahora puede recibir clic.
reemplazar(
  `<sc-for list="{{ page.kpis }}" as="k" hint-placeholder-count="4">
<div style="background:var(--surface);border:1px solid var(--border-1);border-radius:8px;padding:15px 16px;box-shadow:var(--shadow-xs);border-left:3px solid {{ k.accent }}">
<div style="font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:0.07em;color:var(--fg-3)">{{ k.label }}</div>
<div style="font-family:var(--font-mono);font-size:26px;font-weight:600;letter-spacing:-0.02em;margin-top:8px;line-height:1">{{ k.value }}</div>
<div style="font-size:11.5px;color:var(--fg-3);margin-top:6px">{{ k.sub }}</div>
</div>
</sc-for>`,
  `<sc-for list="{{ page.kpis }}" as="k" hint-placeholder-count="4">
<div sc-camel-on-click="{{ k.go }}" style="background:var(--surface);border:1px solid var(--border-1);border-radius:8px;padding:15px 16px;box-shadow:var(--shadow-xs);border-left:3px solid {{ k.accent }};cursor:{{ k.cursor }}">
<div style="font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:0.07em;color:var(--fg-3)">{{ k.label }}</div>
<div style="font-family:var(--font-mono);font-size:26px;font-weight:600;letter-spacing:-0.02em;margin-top:8px;line-height:1">{{ k.value }}</div>
<div style="font-size:11.5px;color:var(--fg-3);margin-top:6px">{{ k.sub }}</div>
</div>
</sc-for>`,
);

// 2. Dashboard Administrador: cada KPI navega a donde se verifica.
reemplazar(
  `        { label: 'Artículos activos', value: String(resumen.articulos_activos ?? '—'), sub: (resumen.articulos_controlados ?? 0) + ' controlados · ' + (resumen.articulos_cadena_frio ?? 0) + ' cadena de frío', accent: '#115B99' },
        { label: 'Movimientos del mes', value: String(resumen.movimientos_mes ?? '—'), sub: 'recepción, despacho, traspaso', accent: '#FAA16B' },
        { label: 'Recepciones con reparos', value: String(resumen.recepciones_con_reparos ?? '—'), sub: 'requieren gestión', accent: '#C0362C' },
        { label: 'Usuarios activos', value: String(resumen.usuarios_activos ?? '—'), sub: 'de ' + (resumen.usuarios_total ?? '—') + ' habilitados', accent: '#1F8A5B' }`,
  `        { label: 'Artículos activos', value: String(resumen.articulos_activos ?? '—'), sub: (resumen.articulos_controlados ?? 0) + ' controlados · ' + (resumen.articulos_cadena_frio ?? 0) + ' cadena de frío', accent: '#115B99', cursor: 'pointer', go: this.go('articulos') },
        { label: 'Movimientos del mes', value: String(resumen.movimientos_mes ?? '—'), sub: 'recepción, despacho, traspaso · toca para verlos', accent: '#FAA16B', cursor: 'pointer', go: () => {
          const hoy = new Date();
          const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1).toISOString().slice(0, 10);
          const hastaHoy = hoy.toISOString().slice(0, 10);
          this.setState({ page: 'movimientos', tab: 0, dd: null, modal: null, drawer: false, navOpen: false, estadoOverride: null, form: {}, busquedaTabla: '', filtroEstado: null, filtroFamilia: null, analisisDesde: inicioMes, analisisHasta: hastaHoy });
        } },
        { label: 'Recepciones con reparos', value: String(resumen.recepciones_con_reparos ?? '—'), sub: 'de siempre · toca para verlas', accent: '#C0362C', cursor: 'pointer', go: () => {
          this.setState({ page: 'movimientos', tab: 0, dd: null, modal: null, drawer: false, navOpen: false, estadoOverride: null, form: {}, busquedaTabla: '', filtroEstado: 'recepcionado_con_reparos', filtroFamilia: null, analisisDesde: '2000-01-01', analisisHasta: new Date().toISOString().slice(0, 10) });
        } },
        { label: 'Usuarios activos', value: String(resumen.usuarios_activos ?? '—'), sub: 'de ' + (resumen.usuarios_total ?? '—') + ' habilitados', accent: '#1F8A5B', cursor: 'pointer', go: this.go('usuarios') }`,
);

lines[TEMPLATE_LINE] = JSON.stringify(template).replace(/<\//g, "<\\/");
fs.writeFileSync(filePath, lines.join("\n"));
console.log("OK. KPIs del Inicio (Administrador) ahora llevan a donde se verifica cada número:", filePath);
