// El usuario reportó 4 problemas reales en Analíticas:
// 1) El gráfico mostraba un solo total mensual, sin decir de qué
//    bodega ni de qué artículo salía ese número.
// 2) Pidió poder filtrar/diferenciar por bodega, con un color por
//    bodega (como una leyenda clickeable).
// 3) Igual que en Mapa de calor, poder cliquear una barra y ver qué
//    artículos componen ese número.
// 4) Un bug real: al pasar el cursor sobre una barra, el tooltip
//    aparecía DOS veces — una casi al instante (el tooltip propio de
//    la app) y otra unos segundos después (el tooltip NATIVO del
//    navegador, disparado por un atributo title="..." redundante que
//    quedó en el div de la barra, duplicando el tooltip custom que ya
//    existía).
// 5) La tabla de abajo solo mostraba el total fijo de "los últimos 6
//    meses" sin poder cambiar el rango. Se reutiliza el mismo filtro
//    de fechas (analisisDesde/analisisHasta) que ya existe y funciona
//    en la página "Análisis de consumo" — ahora el rango se aplica
//    tanto al gráfico como a la tabla.
//
// De paso, se generaliza el modal de detalle de solo lectura que se
// construyó para Mapa de calor (antes llamado "detalleMapaCalor") a
// un nombre genérico "detalleTabla", ya que ahora lo usan dos
// pantallas distintas con el mismo patrón.
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
    throw new Error("No se encontró el texto exacto (analiticas completo):\n" + desde.slice(0, 400));
  }
  template = template.replace(desde, () => hasta);
}

// 1. Paleta de colores por bodega (junto a los tonos B ya existentes).
reemplazar(
  `const B = {
  ok:      ['#E3F5EC', '#155F3E', '#1F8A5B'],
  warn:    ['#FEF3E0', '#7A4700', '#C77400'],
  bad:     ['#FBE7E5', '#7A1F18', '#C0362C'],
  info:    ['#DCE8F4', '#0A3B65', '#115B99'],
  neutral: ['#EEF1F5', '#3E4C5B', '#8494A6']
};`,
  `const B = {
  ok:      ['#E3F5EC', '#155F3E', '#1F8A5B'],
  warn:    ['#FEF3E0', '#7A4700', '#C77400'],
  bad:     ['#FBE7E5', '#7A1F18', '#C0362C'],
  info:    ['#DCE8F4', '#0A3B65', '#115B99'],
  neutral: ['#EEF1F5', '#3E4C5B', '#8494A6']
};
const PALETA_BODEGAS = ['#115B99', '#C77400', '#1F8A5B', '#8454C4', '#C0362C', '#0E7490'];`,
);

// 2. barsChart(): soporta leyenda distinta de las series visibles
//    (para poder listar bodegas ocultas también) y clic por barra.
reemplazar(
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
          onEnter: o.onBarEnter ? o.onBarEnter(key) : undefined,
          onLeave: o.onBarLeave || undefined
        };
      })
    }))
  };
}`,
  `function barsChart(o) {
  return {
    isBars: true, title: o.title, subtitle: o.subtitle, legend: o.legend || o.series,
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
          onEnter: o.onBarEnter ? o.onBarEnter(key) : undefined,
          onLeave: o.onBarLeave || undefined,
          onClick: o.onBarClick ? o.onBarClick(gi, i) : undefined
        };
      })
    }))
  };
}`,
);

// 3. Markup del gráfico de barras: se quita el title="" nativo (era
//    el tooltip duplicado) y se agrega clic por barra.
reemplazar(
  `<div sc-camel-on-mouse-enter="{{ b.onEnter }}" sc-camel-on-mouse-leave="{{ b.onLeave }}" title="{{ b.title }}" style="width:100%;height:{{ b.h }};background:{{ b.color }};border-radius:3px 3px 0 0"></div>`,
  `<div sc-camel-on-mouse-enter="{{ b.onEnter }}" sc-camel-on-mouse-leave="{{ b.onLeave }}" sc-camel-on-click="{{ b.onClick }}" style="width:100%;height:{{ b.h }};background:{{ b.color }};border-radius:3px 3px 0 0;cursor:pointer"></div>`,
);

// 4. Leyenda del gráfico: ahora es clickeable (para ocultar/mostrar
//    una bodega) en vez de solo decorativa.
reemplazar(
  `<sc-for list="{{ page.chart.legend }}" as="l" hint-placeholder-count="2">
<span style="display:inline-flex;align-items:center;gap:6px;font-size:11.5px;color:var(--fg-2)">
<span style="width:9px;height:9px;border-radius:2px;background:{{ l.color }}"></span>{{ l.label }}
</span>
</sc-for>`,
  `<sc-for list="{{ page.chart.legend }}" as="l" hint-placeholder-count="2">
