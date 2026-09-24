// El usuario pidió que en Análisis de consumo la fecha/período no sea
// fija: que se pueda elegir cualquier fecha real. El backend
// (/api/analisis-consumo/detalle) ya soportaba ?desde=&hasta=, pero
// el frontend nunca los mandaba, y el gráfico de arriba era 100% datos
// de ejemplo fijos (nunca usaba ese endpoint). Se agregan dos selectores
// de fecha reales (Desde/Hasta) que disparan una consulta real nueva
// cada vez que cambian, y el gráfico pasa a graficar el mismo dato real
// que ya alimenta la tabla de abajo (consumo por familia, en el rango
// elegido) en vez de un rango "Abr-Sep 2026" fijo.
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
    throw new Error("No se encontró el texto exacto (analisis fecha):\n" + desde.slice(0, 400));
  }
  template = template.replace(desde, () => hasta);
}

// 1. Estado: rango de fechas real, con un default razonable (últimos
// 6 meses) en vez de un texto fijo "Abr-Sep 2026".
reemplazar(
  `    dd: null, role: 'Administrador', nombreUsuario: 'Usuario', iniciales: '•', bodega: 'Todas', query: '', toggle: true, frio: false,`,
  `    dd: null, role: 'Administrador', nombreUsuario: 'Usuario', iniciales: '•', bodega: 'Todas', query: '', toggle: true, frio: false,
    analisisDesde: new Date(Date.now() - 180 * 86400000).toISOString().slice(0, 10),
    analisisHasta: new Date().toISOString().slice(0, 10),`,
);

// 2. Handlers de los selectores de fecha.
reemplazar(
  `  fechaCorta = (f) => String(f || '').slice(0, 10);`,
  `  fechaCorta = (f) => String(f || '').slice(0, 10);
  onAnalisisDesde = (e) => this.setState({ analisisDesde: e.target.value });
  onAnalisisHasta = (e) => this.setState({ analisisHasta: e.target.value });`,
);

// 3. Ícono de calendario expuesto al nivel raíz del render (para el
// nuevo control de fechas en la barra de filtros).
reemplazar(
  `      iconSearch: ic('search', 14), iconBell: ic('bell', 16), iconWarehouse: ic('warehouse', 14),`,
  `      iconSearch: ic('search', 14), iconBell: ic('bell', 16), iconWarehouse: ic('warehouse', 14),
      iconCalendar: ic('calendar', 14),
      analisisDesde: s.analisisDesde, analisisHasta: s.analisisHasta,
      onAnalisisDesde: this.onAnalisisDesde, onAnalisisHasta: this.onAnalisisHasta,`,
);

// 4. Control de fechas real en la barra de filtros (junto a los demás
// chips), visible solo en páginas que lo pidan (page.mostrarFechas).
reemplazar(
  `<sc-for list="{{ page.filters }}" as="f" hint-placeholder-count="2">
<button sc-camel-on-click="{{ f.go }}" style="display:inline-flex;align-items:center;gap:6px;height:30px;padding:0 11px;font-size:12px;border-radius:999px;cursor:pointer;background:var(--surface);border:1px solid var(--border-2);color:var(--fg-2)" style-hover="background:var(--bg-3)">
<span style="display:flex;color:var(--fg-3)">{{ f.icon }}</span>
<span style="color:var(--fg-3)">{{ f.label }}:</span><span style="font-weight:600;color:var(--fg-1)">{{ f.value }}</span>
<span style="display:flex;color:var(--fg-4)">{{ iconChevronDown }}</span>
</button>
</sc-for>
<div style="flex:1"></div>`,
  `<sc-for list="{{ page.filters }}" as="f" hint-placeholder-count="2">
<button sc-camel-on-click="{{ f.go }}" style="display:inline-flex;align-items:center;gap:6px;height:30px;padding:0 11px;font-size:12px;border-radius:999px;cursor:pointer;background:var(--surface);border:1px solid var(--border-2);color:var(--fg-2)" style-hover="background:var(--bg-3)">
<span style="display:flex;color:var(--fg-3)">{{ f.icon }}</span>
<span style="color:var(--fg-3)">{{ f.label }}:</span><span style="font-weight:600;color:var(--fg-1)">{{ f.value }}</span>
<span style="display:flex;color:var(--fg-4)">{{ iconChevronDown }}</span>
</button>
</sc-for>
<sc-if value="{{ page.mostrarFechas }}" hint-placeholder-val="{{ false }}">
<div style="display:flex;align-items:center;gap:6px;height:30px;padding:0 10px;border-radius:999px;background:var(--surface);border:1px solid var(--border-2)">
<span style="display:flex;color:var(--fg-3)">{{ iconCalendar }}</span>
<input type="date" value="{{ analisisDesde }}" sc-camel-on-change="{{ onAnalisisDesde }}" style="border:none;background:transparent;outline:none;font-size:12px;color:var(--fg-1);font-family:inherit">
<span style="color:var(--fg-4)">–</span>
<input type="date" value="{{ analisisHasta }}" sc-camel-on-change="{{ onAnalisisHasta }}" style="border:none;background:transparent;outline:none;font-size:12px;color:var(--fg-1);font-family:inherit">
</div>
</sc-if>
<div style="flex:1"></div>`,
);

