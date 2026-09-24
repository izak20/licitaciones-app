// El usuario pidió que TODOS los gráficos tengan tooltip al pasar el
// cursor o tocar (ya se hizo para los de barras: Analíticas y Análisis
// de consumo). El único gráfico que faltaba era el de línea de Control
// de temperatura — y además resultó ser, igual que los otros antes de
// corregirlos, 100% datos de ejemplo fijos ("14 sep 2026", valores
// inventados) a pesar de que la tabla debajo ya era real. Se arregla
// junto con el tooltip: no tendría sentido mostrar "claridad de lo que
// se muestra" sobre un dato falso.
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
    throw new Error("No se encontró el texto exacto (temperatura real+tooltip):\n" + desde.slice(0, 400));
  }
  template = template.replace(desde, () => hasta);
}

// 1. lineChart(): cada punto ahora sabe su propia key/tooltip/click,
// igual que ya hace barsChart(); el color de "fuera de rango" puede
// venir de un dato real por punto (fueraDeRango[]) en vez de solo
// compararse contra un band numérico inventado.
reemplazar(
  `function lineChart(o) {
  const W = 640, H = 190, vals = o.values, n = vals.length, min = o.min, max = o.max, band = o.band;
  const X = i => +(n === 1 ? 0 : i * (W / (n - 1))).toFixed(1);
  const Y = v => +(H - ((v - min) / (max - min)) * H).toFixed(1);
  return {
    isLine: true, title: o.title, subtitle: o.subtitle, xLabels: o.xLabels,
    points: vals.map((v, i) => X(i) + ',' + Y(v)).join(' '),
    area: 'M' + X(0) + ',' + H + ' L' + vals.map((v, i) => X(i) + ',' + Y(v)).join(' L') + ' L' + X(n - 1) + ',' + H + ' Z',
    grid: [0, 0.25, 0.5, 0.75, 1].map(f => ({ y: +(H * f).toFixed(1) })),
    yLabels: [1, 0.75, 0.5, 0.25, 0].map(f => String(+(min + (max - min) * f).toFixed(1))),
    dots: vals.map((v, i) => ({ x: +(X(i) - 3).toFixed(1), y: +(Y(v) - 3).toFixed(1), fill: band && (v < band[0] || v > band[1]) ? '#C0362C' : '#115B99' })),
    bandY: band ? Y(band[1]) : 0, bandH: band ? +(Y(band[0]) - Y(band[1])).toFixed(1) : 0,
    legend: o.legend
  };
}`,
  `function lineChart(o) {
  const W = 640, H = 190, vals = o.values, n = vals.length, min = o.min, max = o.max, band = o.band;
  const X = i => +(n === 1 ? 0 : i * (W / (n - 1))).toFixed(1);
  const Y = v => +(H - ((v - min) / (max - min)) * H).toFixed(1);
  return {
    isLine: true, title: o.title, subtitle: o.subtitle, xLabels: o.xLabels,
    points: vals.map((v, i) => X(i) + ',' + Y(v)).join(' '),
    area: 'M' + X(0) + ',' + H + ' L' + vals.map((v, i) => X(i) + ',' + Y(v)).join(' L') + ' L' + X(n - 1) + ',' + H + ' Z',
    grid: [0, 0.25, 0.5, 0.75, 1].map(f => ({ y: +(H * f).toFixed(1) })),
    yLabels: [1, 0.75, 0.5, 0.25, 0].map(f => String(+(min + (max - min) * f).toFixed(1))),
    dots: vals.map((v, i) => {
      const fuera = o.fueraDeRango ? !!o.fueraDeRango[i] : !!(band && (v < band[0] || v > band[1]));
      const key = (o.tooltipPrefix || '') + i;
      const cx = +X(i).toFixed(1), cy = +Y(v).toFixed(1);
      return {
        x: +(cx - 3).toFixed(1), y: +(cy - 3).toFixed(1), cx, cy,
        fill: fuera ? '#C0362C' : '#115B99',
        title: (o.xLabels && o.xLabels[i] ? o.xLabels[i] + ' — ' : '') + v + (o.unidad || ''),
        activo: o.tooltipActivo ? o.tooltipActivo(key) : false,
        onClick: o.onDotClick ? o.onDotClick(key) : undefined
      };
    }),
    bandY: band ? Y(band[1]) : 0, bandH: band ? +(Y(band[0]) - Y(band[1])).toFixed(1) : 0,
    legend: o.legend
  };
}`,
);

