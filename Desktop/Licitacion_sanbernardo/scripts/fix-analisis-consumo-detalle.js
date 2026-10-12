// El usuario pidió que "Análisis de consumo" (que comparten Droguería
// y Farmacia — es el mismo método analisis(farmacia)) funcione igual
// que ya quedó Analíticas: el gráfico no debe mostrar solo un número
// por familia sin decir de dónde sale, y tiene que poder cliquearse
// para ver el detalle real detrás de cada barra/fila.
//
// De paso se encontró y se reemplaza un botón que YA EXISTÍA pero
// estaba roto: "Desglosar por producto" llamaba a una función que
// solo mostraba un aviso de "cargado" (un toast), sin mostrar ningún
// dato — exactamente el mismo patrón de "parece que funciona pero no
// muestra nada real" que se ha encontrado varias veces en esta app.
//
// El backend (lib/api/analisis-consumo.ts) ya se extendió para traer,
// por cada familia/grupo, el desglose real por bodega (para colorear
// el gráfico, igual que en Analíticas) y por bodega+producto (para el
// detalle al cliquear).
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

const viejo = fs.readFileSync("/tmp/old-analisis.txt", "utf8");
const nuevo = `  analisis(farmacia) {
    const desde = this.state.analisisDesde;
    const hasta = this.state.analisisHasta;
    const clave = 'analisis_detalle_' + (farmacia ? 'f_' : 'd_') + desde + '_' + hasta;
    const ruta = '/api/analisis-consumo/detalle?agrupar=familia&desde=' + desde + '&hasta=' + hasta;
    const detalle = this.cargarLista(clave, ruta) || [];
    const top = detalle.slice(0, 6);

    const bodegasMap = {};
    top.forEach(r => (r.bodegas || []).forEach(b => { bodegasMap[b.id_bodega] = b.nombre; }));
    const bodegasOrden = Object.keys(bodegasMap).sort((a, b) => bodegasMap[a].localeCompare(bodegasMap[b]));
    const colorPorBodega = {};
    bodegasOrden.forEach((id, i) => { colorPorBodega[id] = PALETA_BODEGAS[i % PALETA_BODEGAS.length]; });

    const ocultasKey = farmacia ? 'analisisFBodegasOcultas' : 'analisisDBodegasOcultas';
    const ocultas = this.state[ocultasKey] || {};
    const bodegasVisiblesIds = bodegasOrden.filter(id => !ocultas[id]);

    const groups = top.map(r => {
      const porBodega = {};
      (r.bodegas || []).forEach(b => { porBodega[b.id_bodega] = b.cantidad; });
      return { label: r.clave, values: bodegasVisiblesIds.map(id => porBodega[id] || 0) };
    });
    const max = Math.max(1, ...groups.flatMap(g => g.values));

    const series = bodegasVisiblesIds.map(id => ({ label: bodegasMap[id], color: colorPorBodega[id] }));
    const legend = bodegasOrden.map(id => {
      const oculta = !!ocultas[id];
      return {
        label: bodegasMap[id], color: colorPorBodega[id], opacidad: oculta ? '0.35' : '1',
        go: () => this.setState(s => {
          const o2 = Object.assign({}, s[ocultasKey]);
          if (o2[id]) delete o2[id]; else o2[id] = true;
          return { [ocultasKey]: o2 };
        })
      };
    });

    const abrirDetalleClave = (r) => () => {
      const filasDet = (r.detalle || []).map(d => ({ celdas: [d.producto, d.bodega, String(d.cantidad)] }));
      this.abrirDetalleTabla(
        (farmacia ? 'FARMACIA' : 'DROGUERÍA') + ' · ANÁLISIS DE CONSUMO', r.clave,
        'Desglose real por producto y bodega · período ' + desde + ' a ' + hasta,
        ['Producto', 'Bodega', 'Cantidad'], filasDet
      )();
    };

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
      banner: { bg: B.info[0], border: B.info[2], fg: B.info[1], icon: ic('info', 15), text: 'Cada color es una bodega. Toca la leyenda para ocultar o mostrar una, y toca una barra o una fila de la tabla para ver qué productos y qué bodega componen ese consumo.' },
      chart: barsChart({
        title: 'Consumo por familia',
        subtitle: bodegasVisiblesIds.length > 0 ? ('Real · ' + (farmacia ? 'Farmacia' : 'Droguería') + ' · ' + desde + ' a ' + hasta) : 'Todas las bodegas están ocultas — toca la leyenda para mostrar alguna',
        groups,
        series,
        legend,
        max,
        yLabels: [max, max * 0.75, max * 0.5, max * 0.25, 0].map(v => String(Math.round(v))),
        tooltipPrefix: 'analisis_' + (farmacia ? 'f_' : 'd_'),
        tooltipActivo: (key) => this.state.chartTooltipKey === key,
        onBarEnter: (key) => () => this.mostrarChartTooltip(key),
        onBarLeave: () => this.ocultarChartTooltip(),
        onBarClick: (gi) => () => { const r = top[gi]; if (r) abrirDetalleClave(r)(); }
      }),
      columns: cols('Grupo/artículo', ['Cantidad total', 'right'], ['N° de movimientos', 'right']),
      rows: detalle.map(r => ({
        cells: [txt(r.clave), mono(r.cantidad_total, 'right'), mono(r.movimientos, 'right')],
        go: abrirDetalleClave(r),
        cursorPointer: 'pointer'
      })),
      footer: 'Mostrando ' + detalle.length + ' familias con consumo real · ' + desde + ' a ' + hasta + ' · toca una barra o fila para ver su detalle'
    };
  }`;

if (!template.includes(viejo)) {
  throw new Error("No se encontró el texto exacto del método analisis(farmacia) actual.");
}
template = template.replace(viejo, () => nuevo);

lines[TEMPLATE_LINE] = JSON.stringify(template).replace(/<\//g, "<\\/");
fs.writeFileSync(filePath, lines.join("\n"));
console.log("OK. Análisis de consumo (Droguería y Farmacia) ahora muestra de dónde viene cada número y se puede cliquear para ver el detalle:", filePath);
