// Bug real reportado por el usuario: al pasar el cursor sobre un punto
// del gráfico de temperatura, aparecía un parpadeo infinito (sube/baja).
// Causa: el aviso con el detalle del punto era un <div> normal puesto
// ANTES del <svg>, en el flujo normal del documento — al aparecer
// empujaba el gráfico hacia abajo, lo que sacaba el punto de debajo
// del cursor (dispara mouseleave → se oculta el aviso → el gráfico
// vuelve a subir → el cursor vuelve a quedar sobre el punto → se
// repite sin parar). El mismo patrón en los gráficos de barras SÍ
// estaba bien hecho (position:absolute dentro de un contenedor
// position:relative, sin afectar el layout) — se aplica la misma
// solución acá.
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
    throw new Error("No se encontró el texto exacto (parpadeo tooltip temperatura):\n" + desde.slice(0, 400));
  }
  template = template.replace(desde, () => hasta);
}

reemplazar(
  `<sc-if value="{{ page.chart.isLine }}" hint-placeholder-val="{{ false }}">
<sc-if value="{{ page.chart.tooltipTexto }}" hint-placeholder-val="{{ false }}">
<div style="display:inline-flex;align-items:center;gap:6px;margin-bottom:10px;padding:6px 10px;background:var(--brand-slate);color:#fff;font-size:11px;border-radius:6px">{{ page.chart.tooltipTexto }}</div>
</sc-if>
<svg sc-camel-view-box="0 0 640 190" sc-camel-preserve-aspect-ratio="none" style="width:100%;height:190px;display:block">`,
  `<sc-if value="{{ page.chart.isLine }}" hint-placeholder-val="{{ false }}">
<div style="position:relative">
<sc-if value="{{ page.chart.tooltipTexto }}" hint-placeholder-val="{{ false }}">
<div style="position:absolute;top:6px;left:6px;z-index:5;pointer-events:none;display:inline-flex;align-items:center;gap:6px;padding:6px 10px;background:var(--brand-slate);color:#fff;font-size:11px;border-radius:6px;box-shadow:var(--shadow-lg)">{{ page.chart.tooltipTexto }}</div>
</sc-if>
<svg sc-camel-view-box="0 0 640 190" sc-camel-preserve-aspect-ratio="none" style="width:100%;height:190px;display:block">`,
);

reemplazar(
  `<sc-for list="{{ page.chart.dots }}" as="d" hint-placeholder-count="8">
<circle sc-camel-on-mouse-enter="{{ d.onEnter }}" sc-camel-on-mouse-leave="{{ d.onLeave }}" cx="{{ d.cx }}" cy="{{ d.cy }}" r="9" fill="transparent"></circle>
<rect x="{{ d.x }}" y="{{ d.y }}" width="6" height="6" fill="{{ d.fill }}" stroke="#FFFFFF" sc-camel-stroke-width="1.5" sc-camel-vector-effect="non-scaling-stroke" style="pointer-events:none"><title>{{ d.title }}</title></rect>
</sc-for>
</svg>
</sc-if>`,
  `<sc-for list="{{ page.chart.dots }}" as="d" hint-placeholder-count="8">
<circle sc-camel-on-mouse-enter="{{ d.onEnter }}" sc-camel-on-mouse-leave="{{ d.onLeave }}" cx="{{ d.cx }}" cy="{{ d.cy }}" r="9" fill="transparent"></circle>
<rect x="{{ d.x }}" y="{{ d.y }}" width="6" height="6" fill="{{ d.fill }}" stroke="#FFFFFF" sc-camel-stroke-width="1.5" sc-camel-vector-effect="non-scaling-stroke" style="pointer-events:none"><title>{{ d.title }}</title></rect>
</sc-for>
</svg>
</div>
</sc-if>`,
);

lines[TEMPLATE_LINE] = JSON.stringify(template).replace(/<\//g, "<\\/");
fs.writeFileSync(filePath, lines.join("\n"));
console.log("OK. Tooltip del gráfico de temperatura ya no empuja el layout (sin parpadeo):", filePath);
