// Tooltips reales en los gráficos de barras (Analíticas, Análisis de
// consumo): al hacer clic/tap en una barra (funciona igual en mouse
// que en touch, a diferencia de un hover que no existe en celular) se
// muestra qué representa exactamente esa barra (mes o familia, y el
// valor). De paso el texto del tooltip ahora incluye la etiqueta del
// grupo (antes solo decía "Unidades consumidas: 650", sin decir de
// qué mes era).
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
    throw new Error("No se encontró el texto exacto (chart tooltips):\n" + desde.slice(0, 400));
  }
  template = template.replace(desde, () => hasta);
}

// 1. Estado: qué barra tiene su tooltip abierto ahora mismo.
reemplazar(
  `    analisisDesde: new Date(Date.now() - 180 * 86400000).toISOString().slice(0, 10),`,
  `    chartTooltipKey: null,
    analisisDesde: new Date(Date.now() - 180 * 86400000).toISOString().slice(0, 10),`,
);

// 2. Método genérico para abrir/cerrar el tooltip de una barra (clic
// de nuevo sobre la misma barra lo cierra).
reemplazar(
  `  onAnalisisDesde = (e) => this.setState({ analisisDesde: e.target.value });`,
  `  toggleChartTooltip = (key) => this.setState(s => ({ chartTooltipKey: s.chartTooltipKey === key ? null : key }));
  onAnalisisDesde = (e) => this.setState({ analisisDesde: e.target.value });`,
);

// 3. barsChart(): cada barra ahora sabe su propia "key", si está activa
// y su handler de clic; el texto del tooltip incluye la etiqueta del
// grupo (mes/familia), no solo el valor.
reemplazar(
  `function barsChart(o) {
  return {
    isBars: true, title: o.title, subtitle: o.subtitle, legend: o.series,
    xLabels: o.groups.map(g => g.label), yLabels: o.yLabels,
    groups: o.groups.map(g => ({
      bars: g.values.map((v, i) => ({ h: ((v / o.max) * 100).toFixed(1) + '%', color: o.series[i].color, title: o.series[i].label + ': ' + v }))
    }))
  };
}`,
  `function barsChart(o) {
  return {
    isBars: true, title: o.title, subtitle: o.subtitle, legend: o.series,
    xLabels: o.groups.map(g => g.label), yLabels: o.yLabels,
    groups: o.groups.map((g, gi) => ({
      bars: g.values.map((v, i) => {
        const key = (o.tooltipPrefix || '') + gi + '_' + i;
        const texto = g.label + ' — ' + o.series[i].label + ': ' + v;
        return {
          h: ((v / o.max) * 100).toFixed(1) + '%',
          color: o.series[i].color,
          title: texto,
          activo: o.tooltipActivo ? o.tooltipActivo(key) : false,
          onClick: o.onBarClick ? o.onBarClick(key) : undefined
        };
      })
    }))
  };
}`,
);

// 4. Markup: cada barra queda en un contenedor relativo con su propio
// tooltip flotante encima cuando está activa, y un clic la abre/cierra.
reemplazar(
  `<sc-if value="{{ page.chart.isBars }}" hint-placeholder-val="{{ false }}">
<div style="display:flex;align-items:flex-end;gap:10px;height:190px;border-bottom:1px solid var(--border-1)">
<sc-for list="{{ page.chart.groups }}" as="g" hint-placeholder-count="6">
<div style="flex:1;min-width:0;height:100%;display:flex;align-items:flex-end;justify-content:center;gap:4px">
<sc-for list="{{ g.bars }}" as="b" hint-placeholder-count="2">
<div title="{{ b.title }}" style="flex:1;max-width:26px;height:{{ b.h }};background:{{ b.color }};border-radius:3px 3px 0 0"></div>
</sc-for>
</div>
</sc-for>
</div>
</sc-if>`,
  `<sc-if value="{{ page.chart.isBars }}" hint-placeholder-val="{{ false }}">
<div style="display:flex;align-items:flex-end;gap:10px;height:190px;border-bottom:1px solid var(--border-1)">
<sc-for list="{{ page.chart.groups }}" as="g" hint-placeholder-count="6">
<div style="flex:1;min-width:0;height:100%;display:flex;align-items:flex-end;justify-content:center;gap:4px">
<sc-for list="{{ g.bars }}" as="b" hint-placeholder-count="2">
<div style="position:relative;flex:1;max-width:26px;height:100%;display:flex;align-items:flex-end">
<sc-if value="{{ b.activo }}" hint-placeholder-val="{{ false }}">
<div style="position:absolute;bottom:100%;left:50%;transform:translateX(-50%);margin-bottom:6px;padding:6px 10px;background:var(--brand-slate);color:#fff;font-size:11px;line-height:1.4;border-radius:6px;white-space:nowrap;box-shadow:var(--shadow-lg);z-index:10">{{ b.title }}</div>
</sc-if>
<div sc-camel-on-click="{{ b.onClick }}" title="{{ b.title }}" style="width:100%;height:{{ b.h }};background:{{ b.color }};border-radius:3px 3px 0 0;cursor:pointer"></div>
</div>
</sc-for>
</div>
</sc-for>
</div>
</sc-if>`,
);

