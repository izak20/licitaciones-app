// El usuario reportó que Movimientos (Droguería y Farmacia, las 4
// pestañas de cada una = 8 tablas en total) no tiene ningún filtro
// real para la cantidad de datos que hay — solo el buscador de texto
// libre. Se agregan dos filtros reales, reutilizando piezas que ya
// existen en el resto de la app:
//
// 1) Filtro de fechas: el backend /api/movimientos YA soportaba
//    ?desde=&hasta= (se construyó junto con la ruta, pero el
//    frontend nunca lo usaba) y la UI de rango de fechas ya existe
//    (mostrarFechas/analisisDesde/analisisHasta, usada en Análisis de
//    consumo) — solo había que conectarlos acá también.
// 2) Filtro de Estado: nuevo. Se agrega un tipo de filtro real
//    (dropdown con las pestañas ya clickeables de "Columnas"), que
//    calcula los estados REALES presentes en cada pestaña (sin
//    inventar una lista fija) y filtra la tabla al elegir uno.
//
// Se resetea el filtro de Estado al cambiar de pestaña (en el
// transform compartido de tabs, afecta a todas las páginas con tabs
// por igual, de forma segura ya que las demás páginas no usan
// filtroEstado).
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
    throw new Error("No se encontró el texto exacto (filtros movimientos):\n" + desde.slice(0, 400));
  }
  template = template.replace(desde, () => hasta);
}

// 1. Estado inicial: nuevo campo para el filtro de Estado.
reemplazar(
  `    chartTooltipKey: null, columnasPagina: {}, busquedaTabla: '',`,
  `    chartTooltipKey: null, columnasPagina: {}, busquedaTabla: '', filtroEstado: null,`,
);

// 2. Al cambiar de pestaña, se olvida el filtro de Estado (evita que
//    quede aplicado un estado que no existe en la pestaña nueva).
reemplazar(
  `      tabs: page.tabs ? page.tabs.map(t => {
        const act = t.i === s.tab;
        return {
          label: t.label, count: t.count,
          go: () => this.setState({ tab: t.i, modal: null }),`,
  `      tabs: page.tabs ? page.tabs.map(t => {
        const act = t.i === s.tab;
        return {
          label: t.label, count: t.count,
          go: () => this.setState({ tab: t.i, modal: null, filtroEstado: null }),`,
);

// 3. Markup: el botón de filtro ahora puede abrir un desplegable con
//    opciones reales (antes solo era una pastilla decorativa).
reemplazar(
  `<sc-for list="{{ page.filters }}" as="f" hint-placeholder-count="2">
<button sc-camel-on-click="{{ f.go }}" style="display:inline-flex;align-items:center;gap:6px;height:30px;padding:0 11px;font-size:12px;border-radius:999px;cursor:pointer;background:var(--surface);border:1px solid var(--border-2);color:var(--fg-2)" style-hover="background:var(--bg-3)">
<span style="display:flex;color:var(--fg-3)">{{ f.icon }}</span>
<span style="color:var(--fg-3)">{{ f.label }}:</span><span style="font-weight:600;color:var(--fg-1)">{{ f.value }}</span>
<span style="display:flex;color:var(--fg-4)">{{ iconChevronDown }}</span>
</button>
</sc-for>`,
  `<sc-for list="{{ page.filters }}" as="f" hint-placeholder-count="2">
<div style="position:relative">
<button sc-camel-on-click="{{ f.go }}" style="display:inline-flex;align-items:center;gap:6px;height:30px;padding:0 11px;font-size:12px;border-radius:999px;cursor:pointer;background:var(--surface);border:1px solid var(--border-2);color:var(--fg-2)" style-hover="background:var(--bg-3)">
<span style="display:flex;color:var(--fg-3)">{{ f.icon }}</span>
<span style="color:var(--fg-3)">{{ f.label }}:</span><span style="font-weight:600;color:var(--fg-1)">{{ f.value }}</span>
<span style="display:flex;color:var(--fg-4)">{{ iconChevronDown }}</span>
</button>
<sc-if value="{{ f.ddAbierto }}" hint-placeholder-val="{{ false }}">
<div style="position:absolute;top:36px;left:0;background:var(--surface);border:1px solid var(--border-1);border-radius:8px;box-shadow:var(--shadow-lg);padding:6px;z-index:60;min-width:200px;animation:mdIn 180ms cubic-bezier(0.16,1,0.3,1)">
<sc-for list="{{ f.opciones }}" as="o" hint-placeholder-count="3">
<button sc-camel-on-click="{{ o.go }}" style="display:flex;align-items:center;justify-content:space-between;gap:12px;width:100%;padding:7px 9px;border:none;border-radius:5px;font-size:12.5px;text-align:left;cursor:pointer;background:{{ o.bg }};color:var(--fg-1)" style-hover="background:var(--bg-3)">
<span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">{{ o.label }}</span>
<span style="font-family:var(--font-mono);font-size:10.5px;color:var(--fg-4);flex-shrink:0">{{ o.count }}</span>
</button>
</sc-for>
</div>
</sc-if>
</div>
</sc-for>`,
);

lines[TEMPLATE_LINE] = JSON.stringify(template).replace(/<\//g, "<\\/");
fs.writeFileSync(filePath, lines.join("\n"));
console.log("OK. Paso 1/3 (estado inicial + reset de tab + markup del desplegable de filtro):", filePath);