// 2. Markup: puntos clicables (con un área de toque más grande e
// invisible, para que sea fácil de tocar en el celular) + franja con
// el detalle del punto activo.
reemplazar(
  `<sc-if value="{{ page.chart.isLine }}" hint-placeholder-val="{{ false }}">
<svg sc-camel-view-box="0 0 640 190" sc-camel-preserve-aspect-ratio="none" style="width:100%;height:190px;display:block">
<rect x="0" y="{{ page.chart.bandY }}" width="640" height="{{ page.chart.bandH }}" fill="#E3F5EC"></rect>
<sc-for list="{{ page.chart.grid }}" as="g" hint-placeholder-count="5">
<line x1="0" y1="{{ g.y }}" x2="640" y2="{{ g.y }}" stroke="#E2E8F0" sc-camel-stroke-width="1" sc-camel-vector-effect="non-scaling-stroke"></line>
</sc-for>
<path d="{{ page.chart.area }}" fill="rgba(17,91,153,0.10)"></path>
<polyline points="{{ page.chart.points }}" fill="none" stroke="#115B99" sc-camel-stroke-width="2" sc-camel-stroke-linejoin="round" sc-camel-stroke-linecap="round" sc-camel-vector-effect="non-scaling-stroke"></polyline>
<sc-for list="{{ page.chart.dots }}" as="d" hint-placeholder-count="8">
<rect x="{{ d.x }}" y="{{ d.y }}" width="6" height="6" fill="{{ d.fill }}" stroke="#FFFFFF" sc-camel-stroke-width="1.5" sc-camel-vector-effect="non-scaling-stroke"></rect>
</sc-for>
</svg>
</sc-if>`,
  `<sc-if value="{{ page.chart.isLine }}" hint-placeholder-val="{{ false }}">
<sc-if value="{{ page.chart.tooltipTexto }}" hint-placeholder-val="{{ false }}">
<div style="display:inline-flex;align-items:center;gap:6px;margin-bottom:10px;padding:6px 10px;background:var(--brand-slate);color:#fff;font-size:11px;border-radius:6px">{{ page.chart.tooltipTexto }}</div>
</sc-if>
<svg sc-camel-view-box="0 0 640 190" sc-camel-preserve-aspect-ratio="none" style="width:100%;height:190px;display:block">
<rect x="0" y="{{ page.chart.bandY }}" width="640" height="{{ page.chart.bandH }}" fill="#E3F5EC"></rect>
<sc-for list="{{ page.chart.grid }}" as="g" hint-placeholder-count="5">
<line x1="0" y1="{{ g.y }}" x2="640" y2="{{ g.y }}" stroke="#E2E8F0" sc-camel-stroke-width="1" sc-camel-vector-effect="non-scaling-stroke"></line>
</sc-for>
<path d="{{ page.chart.area }}" fill="rgba(17,91,153,0.10)"></path>
<polyline points="{{ page.chart.points }}" fill="none" stroke="#115B99" sc-camel-stroke-width="2" sc-camel-stroke-linejoin="round" sc-camel-stroke-linecap="round" sc-camel-vector-effect="non-scaling-stroke"></polyline>
<sc-for list="{{ page.chart.dots }}" as="d" hint-placeholder-count="8">
<circle sc-camel-on-click="{{ d.onClick }}" cx="{{ d.cx }}" cy="{{ d.cy }}" r="9" fill="transparent" style="cursor:pointer"></circle>
<rect x="{{ d.x }}" y="{{ d.y }}" width="6" height="6" fill="{{ d.fill }}" stroke="#FFFFFF" sc-camel-stroke-width="1.5" sc-camel-vector-effect="non-scaling-stroke" style="pointer-events:none"><title>{{ d.title }}</title></rect>
</sc-for>
</svg>
</sc-if>`,
);

