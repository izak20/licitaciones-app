// Paso 2/2: reescribe analiticas() para que el gráfico desglose por
// bodega (una serie coloreada por bodega, leyenda clickeable para
// ocultar/mostrar), cada barra se pueda cliquear para ver el detalle
// real de artículos detrás de ese consumo, y tanto el gráfico como la
// tabla de abajo respeten el mismo filtro de fechas real (en vez del
// total fijo de "últimos 6 meses").
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

const desde = fs.readFileSync("/tmp/old-analiticas.txt", "utf8");

const hasta = `  analiticas() {
    const MESES_CORTOS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const nombreMes = (mesIso) => {
      const n = parseInt((mesIso || '').slice(5, 7), 10);
      return MESES_CORTOS[n - 1] || mesIso;
    };
    const desde = this.state.analisisDesde;
    const hasta = this.state.analisisHasta;
    const resp = this.cargarLista('analiticas_resumen_' + desde + '_' + hasta, '/api/analiticas/resumen?desde=' + desde + '&hasta=' + hasta);
    const datos = (resp && resp.bodegas) ? resp : { bodegas: [], meses: [], celdas: [], top_articulos: [], top_bodegas: [], mes_actual: { mes: '', cantidad: 0 }, mes_anterior: { mes: '', cantidad: 0 } };

    const colorPorBodega = {};
    datos.bodegas.forEach((b, i) => { colorPorBodega[b.id_bodega] = PALETA_BODEGAS[i % PALETA_BODEGAS.length]; });

    const ocultas = this.state.analiticasBodegasOcultas || {};
    const bodegasVisibles = datos.bodegas.filter(b => !ocultas[b.id_bodega]);

    const celdaPorClave = {};
    datos.celdas.forEach(c => { celdaPorClave[c.id_bodega + '|' + c.mes] = c; });

    const groups = datos.meses.map(mes => ({
      label: nombreMes(mes),
      values: bodegasVisibles.map(b => {
        const c = celdaPorClave[b.id_bodega + '|' + mes];
        return c ? c.cantidad : 0;
      })
    }));
    const max = Math.max(1, ...groups.flatMap(g => g.values));

    const series = bodegasVisibles.map(b => ({ label: b.nombre, color: colorPorBodega[b.id_bodega] }));
    const legend = datos.bodegas.map(b => {
      const oculta = !!ocultas[b.id_bodega];
      return {
        label: b.nombre, color: colorPorBodega[b.id_bodega], opacidad: oculta ? '0.35' : '1',
        go: () => this.setState(s => {
          const o2 = Object.assign({}, s.analiticasBodegasOcultas);
          if (o2[b.id_bodega]) delete o2[b.id_bodega]; else o2[b.id_bodega] = true;
          return { analiticasBodegasOcultas: o2 };
        })
      };
    });

    const mesActual = datos.mes_actual || { mes: '', cantidad: 0 };
    const mesAnterior = datos.mes_anterior || { mes: '', cantidad: 0 };
    const delta = mesAnterior.cantidad
      ? Math.round(((mesActual.cantidad - mesAnterior.cantidad) / mesAnterior.cantidad) * 1000) / 10
      : null;

    return {
      isList: true, eyebrow: 'INTELIGENCIA', title: 'Analíticas',
      req: 'Consumo real (despachos y vales de consumo) en el rango seleccionado, por bodega',
      primary: null, secondary: [],
      mostrarFechas: true,
      searchPlaceholder: 'Buscar por artículo o bodega',
      filters: [],
      banner: { bg: B.info[0], border: B.info[2], fg: B.info[1], icon: ic('info', 15), text: 'Cada barra es una bodega en ese mes. Toca la leyenda para ocultar o mostrar una bodega, y toca una barra para ver qué artículos componen ese consumo.' },
      chart: barsChart({
        title: 'Consumo mes a mes por bodega (unidades)',
        subtitle: bodegasVisibles.length > 0 ? ('Real · ' + desde + ' a ' + hasta) : 'Todas las bodegas están ocultas — toca la leyenda para mostrar alguna',
        groups,
        series,
        legend,
        max,
        yLabels: [max, max * 0.75, max * 0.5, max * 0.25, 0].map(v => String(Math.round(v))),
        tooltipPrefix: 'analiticas_',
        tooltipActivo: (key) => this.state.chartTooltipKey === key,
        onBarEnter: (key) => () => this.mostrarChartTooltip(key),
        onBarLeave: () => this.ocultarChartTooltip(),
        onBarClick: (gi, i) => () => {
          const mes = datos.meses[gi];
          const b = bodegasVisibles[i];
          if (!b) return;
          const c = celdaPorClave[b.id_bodega + '|' + mes];
          const detalle = c ? c.detalle : [];
          const rows = detalle.map(d => ({ celdas: [d.articulo, String(d.cantidad)] }));
          this.abrirDetalleTabla(
            'INTELIGENCIA · ANALÍTICAS', b.nombre + ' · ' + nombreMes(mes),
            'Artículos reales consumidos ese mes en esa bodega',
            ['Artículo', 'Cantidad'], rows
          )();
        }
      }),
      columns: cols('Tipo', 'Nombre', ['Total del período', 'right']),
      rows: datos.top_articulos.map(a => ({ cells: [txt('Artículo'), txt(a.nombre), mono(a.cantidad, 'right')] }))
        .concat(datos.top_bodegas.map(b => ({ cells: [txt('Bodega'), txt(b.nombre), mono(b.cantidad, 'right')] }))),
      footer: 'Mes actual (' + nombreMes(mesActual.mes) + '): ' + mesActual.cantidad + ' unidades' +
        (delta !== null ? ' · ' + (delta >= 0 ? '+' : '') + delta + '% vs mes anterior' : '') +
        ' · top 5 artículos y top 5 bodegas del período ' + desde + ' a ' + hasta
    };
  }`;

if (!template.includes(desde)) {
  throw new Error("No se encontró el texto exacto del método analiticas() original.");
}
template = template.replace(desde, () => hasta);

lines[TEMPLATE_LINE] = JSON.stringify(template).replace(/<\//g, "<\\/");
fs.writeFileSync(filePath, lines.join("\n"));
console.log("OK. Paso 2/2: analiticas() reescrito con desglose por bodega, leyenda clickeable, clic-detalle y filtro de fechas:", filePath);
