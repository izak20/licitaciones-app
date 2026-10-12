// El usuario mandó una captura de un heatmap "de verdad" (filas ×
// columnas, celdas coloreadas por valor) y dijo que lo que había acá
// no era un mapa de calor real, sino una grilla de tarjetas sueltas
// (una por bodega). Pidió mantener las mismas 2 pestañas (Gasto /
// Quiebres de stock) pero que el contenido sea una matriz real.
//
// Se deja fuera el dendrograma/clustering jerárquico de la imagen de
// referencia: es decorativo para este caso de uso de negocio y
// agregarlo implicaría re-implementar clustering jerárquico desde
// cero sin un beneficio claro; si luego se quiere, se puede agregar
// después.
//
// La matriz: filas = bodegas reales, columnas = grupo de artículo
// real (Medicamentos / Insumos / Vacunas / etc., ya en el catálogo),
// celda = gasto o quiebres real de esa combinación bodega × grupo,
// coloreada con la misma escala de color ya usada en el resto de la
// app. El backend (app/api/reportes/mapa-calor/route.ts) ya se
// reescribió para devolver { bodegas, grupos, celdas } en vez de una
// lista plana por bodega.
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
    throw new Error("No se encontró el texto exacto (mapa de calor matriz):\n" + desde.slice(0, 400));
  }
  template = template.replace(desde, () => hasta);
}

// 1. mapaCalor(): de "una tarjeta por bodega" a "una matriz bodega ×
//    grupo de artículo".
reemplazar(
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
      hayTiles: tiles.length > 0,
      footer: 'Período: últimos 90 días · ' + filas.length + ' bodegas · toca "Quiebres de stock" arriba para cambiar de vista'
    };
  }`,
  `  mapaCalor() {
    const resp = this.cargarLista('mapa_calor', '/api/reportes/mapa-calor');
    const datos = (resp && resp.bodegas) ? resp : { bodegas: [], grupos: [], celdas: [], movimientos_sin_precio: 0 };
    const metrica = this.state.tab === 1 ? 'quiebres' : 'gasto';
    const celdaPorClave = {};
    datos.celdas.forEach(c => { celdaPorClave[c.id_bodega + '|' + c.grupo] = c; });
    const max = Math.max(1, ...datos.celdas.map(c => c[metrica]));
    const filas = datos.bodegas.map(b => ({
      nombre: b.nombre,
      celdas: datos.grupos.map(g => {
        const c = celdaPorClave[b.id_bodega + '|' + g];
        const valor = c ? c[metrica] : 0;
        const intensidad = max > 0 ? Math.min(1, valor / max) : 0;
        const claro = intensidad <= 0.5;
        return {
          valorTexto: metrica === 'gasto' ? ('$' + Math.round(valor).toLocaleString('es-CL')) : String(valor),
          bg: colorCalor(intensidad),
          fg: claro ? 'var(--fg-1)' : '#fff'
        };
      })
    }));
    const conGasto = datos.celdas.filter(c => c.gasto > 0).length;
    const conQuiebres = datos.celdas.filter(c => c.quiebres > 0).length;
    return {
      isHeatmap: true, eyebrow: 'INTELIGENCIA', title: 'Mapa de calor',
      req: 'Gasto real (despachos/vales de consumo × precio unitario, últimos 90 días) y quiebres de stock, por bodega y grupo de artículo',
      primary: null, secondary: [],
      tabs: [
        { i: 0, label: 'Gasto', count: conGasto },
        { i: 1, label: 'Quiebres de stock', count: conQuiebres }
      ],
      columnas: datos.grupos,
      filas,
      tilesVacio: datos.bodegas.length === 0 || datos.grupos.length === 0,
      hayTiles: datos.bodegas.length > 0 && datos.grupos.length > 0,
      footer: 'Período: últimos 90 días · ' + datos.bodegas.length + ' bodegas × ' + datos.grupos.length + ' grupos de artículo' +
        (metrica === 'gasto' && datos.movimientos_sin_precio > 0 ? ' · ' + datos.movimientos_sin_precio + ' mov. sin precio registrado' : '')
    };
  }`,
);

// 2. Markup: de la grilla de tarjetas a una matriz real (filas ×
//    columnas, con encabezados).
reemplazar(
  `<sc-if value="{{ page.hayTiles }}" hint-placeholder-val="{{ true }}">
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
</sc-if>`,
  `<sc-if value="{{ page.hayTiles }}" hint-placeholder-val="{{ true }}">
<div style="background:var(--surface);border:1px solid var(--border-1);border-radius:8px;box-shadow:var(--shadow-sm);overflow:hidden">
<div style="overflow-x:auto">
<sc-raw-table style="width:100%;border-collapse:collapse;min-width:480px">
<sc-raw-thead>
<sc-raw-tr style="border-bottom:1px solid var(--border-1)">
<sc-raw-th style="padding:10px 12px;font-size:9.5px;font-weight:600;color:var(--fg-4);text-transform:uppercase;letter-spacing:0.08em;text-align:left;background:var(--bg-2);white-space:nowrap">Bodega</sc-raw-th>
<sc-for list="{{ page.columnas }}" as="col" hint-placeholder-count="3">
<sc-raw-th style="padding:10px 12px;font-size:9.5px;font-weight:600;color:var(--fg-4);text-transform:uppercase;letter-spacing:0.08em;text-align:center;background:var(--bg-2);white-space:nowrap">{{ col }}</sc-raw-th>
</sc-for>
</sc-raw-tr>
</sc-raw-thead>
<sc-raw-tbody>
<sc-for list="{{ page.filas }}" as="f" hint-placeholder-count="4">
<sc-raw-tr style="border-bottom:1px solid var(--border-1)">
<sc-raw-td style="padding:10px 12px;font-size:12.5px;font-weight:600;color:var(--fg-1);white-space:nowrap">{{ f.nombre }}</sc-raw-td>
<sc-for list="{{ f.celdas }}" as="c" hint-placeholder-count="3">
<sc-raw-td style="padding:12px;text-align:center;background:{{ c.bg }}">
<span style="font-family:var(--font-mono);font-size:13px;font-weight:700;white-space:nowrap;color:{{ c.fg }}">{{ c.valorTexto }}</span>
</sc-raw-td>
</sc-for>
</sc-raw-tr>
</sc-for>
</sc-raw-tbody>
</sc-raw-table>
</div>
</div>
</sc-if>`,
);

lines[TEMPLATE_LINE] = JSON.stringify(template).replace(/<\//g, "<\\/");
fs.writeFileSync(filePath, lines.join("\n"));
console.log("OK. Mapa de calor ahora es una matriz real bodega × grupo de artículo:", filePath);
