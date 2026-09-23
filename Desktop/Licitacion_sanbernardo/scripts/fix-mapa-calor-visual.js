// El usuario pidió que el Mapa de calor sea visual de verdad (no otra
// tabla) y detectó un bug real: los encabezados de las columnas
// numéricas quedaban alineados a la derecha (cols(...,'right')) pero
// las celdas (badge(...) sin el 3er argumento "align") se quedaban con
// el default 'left' — encabezado a la derecha, contenido a la
// izquierda. Se reemplaza la tabla por una grilla de tarjetas con
// color de intensidad real (verde/naranja/rojo según el valor), con un
// selector de tabs para elegir qué métrica ver (Gasto / Quiebres de
// stock) — reutilizando el mismo componente de tabs que ya usa el
// resto de la app (movimientos, etc.), así el usuario "edita" qué dato
// ver sin que sea un dashboard de configuración aparte.
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
    throw new Error("No se encontró el texto exacto (mapa calor visual):\n" + desde.slice(0, 400));
  }
  template = template.replace(desde, () => hasta);
}

// 1. Helpers de color de intensidad (module-level, junto a lineChart/barsChart).
reemplazar(
  `function barsChart(o) {`,
  `function hexRgb(hex) {
  const n = parseInt(hex.replace('#', ''), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function mezclarColor(c1, c2, t) {
  const a = hexRgb(c1), b = hexRgb(c2);
  return 'rgb(' + a.map((v, i) => Math.round(v + (b[i] - v) * t)).join(',') + ')';
}
function colorCalor(intensidad) {
  if (intensidad <= 0) return '#EEF1F5';
  if (intensidad < 0.5) return mezclarColor('#DCE8F4', '#FAA16B', intensidad / 0.5);
  return mezclarColor('#FAA16B', '#C0362C', (intensidad - 0.5) / 0.5);
}

function barsChart(o) {`,
);

// 2. Reescribe mapaCalor(): grilla de tarjetas con color real de
// intensidad, con tabs para alternar entre Gasto y Quiebres de stock
// (state.tab, igual que el resto de la app: se resetea a 0 al navegar).
reemplazar(
  `  mapaCalor() {
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
  }`,
  `  mapaCalor() {
    const filas = this.cargarLista('mapa_calor', '/api/reportes/mapa-calor') || [];
    const metrica = this.state.tab === 1 ? 'quiebres' : 'gasto';
    const maxGasto = Math.max(1, ...filas.map(f => f.gasto));
    const maxQuiebres = Math.max(1, ...filas.map(f => f.quiebres));
    const tiles = filas.map(f => {
      const valor = metrica === 'gasto' ? f.gasto : f.quiebres;
      const max = metrica === 'gasto' ? maxGasto : maxQuiebres;
      const intensidad = max > 0 ? Math.min(1, valor / max) : 0;
      const claro = intensidad <= 0.5;
      return {
        nombre: f.nombre,
        valorTexto: metrica === 'gasto'
          ? '$' + f.gasto.toLocaleString('es-CL')
          : String(f.quiebres) + (f.quiebres === 1 ? ' quiebre' : ' quiebres'),
        subTexto: metrica === 'gasto'
          ? (f.movimientos_sin_precio > 0 ? f.movimientos_sin_precio + ' mov. sin precio registrado' : 'Todos los movimientos con precio')
          : (f.gasto > 0 ? '$' + f.gasto.toLocaleString('es-CL') + ' gastados en 90 días' : 'Sin gasto registrado'),
        bg: colorCalor(intensidad),
        fg: claro ? 'var(--fg-1)' : '#fff',
        fgSub: claro ? 'var(--fg-3)' : 'rgba(255,255,255,0.82)'
      };
    });
    const conGasto = filas.filter(f => f.gasto > 0).length;
    const conQuiebres = filas.filter(f => f.quiebres > 0).length;
    return {
      isHeatmap: true, eyebrow: 'INTELIGENCIA', title: 'Mapa de calor',
      req: 'Gasto real (despachos/vales de consumo × precio unitario, últimos 90 días) y quiebres de stock, por bodega',
      primary: null, secondary: [],
      tabs: [
        { i: 0, label: 'Gasto', count: conGasto },
        { i: 1, label: 'Quiebres de stock', count: conQuiebres }
      ],
      tiles,
      tilesVacio: tiles.length === 0,
      footer: 'Período: últimos 90 días · ' + filas.length + ' bodegas · toca "Quiebres de stock" arriba para cambiar de vista'
    };
  }`,
);

// 3. Nuevo bloque de plantilla: grilla de tarjetas con color de
// intensidad real (no una tabla), como hermano de isList/isDash/isTree.
reemplazar(
  `<sc-if value="{{ page.isList }}" hint-placeholder-val="{{ true }}">
<div>
<sc-if value="{{ page.bannerOk }}" hint-placeholder-val="{{ false }}">`,
  `<sc-if value="{{ page.isHeatmap }}" hint-placeholder-val="{{ false }}">
<div>
<sc-if value="{{ page.tilesVacio }}" hint-placeholder-val="{{ false }}">
<div style="background:var(--surface);border:1px solid var(--border-1);border-radius:8px;box-shadow:var(--shadow-sm);padding:{{ statePad }};display:flex;flex-direction:column;align-items:center;text-align:center">
<span style="display:flex;align-items:center;justify-content:center;width:52px;height:52px;border-radius:12px;background:var(--bg-2);border:1px solid var(--border-1);color:var(--fg-4);margin-bottom:16px">{{ page.emptyIcon }}</span>
<div style="font-size:15px;font-weight:600;letter-spacing:-0.01em">{{ page.emptyTitle }}</div>
<p style="font-size:12.5px;line-height:1.6;color:var(--fg-3);margin:7px 0 0;max-width:360px;text-wrap:pretty">{{ page.emptyText }}</p>
</div>
</sc-if>
<sc-if value="{{ page.tilesVacio }}" hint-placeholder-val="{{ true }}">
<div style="display:grid;grid-template-columns:repeat(auto-fill, minmax(210px, 1fr));gap:12px">
<sc-for list="{{ page.tiles }}" as="t" hint-placeholder-count="4">
<div style="border-radius:10px;padding:16px 18px;background:{{ t.bg }};min-height:118px;display:flex;flex-direction:column;justify-content:space-between;box-shadow:var(--shadow-sm)">
<div style="font-size:12.5px;font-weight:600;color:{{ t.fg }}">{{ t.nombre }}</div>
<div>
<div style="font-family:var(--font-mono);font-size:23px;font-weight:700;letter-spacing:-0.02em;color:{{ t.fg }}">{{ t.valorTexto }}</div>
<div style="font-size:11px;margin-top:4px;color:{{ t.fgSub }}">{{ t.subTexto }}</div>
</div>
</div>
</sc-for>
</div>
</sc-if>
</div>
</sc-if>

<sc-if value="{{ page.isList }}" hint-placeholder-val="{{ true }}">
<div>
<sc-if value="{{ page.bannerOk }}" hint-placeholder-val="{{ false }}">`,
);

lines[TEMPLATE_LINE] = JSON.stringify(template).replace(/<\//g, "<\\/");
fs.writeFileSync(filePath, lines.join("\n"));
console.log("OK. Mapa de calor rediseñado como grilla visual con tabs Gasto/Quiebres:", filePath);