// 5. Reescribe analisis(): fuera el gráfico y la tabla de ejemplo fijos,
// dentro el mismo dato real (agrupado por familia) para ambos, en el
// rango de fechas real elegido.
reemplazar(
  `  analisis(farmacia) {
    const series = [{ label: '2025', color: '#8494A6' }, { label: '2026', color: '#115B99' }];
    const groups = farmacia
      ? [{ label: 'Abr', values: [3.1, 3.4] }, { label: 'May', values: [3.6, 4.1] }, { label: 'Jun', values: [4.2, 4.9] }, { label: 'Jul', values: [4.8, 5.4] }, { label: 'Ago', values: [4.1, 4.6] }, { label: 'Sep', values: [3.4, 3.9] }]
      : [{ label: 'Abr', values: [28.4, 31.2] }, { label: 'May', values: [30.1, 33.8] }, { label: 'Jun', values: [34.6, 39.4] }, { label: 'Jul', values: [36.2, 41.1] }, { label: 'Ago', values: [33.0, 36.2] }, { label: 'Sep', values: [29.8, 38.4] }];
    const max = farmacia ? 6 : 45;
    const rows = farmacia
      ? [
        ['Analgésicos', 'Medicamentos', '$1,42M', '$1,31M', '+8,4%', 'ok', '36,4%'],
        ['Antibióticos', 'Medicamentos', '$0,91M', '$0,88M', '+3,4%', 'ok', '23,3%'],
        ['Antidiabéticos', 'Medicamentos', '$0,68M', '$0,74M', '−8,1%', 'bad', '17,4%'],
        ['Soluciones', 'Insumos', '$0,44M', '$0,41M', '+7,3%', 'ok', '11,3%'],
        ['Protección', 'Insumos', '$0,31M', '$0,29M', '+6,9%', 'ok', '7,9%'],
        ['Cadena de frío', 'Vacunas', '$0,14M', '$0,18M', '−22,2%', 'bad', '3,6%']
      ]
      : [
        ['Analgésicos', 'Medicamentos', '$12,8M', '$11,4M', '+12,3%', 'ok', '33,3%'],
        ['Antibióticos', 'Medicamentos', '$8,9M', '$8,1M', '+9,9%', 'ok', '23,2%'],
        ['Cadena de frío', 'Vacunas', '$6,2M', '$5,4M', '+14,8%', 'ok', '16,1%'],
        ['Soluciones', 'Insumos', '$4,1M', '$4,3M', '−4,7%', 'bad', '10,7%'],
        ['Antidiabéticos', 'Medicamentos', '$3,6M', '$3,1M', '+16,1%', 'ok', '9,4%'],
        ['Protección', 'Insumos', '$1,9M', '$2,2M', '−13,6%', 'bad', '4,9%'],
        ['Controlados', 'Medicamentos', '$0,9M', '$0,8M', '+12,5%', 'ok', '2,4%']
      ];
    return {
      isList: true,
      eyebrow: farmacia ? 'FARMACIA · INTERFAZ 26' : 'DROGUERÍA · INTERFAZ 20',
      title: farmacia ? 'Análisis de consumo (Farmacia)' : 'Análisis de consumo',
      req: 'Anexo N°4 · bloque Análisis de Consumo (3 ítems)',
      primary: null,
      secondary: [{ label: 'Exportar a Excel', icon: ic('download', 13), fn: 'exportarAnalisisConsumo' }, { label: 'Imprimir', icon: ic('printer', 13), fn: 'imprimirAnalisisConsumo' }],
      searchPlaceholder: 'Buscar por grupo, familia o producto',
      filters: [
        { label: 'Agrupar por', value: 'Familia', icon: ic('chart', 13) },
        { label: 'Período', value: 'Abr–Sep 2026', icon: ic('calendar', 13) },
        { label: 'Comparar con', value: 'Mismo período 2025', icon: ic('swap', 13) }
      ],
      chart: barsChart({
        title: 'Consumo mes a mes',
        subtitle: farmacia ? 'Millones de pesos · bodega farmacia CESFAM Raúl Cuevas' : 'Millones de pesos · red completa',
        groups, series, max,
        yLabels: [max, max * 0.75, max * 0.5, max * 0.25, 0].map(v => '$' + (Math.round(v * 10) / 10) + 'M')
      }),
      columns: cols('Grupo/artículo', ['Cantidad total', 'right'], ['N° de movimientos', 'right']),
      rows: this.cargarLista('analisis_detalle', '/api/analisis-consumo/detalle?agrupar=familia').map(r => ({
        cells: [txt(r.clave), mono(r.cantidad_total, 'right'), mono(r.movimientos, 'right')],
        actions: [{ icon: ic('chevRight', 14), title: 'Desglosar por producto', fn: 'desglosarPorProducto' }]
      })),
      footer: 'Mostrando ' + (this.state.listas.analisis_detalle || []).length + ' familias con consumo real'
    };
  }`,
  `  analisis(farmacia) {
    const desde = this.state.analisisDesde;
    const hasta = this.state.analisisHasta;
    const clave = 'analisis_detalle_' + (farmacia ? 'f_' : 'd_') + desde + '_' + hasta;
    const ruta = '/api/analisis-consumo/detalle?agrupar=familia&desde=' + desde + '&hasta=' + hasta;
    const detalle = this.cargarLista(clave, ruta) || [];
    const top = detalle.slice(0, 6);
    const maxCant = Math.max(1, ...top.map(r => r.cantidad_total));
    return {
      isList: true,
      eyebrow: farmacia ? 'FARMACIA · INTERFAZ 26' : 'DROGUERÍA · INTERFAZ 20',
      title: farmacia ? 'Análisis de consumo (Farmacia)' : 'Análisis de consumo',
      req: 'Anexo N°4 · bloque Análisis de Consumo (3 ítems)',
      primary: null,
      mostrarFechas: true,
      secondary: [{ label: 'Exportar a Excel', icon: ic('download', 13), fn: 'exportarAnalisisConsumo' }, { label: 'Imprimir', icon: ic('printer', 13), fn: 'imprimirAnalisisConsumo' }],
      searchPlaceholder: 'Buscar por grupo, familia o producto',
      filters: [
        { label: 'Agrupar por', value: 'Familia', icon: ic('chart', 13) }
      ],
      chart: barsChart({
        title: 'Consumo por familia',
        subtitle: 'Real · ' + (farmacia ? 'Farmacia' : 'Droguería') + ' · ' + desde + ' a ' + hasta,
        groups: top.map(r => ({ label: r.clave, values: [r.cantidad_total] })),
        series: [{ label: 'Cantidad consumida', color: '#115B99' }],
        max: maxCant,
        yLabels: [maxCant, maxCant * 0.75, maxCant * 0.5, maxCant * 0.25, 0].map(v => String(Math.round(v)))
      }),
      columns: cols('Grupo/artículo', ['Cantidad total', 'right'], ['N° de movimientos', 'right']),
      rows: detalle.map(r => ({
        cells: [txt(r.clave), mono(r.cantidad_total, 'right'), mono(r.movimientos, 'right')],
        actions: [{ icon: ic('chevRight', 14), title: 'Desglosar por producto', fn: 'desglosarPorProducto' }]
      })),
      footer: 'Mostrando ' + detalle.length + ' familias con consumo real · ' + desde + ' a ' + hasta
    };
  }`,
);

lines[TEMPLATE_LINE] = JSON.stringify(template).replace(/<\//g, "<\\/");
fs.writeFileSync(filePath, lines.join("\n"));
console.log("OK. Análisis de consumo: rango de fechas real + gráfico real:", filePath);