// 3. temperatura(): gráfico real (últimos registros reales, con quién
// bodega y si está fuera de rango real, no inventado), banner real
// (solo aparece si de verdad hay una excursión reciente) y clic para
// ver el detalle de cada punto.
reemplazar(
  `  temperatura() {
    return {
      isList: true, eyebrow: 'DROGUERÍA · INTERFAZ 16', title: 'Control de temperatura',
      req: 'Anexo N°4 · bloque Control de temperatura (2 ítems)',
      primary: { label: 'Registrar temperatura', modal: 'temperatura' },
      secondary: [{ label: 'Exportar', icon: ic('download', 13), fn: 'exportarTemperatura' }, { label: 'Imprimir', icon: ic('printer', 13), fn: 'imprimirTemperatura' }],
      searchPlaceholder: 'Buscar por usuario',
      filters: [
        { label: 'Ubicación', value: 'Bodega refrigerada 1', icon: ic('snow', 13) },
        { label: 'Rango', value: '14 sep 2026', icon: ic('calendar', 13) }
      ],
      banner: { bg: B.bad[0], border: B.bad[2], fg: B.bad[1], icon: ic('alert', 15), text: 'Excursión de temperatura detectada a las 14:00 (9,2 °C). Se emitió aviso y se registró la acción correctiva en el log de auditoría.' },
      chart: lineChart({
        title: 'Temperatura registrada · Bodega refrigerada 1',
        subtitle: '14 sep 2026 · lecturas cada 2 horas · rango permitido 2 °C a 8 °C',
        values: [4.1, 3.8, 4.0, 4.4, 5.1, 6.2, 7.4, 9.2, 6.8, 5.2, 4.6, 4.2],
        min: 0, max: 12, band: [2, 8],
        xLabels: ['00:00', '02:00', '04:00', '06:00', '08:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00', '22:00'],
        legend: [{ label: 'Temperatura', color: '#115B99' }, { label: 'Rango permitido', color: '#E3F5EC' }, { label: 'Fuera de rango', color: '#C0362C' }]
      }),
      columns: cols('Fecha', 'Hora', 'Bodega', ['Temperatura', 'right'], 'Estado'),
      rows: this.cargarLista('temperatura', '/api/temperatura/registros').map(m => {
        const bodega = this.desanidar(m.bodega);
        const fh = String(m.fecha_registro || '');
        return {
          cells: [txt(fh.slice(0, 10)), mono(fh.slice(11, 16)), txt(bodega ? bodega.nombre : '—'), mono(m.temperatura + ' °C', 'right', m.fuera_de_rango ? B.bad[1] : 'var(--fg-1)'), badge(m.fuera_de_rango ? 'FUERA DE RANGO' : 'EN RANGO', m.fuera_de_rango ? 'bad' : 'ok')],
          actions: []
        };
      }),
      footer: 'Mostrando ' + (this.state.listas.temperatura || []).length + ' registros reales'
    };
  }`,
  `  temperatura() {
    const registros = this.cargarLista('temperatura', '/api/temperatura/registros') || [];
    const recientes = registros.slice(0, 20).slice().reverse();
    const valores = recientes.length ? recientes.map(r => Number(r.temperatura)) : [0];
    const min = recientes.length ? Math.min(...valores) - 1 : 0;
    const max = recientes.length ? Math.max(...valores) + 1 : 10;
    const fueraDeRango = recientes.map(r => !!r.fuera_de_rango);
    const xLabels = recientes.map(r => String(r.fecha_registro || '').slice(5, 16).replace('T', ' '));
    const tooltipPrefix = 'temperatura_';
    const activeKey = this.state.chartTooltipKey;
    let tooltipTexto = '';
    if (activeKey && activeKey.indexOf(tooltipPrefix) === 0 && recientes.length) {
      const idx = parseInt(activeKey.slice(tooltipPrefix.length), 10);
      const r = recientes[idx];
      if (r) {
        const bodega = this.desanidar(r.bodega);
        tooltipTexto = (bodega ? bodega.nombre : 'Bodega') + ' · ' + String(r.fecha_registro).slice(0, 16).replace('T', ' ') + ' · ' + r.temperatura + ' °C' + (r.fuera_de_rango ? ' · FUERA DE RANGO' : '');
      }
    }
    const ultimaFueraDeRango = recientes.slice().reverse().find(r => r.fuera_de_rango);
    return {
      isList: true, eyebrow: 'DROGUERÍA · INTERFAZ 16', title: 'Control de temperatura',
      req: 'Anexo N°4 · bloque Control de temperatura (2 ítems)',
      primary: { label: 'Registrar temperatura', modal: 'temperatura' },
      secondary: [{ label: 'Exportar', icon: ic('download', 13), fn: 'exportarTemperatura' }, { label: 'Imprimir', icon: ic('printer', 13), fn: 'imprimirTemperatura' }],
      searchPlaceholder: 'Buscar por bodega',
      filters: [],
      banner: ultimaFueraDeRango ? {
        bg: B.bad[0], border: B.bad[2], fg: B.bad[1], icon: ic('alert', 15),
        text: 'Excursión real detectada: ' + ((this.desanidar(ultimaFueraDeRango.bodega) || {}).nombre || 'bodega') + ' · ' + String(ultimaFueraDeRango.fecha_registro).slice(0, 16).replace('T', ' ') + ' · ' + ultimaFueraDeRango.temperatura + ' °C'
      } : null,
      chart: Object.assign(lineChart({
        title: 'Temperatura registrada',
        subtitle: 'Real · últimos ' + recientes.length + ' registros · toca un punto para ver el detalle',
        values: valores,
        min, max,
        xLabels,
        legend: [{ label: 'Temperatura', color: '#115B99' }, { label: 'Fuera de rango', color: '#C0362C' }],
        fueraDeRango,
        tooltipPrefix,
        tooltipActivo: (key) => this.state.chartTooltipKey === key,
        onDotClick: (key) => () => this.toggleChartTooltip(key)
      }), { tooltipTexto }),
      columns: cols('Fecha', 'Hora', 'Bodega', ['Temperatura', 'right'], 'Estado'),
      rows: registros.map(m => {
        const bodega = this.desanidar(m.bodega);
        const fh = String(m.fecha_registro || '');
        return {
          cells: [txt(fh.slice(0, 10)), mono(fh.slice(11, 16)), txt(bodega ? bodega.nombre : '—'), mono(m.temperatura + ' °C', 'right', m.fuera_de_rango ? B.bad[1] : 'var(--fg-1)'), badge(m.fuera_de_rango ? 'FUERA DE RANGO' : 'EN RANGO', m.fuera_de_rango ? 'bad' : 'ok')],
          actions: []
        };
      }),
      footer: 'Mostrando ' + registros.length + ' registros reales'
    };
  }`,
);

lines[TEMPLATE_LINE] = JSON.stringify(template).replace(/<\//g, "<\\/");
fs.writeFileSync(filePath, lines.join("\n"));
console.log("OK. Control de temperatura: gráfico real + tooltips reales:", filePath);
