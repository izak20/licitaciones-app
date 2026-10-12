// El usuario pidió llevar el mismo "clic para ver el detalle" del
// gráfico a la tabla de abajo: por ejemplo, "Ibuprofeno 400mg: 327"
// es un total acumulado del período completo, y no dice de qué
// bodegas o qué meses salió. Se arma el desglose real a partir de los
// mismos datos ya cargados (datos.celdas, que ya traen bodega + mes +
// detalle por artículo) — no hace falta pedirle nada nuevo al
// backend:
// - Clic en una fila de Artículo -> desglose real por bodega y mes.
// - Clic en una fila de Bodega -> desglose real por artículo y mes.
// Se agrega el clic a la fila (<sc-raw-tr>) de la tabla genérica, que
// usan TODAS las pantallas de lista — es seguro para las demás porque
// sc-camel-on-click sobre un handler "undefined" no hace nada, y el
// cursor solo cambia a pointer cuando la fila trae uno.
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
    throw new Error("No se encontró el texto exacto (analiticas tabla clic):\n" + desde.slice(0, 400));
  }
  template = template.replace(desde, () => hasta);
}

// 1. La fila de la tabla genérica ahora puede ser cliqueable.
reemplazar(
  `<sc-raw-tr style="border-bottom:1px solid var(--border-1)" style-hover="background:var(--bg-2)">
<sc-for list="{{ r.cells }}" as="c" hint-placeholder-count="6">`,
  `<sc-raw-tr sc-camel-on-click="{{ r.go }}" style="border-bottom:1px solid var(--border-1);cursor:{{ r.cursorPointer }}" style-hover="background:var(--bg-2)">
<sc-for list="{{ r.cells }}" as="c" hint-placeholder-count="6">`,
);

// 2. analiticas(): el desglose de la tabla se arma a partir de
//    datos.celdas (bodega × mes × artículo), que ya traía todo lo
//    necesario — bodega y mes para un artículo, o artículo y mes para
//    una bodega.
const viejo = fs.readFileSync("/tmp/old-analiticas2.txt", "utf8");
const nuevo = `  analiticas() {
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
    const nombrePorIdBodega = {};
    datos.bodegas.forEach((b, i) => { colorPorBodega[b.id_bodega] = PALETA_BODEGAS[i % PALETA_BODEGAS.length]; nombrePorIdBodega[b.id_bodega] = b.nombre; });

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

    const abrirDetalleArticulo = (nombreArticulo) => () => {
      const filasDet = [];
      datos.celdas.forEach(c => {
        const item = (c.detalle || []).find(d => d.articulo === nombreArticulo);
        if (item) filasDet.push({ bodega: nombrePorIdBodega[c.id_bodega] || '—', mes: nombreMes(c.mes), cantidad: item.cantidad });
      });
      filasDet.sort((x, y) => y.cantidad - x.cantidad);
      this.abrirDetalleTabla(
        'INTELIGENCIA · ANALÍTICAS', nombreArticulo,
        'Desglose real por bodega y mes · período ' + desde + ' a ' + hasta,
        ['Bodega', 'Mes', 'Cantidad'],
        filasDet.map(f => ({ celdas: [f.bodega, f.mes, String(f.cantidad)] }))
      )();
    };

    const abrirDetalleBodega = (nombreBodega, idBodega) => () => {
      const filasDet = [];
      datos.celdas.filter(c => c.id_bodega === idBodega).forEach(c => {
        (c.detalle || []).forEach(d => filasDet.push({ articulo: d.articulo, mes: nombreMes(c.mes), cantidad: d.cantidad }));
      });
      filasDet.sort((x, y) => y.cantidad - x.cantidad);
      this.abrirDetalleTabla(
        'INTELIGENCIA · ANALÍTICAS', nombreBodega,
        'Desglose real por artículo y mes · período ' + desde + ' a ' + hasta,
        ['Artículo', 'Mes', 'Cantidad'],
        filasDet.map(f => ({ celdas: [f.articulo, f.mes, String(f.cantidad)] }))
      )();
    };

    return {
      isList: true, eyebrow: 'INTELIGENCIA', title: 'Analíticas',
      req: 'Consumo real (despachos y vales de consumo) en el rango seleccionado, por bodega',
      primary: null, secondary: [],
      mostrarFechas: true,
      searchPlaceholder: 'Buscar por artículo o bodega',
      filters: [],
      banner: { bg: B.info[0], border: B.info[2], fg: B.info[1], icon: ic('info', 15), text: 'Cada barra es una bodega en ese mes. Toca la leyenda para ocultar o mostrar una bodega, y toca una barra o una fila de la tabla para ver el detalle real detrás de ese número.' },
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
      rows: datos.top_articulos.map(a => ({
        cells: [txt('Artículo'), txt(a.nombre), mono(a.cantidad, 'right')],
        go: abrirDetalleArticulo(a.nombre),
        cursorPointer: 'pointer'
      })).concat(datos.top_bodegas.map(b => {
        const ref = datos.bodegas.find(x => x.nombre === b.nombre);
        return {
          cells: [txt('Bodega'), txt(b.nombre), mono(b.cantidad, 'right')],
          go: ref ? abrirDetalleBodega(b.nombre, ref.id_bodega) : undefined,
          cursorPointer: ref ? 'pointer' : 'default'
        };
      })),
      footer: 'Mes actual (' + nombreMes(mesActual.mes) + '): ' + mesActual.cantidad + ' unidades' +
        (delta !== null ? ' · ' + (delta >= 0 ? '+' : '') + delta + '% vs mes anterior' : '') +
        ' · top 5 artículos y top 5 bodegas del período ' + desde + ' a ' + hasta + ' · toca una fila para ver su detalle'
    };
  }`;

if (!template.includes(viejo)) {
  throw new Error("No se encontró el texto exacto del método analiticas() actual.");
}
template = template.replace(viejo, () => nuevo);

lines[TEMPLATE_LINE] = JSON.stringify(template).replace(/<\//g, "<\\/");
fs.writeFileSync(filePath, lines.join("\n"));
console.log("OK. Filas de la tabla de Analíticas ahora abren su detalle real:", filePath);
