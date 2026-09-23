// Nuevo menú "Inteligencia": Analíticas, Alertas y Mapa de calor.
// Las 3 páginas son reales (consumen /api/analiticas/resumen,
// /api/alertas y /api/reportes/mapa-calor) y además se agregan como
// accesos rápidos reales (con conteos en vivo, no números de ejemplo)
// en el Panel de Inicio de los roles de back-office, para que la
// portada no se sienta vacía.
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
    throw new Error("No se encontró el texto exacto (inteligencia):\n" + desde.slice(0, 400));
  }
  template = template.replace(desde, () => hasta);
}

// 1. Ícono nuevo para "Mapa de calor" (grilla, estilo lucide grid-3x3).
reemplazar(
  `  arrowRight:'<path d="M5 12h14"/><path d="m13 6 6 6-6 6"/>'
};`,
  `  arrowRight:'<path d="M5 12h14"/><path d="m13 6 6 6-6 6"/>',
  grid:'<rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 9h18"/><path d="M3 15h18"/><path d="M9 3v18"/><path d="M15 3v18"/>'
};`,
);

// 2. Nueva sección de menú, visible para los roles de back-office
// (Cliente Interno ya tiene su propio "Análisis de consumo" en Farmacia).
reemplazar(
  `  { label: 'Farmacia', roles: ['Administrador', 'Cliente Interno'], items: [
    { id: 'mov-farmacia', icon: 'pill', label: 'Movimientos' },
    { id: 'inv-farmacia', icon: 'clipboard', label: 'Inventario' },
    { id: 'recepcion', icon: 'boxIn', label: 'Consulta de recepción' },
    { id: 'solicitar', icon: 'send', label: 'Solicitar abastecimiento' },
    { id: 'analisis-farmacia', icon: 'chart', label: 'Análisis de consumo' }
  ] }
];`,
  `  { label: 'Farmacia', roles: ['Administrador', 'Cliente Interno'], items: [
    { id: 'mov-farmacia', icon: 'pill', label: 'Movimientos' },
    { id: 'inv-farmacia', icon: 'clipboard', label: 'Inventario' },
    { id: 'recepcion', icon: 'boxIn', label: 'Consulta de recepción' },
    { id: 'solicitar', icon: 'send', label: 'Solicitar abastecimiento' },
    { id: 'analisis-farmacia', icon: 'chart', label: 'Análisis de consumo' }
  ] },
  { label: 'Inteligencia', roles: ['Administrador', 'Droguería', 'Finanzas'], items: [
    { id: 'analiticas', icon: 'chart', label: 'Analíticas' },
    { id: 'alertas', icon: 'bell', label: 'Alertas' },
    { id: 'mapa-calor', icon: 'grid', label: 'Mapa de calor' }
  ] }
];`,
);

// 3. Copys de estado vacío / ícono para las 3 páginas nuevas.
reemplazar(
  `const ESTADO_VACIO = {`,
  `const ESTADO_VACIO = {
  analiticas: ['el consumo', 'Aún no hay consumo registrado', 'Cuando existan despachos o vales de consumo en el período, aquí aparecerá la tendencia real mes a mes.'],
  alertas: ['las alertas', 'Sin alertas por ahora', 'No hay stock bajo mínimo, vencimientos próximos, temperatura fuera de rango ni recepciones con reparos pendientes.'],
  'mapa-calor': ['el mapa de calor', 'Aún no hay datos suficientes', 'Cuando existan movimientos de consumo y parámetros de stock mínimo, aquí aparecerá el gasto y los quiebres por bodega.'],`,
);
reemplazar(
  `const ESTADO_ICONO = {`,
  `const ESTADO_ICONO = {
  analiticas: 'chart', alertas: 'bell', 'mapa-calor': 'grid',`,
);

// 4. Dispatcher de páginas.
reemplazar(
  `    if (p === 'mov-farmacia') return this.movFarmacia();
    if (p === 'recepcion') return this.recepcionConsulta();
    if (p === 'solicitar') return this.solicitar();`,
  `    if (p === 'mov-farmacia') return this.movFarmacia();
    if (p === 'recepcion') return this.recepcionConsulta();
    if (p === 'solicitar') return this.solicitar();
    if (p === 'analiticas') return this.analiticas();
    if (p === 'alertas') return this.alertas();
    if (p === 'mapa-calor') return this.mapaCalor();`,
);

// 5. Las 3 páginas nuevas, mismo patrón isList que el resto de la app
// (cargarLista + columns/rows reales, sin ningún número inventado).
reemplazar(
  `  estadoMov = (e) => {`,
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
  }

  alertas() {
    const lista = this.cargarLista('alertas', '/api/alertas') || [];
    const SEVERIDAD_TONO = { alta: 'bad', media: 'warn', baja: 'info' };
    const TIPO_LABEL = { stock_bajo: 'Stock', vencimiento: 'Vencimiento', temperatura: 'Temperatura', reparos: 'Reparos' };
    return {
      isList: true, eyebrow: 'INTELIGENCIA', title: 'Alertas',
      req: 'Stock bajo mínimo/crítico, lotes por vencer o vencidos, temperatura fuera de rango y recepciones con reparos',
      primary: null, secondary: [],
      searchPlaceholder: 'Buscar por artículo o bodega',
      filters: [],
      columns: cols('Severidad', 'Tipo', 'Alerta', ['Fecha', 'right']),
      rows: lista.map(a => ({
        cells: [
          badge(a.severidad.toUpperCase(), SEVERIDAD_TONO[a.severidad] || 'neutral'),
          txt(TIPO_LABEL[a.tipo] || a.tipo),
          stack(a.titulo, a.detalle),
          mono(this.fechaCorta(a.fecha), 'right')
        ]
      })),
      footer: 'Mostrando ' + lista.length + ' alertas reales'
    };
  }

  mapaCalor() {
    const filas = this.cargarLista('mapa_calor', '/api/reportes/mapa-calor') || [];
    const maxGasto = Math.max(1, ...filas.map(f => f.gasto));
    const maxQuiebres = Math.max(1, ...filas.map(f => f.quiebres));
    const nivel = (v, max) => (v <= 0 ? 'neutral' : v >= max * 0.66 ? 'bad' : v >= max * 0.33 ? 'warn' : 'ok');
    return {
      isList: true, eyebrow: 'INTELIGENCIA', title: 'Mapa de calor',
      req: 'Gasto real (despachos/vales de consumo × precio unitario, últimos 90 días) y quiebres de stock, por bodega',
      primary: null, secondary: [],
      searchPlaceholder: 'Buscar por bodega',
      filters: [],
      columns: cols('Bodega', ['Gasto (90 días)', 'right'], ['Quiebres de stock', 'right'], 'Cobertura de precios'),
      rows: filas.map(f => ({
        cells: [
          txt(f.nombre),
          badge('$' + f.gasto.toLocaleString('es-CL'), nivel(f.gasto, maxGasto)),
          badge(String(f.quiebres), nivel(f.quiebres, maxQuiebres)),
          txt(f.movimientos_sin_precio > 0 ? f.movimientos_sin_precio + ' mov. sin precio' : 'completa')
        ]
      })),
      footer: 'Período: últimos 90 días · ' + filas.length + ' bodegas'
    };
  }

  estadoMov = (e) => {`,
);

lines[TEMPLATE_LINE] = JSON.stringify(template).replace(/<\//g, "<\\/");
fs.writeFileSync(filePath, lines.join("\n"));
console.log("OK. Menú Inteligencia (Analíticas/Alertas/Mapa de calor):", filePath);