// 5. Analíticas: pasa las opciones de tooltip a su barsChart().
reemplazar(
  `      chart: barsChart({
        title: 'Consumo mes a mes (unidades)',
        subtitle: 'Real · últimos 6 meses · según lo que tu perfil puede ver',
        groups: tendencia.map(t => ({ label: nombreMes(t.mes), values: [t.cantidad] })),
        series: [{ label: 'Unidades consumidas', color: '#115B99' }],
        max,
        yLabels: [max, max * 0.75, max * 0.5, max * 0.25, 0].map(v => String(Math.round(v)))
      }),`,
  `      chart: barsChart({
        title: 'Consumo mes a mes (unidades)',
        subtitle: 'Real · últimos 6 meses · según lo que tu perfil puede ver',
        groups: tendencia.map(t => ({ label: nombreMes(t.mes), values: [t.cantidad] })),
        series: [{ label: 'Unidades consumidas', color: '#115B99' }],
        max,
        yLabels: [max, max * 0.75, max * 0.5, max * 0.25, 0].map(v => String(Math.round(v))),
        tooltipPrefix: 'analiticas_',
        tooltipActivo: (key) => this.state.chartTooltipKey === key,
        onBarClick: (key) => () => this.toggleChartTooltip(key)
      }),`,
);

// 6. Análisis de consumo: idem.
reemplazar(
  `      chart: barsChart({
        title: 'Consumo por familia',
        subtitle: 'Real · ' + (farmacia ? 'Farmacia' : 'Droguería') + ' · ' + desde + ' a ' + hasta,
        groups: top.map(r => ({ label: r.clave, values: [r.cantidad_total] })),
        series: [{ label: 'Cantidad consumida', color: '#115B99' }],
        max: maxCant,
        yLabels: [maxCant, maxCant * 0.75, maxCant * 0.5, maxCant * 0.25, 0].map(v => String(Math.round(v)))
      }),`,
  `      chart: barsChart({
        title: 'Consumo por familia',
        subtitle: 'Real · ' + (farmacia ? 'Farmacia' : 'Droguería') + ' · ' + desde + ' a ' + hasta,
        groups: top.map(r => ({ label: r.clave, values: [r.cantidad_total] })),
        series: [{ label: 'Cantidad consumida', color: '#115B99' }],
        max: maxCant,
        yLabels: [maxCant, maxCant * 0.75, maxCant * 0.5, maxCant * 0.25, 0].map(v => String(Math.round(v))),
        tooltipPrefix: 'analisis_' + (farmacia ? 'f_' : 'd_'),
        tooltipActivo: (key) => this.state.chartTooltipKey === key,
        onBarClick: (key) => () => this.toggleChartTooltip(key)
      }),`,
);

lines[TEMPLATE_LINE] = JSON.stringify(template).replace(/<\//g, "<\\/");
fs.writeFileSync(filePath, lines.join("\n"));
console.log("OK. Tooltips reales en gráficos de barras (clic/tap):", filePath);
