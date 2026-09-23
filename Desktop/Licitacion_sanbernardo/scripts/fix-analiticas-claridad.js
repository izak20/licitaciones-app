// El usuario reportó que el gráfico de Analíticas solo mostraba
// números (el mes como "04", "05"... en vez de nombres) y que la tabla
// de abajo "no coincide" con el gráfico. Causa real: el eje X mostraba
// el número de mes crudo (t.mes.slice(5) de "2026-04" -> "04"), sin
// ningún nombre; y la tabla muestra el TOTAL de 6 meses por artículo/
// bodega (no por mes), algo que nunca se explicaba, así que no hay
// forma de que "coincida" con una sola barra sin saberlo.
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
    throw new Error("No se encontró el texto exacto (analiticas claridad):\n" + desde.slice(0, 400));
  }
  template = template.replace(desde, () => hasta);
}

reemplazar(
  `  analiticas() {
    const resumen = this.cargarLista('analiticas_resumen', '/api/analiticas/resumen') || {};
    const tendencia = resumen.tendencia_mensual || [];
    const topArticulos = resumen.top_articulos || [];
    const topBodegas = resumen.top_bodegas || [];
    const mesActual = resumen.mes_actual || { mes: '', cantidad: 0 };
    const mesAnterior = resumen.mes_anterior || { mes: '', cantidad: 0 };
    const delta = mesAnterior.cantidad
      ? Math.round(((mesActual.cantidad - mesAnterior.cantidad) / mesAnterior.cantidad) * 1000) / 10
      : null;
    const max = Math.max(1, ...tendencia.map(t => t.cantidad), 1);
    return {
      isList: true, eyebrow: 'INTELIGENCIA', title: 'Analíticas',
      req: 'Consumo real (despachos y vales de consumo) de los últimos 6 meses',
      primary: null, secondary: [],
      searchPlaceholder: 'Buscar por artículo o bodega',
      filters: [],
      chart: barsChart({
        title: 'Consumo mes a mes (unidades)',
        subtitle: 'Real · últimos 6 meses · según lo que tu perfil puede ver',
        groups: tendencia.map(t => ({ label: t.mes.slice(5), values: [t.cantidad] })),
        series: [{ label: 'Unidades consumidas', color: '#115B99' }],
        max,
        yLabels: [max, max * 0.75, max * 0.5, max * 0.25, 0].map(v => String(Math.round(v)))
      }),
      columns: cols('Tipo', 'Nombre', ['Cantidad consumida', 'right']),
      rows: topArticulos.map(a => ({ cells: [txt('Artículo'), txt(a.nombre), mono(a.cantidad, 'right')] }))
        .concat(topBodegas.map(b => ({ cells: [txt('Bodega'), txt(b.nombre), mono(b.cantidad, 'right')] }))),
      footer: 'Mes actual (' + (mesActual.mes || '—') + '): ' + mesActual.cantidad + ' unidades' +
        (delta !== null ? ' · ' + (delta >= 0 ? '+' : '') + delta + '% vs mes anterior' : '')
    };
  }`,
  `  analiticas() {
    const MESES_CORTOS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const nombreMes = (mesIso) => {
      const n = parseInt((mesIso || '').slice(5, 7), 10);
      return MESES_CORTOS[n - 1] || mesIso;
    };
    const resumen = this.cargarLista('analiticas_resumen', '/api/analiticas/resumen') || {};
    const tendencia = resumen.tendencia_mensual || [];
    const topArticulos = resumen.top_articulos || [];
    const topBodegas = resumen.top_bodegas || [];
    const mesActual = resumen.mes_actual || { mes: '', cantidad: 0 };
    const mesAnterior = resumen.mes_anterior || { mes: '', cantidad: 0 };
    const delta = mesAnterior.cantidad
      ? Math.round(((mesActual.cantidad - mesAnterior.cantidad) / mesAnterior.cantidad) * 1000) / 10
      : null;
    const max = Math.max(1, ...tendencia.map(t => t.cantidad), 1);
    return {
      isList: true, eyebrow: 'INTELIGENCIA', title: 'Analíticas',
      req: 'Consumo real (despachos y vales de consumo) de los últimos 6 meses',
      primary: null, secondary: [],
      searchPlaceholder: 'Buscar por artículo o bodega',
      filters: [],
      banner: { bg: B.info[0], border: B.info[2], fg: B.info[1], icon: ic('info', 15), text: 'El gráfico muestra el total de unidades consumidas por mes (barra = 1 mes). La tabla de abajo es distinta: son los 5 artículos y las 5 bodegas con más consumo acumulado en TODO el período de 6 meses, no por mes — por eso sus números no tienen por qué coincidir con una sola barra.' },
      chart: barsChart({
        title: 'Consumo mes a mes (unidades)',
        subtitle: 'Real · últimos 6 meses · según lo que tu perfil puede ver',
        groups: tendencia.map(t => ({ label: nombreMes(t.mes), values: [t.cantidad] })),
        series: [{ label: 'Unidades consumidas', color: '#115B99' }],
        max,
        yLabels: [max, max * 0.75, max * 0.5, max * 0.25, 0].map(v => String(Math.round(v)))
      }),
      columns: cols('Tipo', 'Nombre', ['Total 6 meses', 'right']),
      rows: topArticulos.map(a => ({ cells: [txt('Artículo'), txt(a.nombre), mono(a.cantidad, 'right')] }))
        .concat(topBodegas.map(b => ({ cells: [txt('Bodega'), txt(b.nombre), mono(b.cantidad, 'right')] }))),
      footer: 'Mes actual (' + nombreMes(mesActual.mes) + '): ' + mesActual.cantidad + ' unidades' +
        (delta !== null ? ' · ' + (delta >= 0 ? '+' : '') + delta + '% vs mes anterior' : '')
    };
  }`,
);

lines[TEMPLATE_LINE] = JSON.stringify(template).replace(/<\//g, "<\\/");
fs.writeFileSync(filePath, lines.join("\n"));
console.log("OK. Analíticas: meses con nombre + aclaración de la tabla:", filePath);