<button sc-camel-on-click="{{ l.go }}" style="display:inline-flex;align-items:center;gap:6px;font-size:11.5px;color:var(--fg-2);background:transparent;border:none;cursor:pointer;padding:2px 5px;border-radius:4px;opacity:{{ l.opacidad }}" style-hover="background:var(--bg-3)">
<span style="width:9px;height:9px;border-radius:2px;background:{{ l.color }}"></span>{{ l.label }}
</button>
</sc-for>`,
);

// 5. Generaliza el modal de detalle: "detalleMapaCalor" -> "detalleTabla".
reemplazar(
  `    const dMC = this.state.detalleMapaCalor || { titulo: '', sub: '', columnas: [], rows: [], vacio: true };
    const M = {
      detalleMapaCalor: {
        eyebrow: 'INTELIGENCIA · MAPA DE CALOR', title: dMC.titulo, sub: dMC.sub,
        width: '680px', cta: 'Cerrar', ctaBg: 'var(--brand-blue)',
        fields: [{ isTable: true, span: 2, columnas: dMC.columnas, rows: dMC.rows, vacio: dMC.vacio }]
      },
      usuario: {`,
  `    const dT = this.state.detalleTabla || { eyebrow: '', titulo: '', sub: '', columnas: [], rows: [], vacio: true };
    const M = {
      detalleTabla: {
        eyebrow: dT.eyebrow, title: dT.titulo, sub: dT.sub,
        width: '680px', cta: 'Cerrar', ctaBg: 'var(--brand-blue)',
        fields: [{ isTable: true, span: 2, columnas: dT.columnas, rows: dT.rows, vacio: dT.vacio }]
      },
      usuario: {`,
);

reemplazar(
  `      modalSubmit: s.modal === 'detalleMapaCalor' ? this.close : this.submitAccion(MODAL_ACTIONS[s.modal] || 'guardarUsuario'),`,
  `      modalSubmit: s.modal === 'detalleTabla' ? this.close : this.submitAccion(MODAL_ACTIONS[s.modal] || 'guardarUsuario'),`,
);

// 6. Método genérico que abre el modal de detalle (reemplaza al
//    específico de Mapa de calor).
reemplazar(
  `  abrirDetalleMapaCalor = (bodegaNombre, grupo, metrica, celda) => () => {
    const detalle = metrica === 'gasto' ? (celda ? celda.detalle_gasto : []) : (celda ? celda.detalle_quiebres : []);
    const columnas = metrica === 'gasto'
      ? ['Artículo', 'Cantidad', 'Precio unitario', 'Total', 'Fecha', 'Folio']
      : ['Artículo', 'Stock actual', 'Stock mínimo'];
    const filasOrdenadas = metrica === 'gasto'
      ? (detalle || []).slice().sort((a, b) => b.total - a.total)
      : (detalle || []).slice().sort((a, b) => (b.stock_minimo - b.stock_actual) - (a.stock_minimo - a.stock_actual));
    const rows = filasOrdenadas.map(d => ({
      celdas: metrica === 'gasto'
        ? [d.articulo, String(d.cantidad), '$' + Math.round(d.precio_unitario).toLocaleString('es-CL'), '$' + Math.round(d.total).toLocaleString('es-CL'), this.fechaCorta(d.fecha), d.folio || '—']
        : [d.articulo, String(d.stock_actual), String(d.stock_minimo)]
    }));
    this.setState({
      modal: 'detalleMapaCalor',
      detalleMapaCalor: {
        titulo: bodegaNombre + ' · ' + grupo,
        sub: metrica === 'gasto' ? 'Movimientos reales que componen este gasto (últimos 90 días)' : 'Artículos de este grupo bajo su stock mínimo',
        columnas, rows, vacio: rows.length === 0
      }
    });
  };`,
  `  abrirDetalleTabla = (eyebrow, titulo, sub, columnas, rows) => () => {
    this.setState({
      modal: 'detalleTabla',
      detalleTabla: { eyebrow, titulo, sub, columnas, rows, vacio: rows.length === 0 }
    });
  };`,
);

// 7. mapaCalor(): usa ahora el método genérico, armando su propio
//    detalle/columnas/filas antes de abrir el modal.
reemplazar(
  `          go: this.abrirDetalleMapaCalor(b.nombre, g, metrica, c)`,
  `          go: () => {
            const detalle = metrica === 'gasto' ? (c ? c.detalle_gasto : []) : (c ? c.detalle_quiebres : []);
            const columnasDet = metrica === 'gasto'
              ? ['Artículo', 'Cantidad', 'Precio unitario', 'Total', 'Fecha', 'Folio']
              : ['Artículo', 'Stock actual', 'Stock mínimo'];
            const filasOrdenadas = metrica === 'gasto'
              ? (detalle || []).slice().sort((x, y) => y.total - x.total)
              : (detalle || []).slice().sort((x, y) => (y.stock_minimo - y.stock_actual) - (x.stock_minimo - x.stock_actual));
            const rowsDet = filasOrdenadas.map(d => ({
              celdas: metrica === 'gasto'
                ? [d.articulo, String(d.cantidad), '$' + Math.round(d.precio_unitario).toLocaleString('es-CL'), '$' + Math.round(d.total).toLocaleString('es-CL'), this.fechaCorta(d.fecha), d.folio || '—']
                : [d.articulo, String(d.stock_actual), String(d.stock_minimo)]
            }));
            this.abrirDetalleTabla(
              'INTELIGENCIA · MAPA DE CALOR', b.nombre + ' · ' + g,
              metrica === 'gasto' ? 'Movimientos reales que componen este gasto (últimos 90 días)' : 'Artículos de este grupo bajo su stock mínimo',
              columnasDet, rowsDet
            )();
          }`,
);

lines[TEMPLATE_LINE] = JSON.stringify(template).replace(/<\//g, "<\\/");
fs.writeFileSync(filePath, lines.join("\n"));
console.log("OK. Paso 1/2 (base compartida + mapa de calor migrado):", filePath);
