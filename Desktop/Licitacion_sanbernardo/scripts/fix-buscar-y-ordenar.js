// Dos cosas reales que faltaban en TODAS las tablas:
// 1. El buscador de cada tabla nunca estuvo conectado a nada — era un
//    <input> puramente decorativo (sin value ni onChange) en cada
//    página de la app. Ahora filtra de verdad, buscando el texto en
//    cualquier columna visible.
// 2. Clic en el encabezado de una columna ordena la tabla por esa
//    columna (clic de nuevo invierte el sentido). Funciona sobre
//    cualquier tabla porque se implementa una sola vez en el
//    ensamblado central de columnas/filas (igual que mostrar/ocultar
//    y reordenar).
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
    throw new Error("No se encontró el texto exacto (buscar y ordenar):\n" + desde.slice(0, 400));
  }
  template = template.replace(desde, () => hasta);
}

// 1. Helper module-level: valor comparable de una celda ya renderizada
// (texto o número, según lo que traiga), para poder ordenar filas.
reemplazar(
  `function barsChart(o) {`,
  `function valorOrdenable(celda) {
  if (!celda) return '';
  if (celda.isCheck) return celda.checked ? 1 : 0;
  if (typeof celda.text === 'number') return celda.text;
  return (celda.text !== undefined && celda.text !== null ? String(celda.text) : '').toLowerCase();
}

function barsChart(o) {`,
);

// 2. Estado: texto de búsqueda de la tabla actual y qué columna/orden
// está activo.
reemplazar(
  `    chartTooltipKey: null, columnasPagina: {},`,
  `    chartTooltipKey: null, columnasPagina: {}, busquedaTabla: '',
    ordenTabla: { pagina: null, columna: null, direccion: 'asc' },`,
);

// 3. Se limpia la búsqueda de tabla al cambiar de página (si no,
// quedaría "pegada" un buscador de otra tabla al navegar).
reemplazar(
  `  go = (page) => () => this.setState({ page, tab: 0, dd: null, modal: null, drawer: false, navOpen: false, estadoOverride: null, form: {} });`,
  `  go = (page) => () => this.setState({ page, tab: 0, dd: null, modal: null, drawer: false, navOpen: false, estadoOverride: null, form: {}, busquedaTabla: '' });`,
);

// 4. Métodos: escribir en el buscador, y ordenar por columna (clic de
// nuevo sobre la misma invierte asc/desc).
reemplazar(
  `  toggleChartTooltip = (key) => this.setState(s => ({ chartTooltipKey: s.chartTooltipKey === key ? null : key }));`,
  `  toggleChartTooltip = (key) => this.setState(s => ({ chartTooltipKey: s.chartTooltipKey === key ? null : key }));
  onBusquedaTabla = (e) => this.setState({ busquedaTabla: e.target.value });
  ordenarPor = (columna) => this.setState(s => {
    const misma = s.ordenTabla.pagina === s.page && s.ordenTabla.columna === columna;
    const direccion = misma && s.ordenTabla.direccion === 'asc' ? 'desc' : 'asc';
    return { ordenTabla: { pagina: s.page, columna, direccion } };
  });`,
);

// 5. renderVals(): arma filasFinal (columnas visibles/orden real ya
// existente + filtro de búsqueda + orden por columna) y columnasConOrden
// (con el ícono/click de orden) antes de ensamblar "pg".
reemplazar(
  `    const indicesEnOrden = ordenPagina.filter(l => !ocultasPagina.includes(l)).map(l => labelsBase.indexOf(l));`,
  `    const indicesEnOrden = ordenPagina.filter(l => !ocultasPagina.includes(l)).map(l => labelsBase.indexOf(l));
    const columnasFinal = indicesEnOrden.map(i => columnasBase[i]);

    let filasFinal = (page.rows || []).map(r => Object.assign({}, r, {
      cells: indicesEnOrden.map(i => (r.cells || [])[i]),
      actions: (r.actions || []).map(a => Object.assign({ isIcon: !a.isLabeled }, a, { go: a.go || this.run(a.fn, a.payload) }))
    }));
    const totalAntesDeFiltrar = filasFinal.length;
    const busqueda = (s.busquedaTabla || '').trim().toLowerCase();
    if (busqueda) {
      filasFinal = filasFinal.filter(r => (r.cells || []).some(c => {
        if (!c) return false;
        return [c.text, c.sub].some(v => v !== undefined && v !== null && String(v).toLowerCase().includes(busqueda));
      }));
    }
    const ordenActivo = (s.ordenTabla && s.ordenTabla.pagina === s.page) ? s.ordenTabla.columna : null;
    if (ordenActivo) {
      const idxOrden = columnasFinal.findIndex(c => c.label === ordenActivo);
      const dirMul = s.ordenTabla.direccion === 'desc' ? -1 : 1;
      if (idxOrden >= 0) {
        filasFinal = filasFinal.slice().sort((ra, rb) => {
          const va = valorOrdenable((ra.cells || [])[idxOrden]);
          const vb = valorOrdenable((rb.cells || [])[idxOrden]);
          if (va < vb) return -1 * dirMul;
          if (va > vb) return 1 * dirMul;
          return 0;
        });
      }
    }
    const columnasConOrden = columnasFinal.map(c => {
      const activa = ordenActivo === c.label;
      return Object.assign({}, c, {
        ordenIcono: activa ? (s.ordenTabla.direccion === 'desc' ? '↓' : '↑') : '',
        colorHeader: activa ? 'var(--brand-blue)' : 'var(--fg-3)',
        onClickOrden: () => this.ordenarPor(c.label)
      });
    });`,
);

// 6. Usa filasFinal/columnasConOrden ya calculadas (con búsqueda y
// orden aplicados) en vez de recalcular columns/rows desde cero, y
// ajusta el footer para mostrar cuántas coinciden cuando hay búsqueda.
reemplazar(
  `      columns: indicesEnOrden.map(i => columnasBase[i]),
      rows: (page.rows || []).map(r => Object.assign({}, r, {
        cells: indicesEnOrden.map(i => (r.cells || [])[i]),
        actions: (r.actions || []).map(a => Object.assign({ isIcon: !a.isLabeled }, a, { go: a.go || this.run(a.fn, a.payload) }))
      })),`,
  `      columns: columnasConOrden,
      rows: filasFinal,
      footer: (page.footer && busqueda) ? (filasFinal.length + ' de ' + totalAntesDeFiltrar + ' coinciden con "' + s.busquedaTabla + '"') : page.footer,`,
);

// 7. Expone busquedaTabla/onBusquedaTabla al nivel raíz del render
// (igual que query/onQuery, el buscador global del header).
reemplazar(
  `      onQuery: (e) => this.setState({ query: e.target.value, dd: 'search' }),`,
  `      onQuery: (e) => this.setState({ query: e.target.value, dd: 'search' }),
      busquedaTabla: s.busquedaTabla, onBusquedaTabla: this.onBusquedaTabla,`,
);

// 8. Markup: encabezado clicable con indicador de orden, y el buscador
// de cada tabla realmente conectado (antes no tenía value ni onChange).
reemplazar(
  `<sc-raw-th style="padding:9px 12px;font-size:9.5px;font-weight:600;color:var(--fg-3);text-transform:uppercase;letter-spacing:0.08em;white-space:nowrap;text-align:{{ c.align }}">{{ c.label }}</sc-raw-th>`,
  `<sc-raw-th sc-camel-on-click="{{ c.onClickOrden }}" style="padding:9px 12px;font-size:9.5px;font-weight:600;color:{{ c.colorHeader }};text-transform:uppercase;letter-spacing:0.08em;white-space:nowrap;text-align:{{ c.align }};cursor:pointer;user-select:none">{{ c.label }} {{ c.ordenIcono }}</sc-raw-th>`,
);
reemplazar(
  `<input placeholder="{{ page.searchPlaceholder }}" style="flex:1;min-width:0;border:none;background:transparent;outline:none;font-size:12px;color:var(--fg-1)">`,
  `<input placeholder="{{ page.searchPlaceholder }}" value="{{ busquedaTabla }}" sc-camel-on-change="{{ onBusquedaTabla }}" style="flex:1;min-width:0;border:none;background:transparent;outline:none;font-size:12px;color:var(--fg-1)">`,
);

lines[TEMPLATE_LINE] = JSON.stringify(template).replace(/<\//g, "<\\/");
fs.writeFileSync(filePath, lines.join("\n"));
console.log("OK. Buscador real + orden por columna en todas las tablas:", filePath);
