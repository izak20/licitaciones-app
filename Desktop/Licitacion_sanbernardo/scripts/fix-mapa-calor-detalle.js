// El usuario pidió poder cliquear una celda del mapa de calor (p.ej.
// la más roja, "Vacunas" en cierta bodega) y ver QUÉ compone ese
// número — no solo el total. El backend (route.ts) ya trae, por cada
// celda, el detalle real: los movimientos que generaron ese gasto
// (artículo, cantidad, precio, total, fecha, folio) o los artículos
// bajo su stock mínimo que generan ese conteo de quiebres.
//
// Se reutiliza el modal genérico ya existente (mismo fondo oscuro,
// encabezado, botón de cerrar) en vez de construir uno nuevo desde
// cero: se le agrega un tipo de campo "isTable" (no existía; los
// modales hasta ahora solo tenían campos de formulario) y se agrega
// una entrada 'detalleMapaCalor' que arma su contenido desde un nuevo
// estado (`detalleMapaCalor`) que se llena al cliquear una celda.
// Importante: el botón de acción del modal normalmente dispara
// MODAL_ACTIONS[modal] (crear/guardar algo); como esto es de solo
// lectura, se hace que para este modal el botón simplemente cierre,
// en vez de caer en el fallback 'guardarUsuario'.
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
    throw new Error("No se encontró el texto exacto (mapa de calor detalle):\n" + desde.slice(0, 400));
  }
  template = template.replace(desde, () => hasta);
}

// 1. mapaCalor(): cada celda arma un detalle real (ordenado de mayor
//    a menor aporte) y un handler que lo abre en el modal.
reemplazar(
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
  };

  mapaCalor() {
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
          fg: claro ? 'var(--fg-1)' : '#fff',
          go: this.abrirDetalleMapaCalor(b.nombre, g, metrica, c)
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
        (metrica === 'gasto' && datos.movimientos_sin_precio > 0 ? ' · ' + datos.movimientos_sin_precio + ' mov. sin precio registrado' : '') +
        ' · toca una celda para ver su detalle'
    };
  }`,
);

// 2. La celda de la matriz ahora es cliqueable.
reemplazar(
  `<sc-raw-td style="padding:12px;text-align:center;background:{{ c.bg }}">
<span style="font-family:var(--font-mono);font-size:13px;font-weight:700;white-space:nowrap;color:{{ c.fg }}">{{ c.valorTexto }}</span>
</sc-raw-td>`,
  `<sc-raw-td sc-camel-on-click="{{ c.go }}" style="padding:12px;text-align:center;background:{{ c.bg }};cursor:pointer">
<span style="font-family:var(--font-mono);font-size:13px;font-weight:700;white-space:nowrap;color:{{ c.fg }}">{{ c.valorTexto }}</span>
</sc-raw-td>`,
);

// 3. Nueva entrada del modal genérico, armada desde state.detalleMapaCalor.
reemplazar(
  `    const M = {
      usuario: {`,
  `    const dMC = this.state.detalleMapaCalor || { titulo: '', sub: '', columnas: [], rows: [], vacio: true };
    const M = {
      detalleMapaCalor: {
        eyebrow: 'INTELIGENCIA · MAPA DE CALOR', title: dMC.titulo, sub: dMC.sub,
        width: '680px', cta: 'Cerrar', ctaBg: 'var(--brand-blue)',
        fields: [{ isTable: true, span: 2, columnas: dMC.columnas, rows: dMC.rows, vacio: dMC.vacio }]
      },
      usuario: {`,
);

// 4. El botón de acción del modal, para este caso, solo cierra (no
//    existe una acción real de "guardar" sobre un detalle de lectura).
reemplazar(
  `      modalSubmit: this.submitAccion(MODAL_ACTIONS[s.modal] || 'guardarUsuario'),`,
  `      modalSubmit: s.modal === 'detalleMapaCalor' ? this.close : this.submitAccion(MODAL_ACTIONS[s.modal] || 'guardarUsuario'),`,
);

// 5. Nuevo tipo de campo de modal: tabla de solo lectura.
reemplazar(
  `<sc-if value="{{ f.isRead }}" hint-placeholder-val="{{ false }}">
<div style="font-size:12.5px;font-weight:500;color:var(--fg-1);padding:8px 0 0">{{ f.value }}</div>
</sc-if>`,
  `<sc-if value="{{ f.isRead }}" hint-placeholder-val="{{ false }}">
<div style="font-size:12.5px;font-weight:500;color:var(--fg-1);padding:8px 0 0">{{ f.value }}</div>
</sc-if>
<sc-if value="{{ f.isTable }}" hint-placeholder-val="{{ false }}">
<div style="border:1px solid var(--border-1);border-radius:6px;overflow:hidden">
<div style="max-height:320px;overflow-y:auto">
<sc-raw-table style="width:100%;border-collapse:collapse">
<sc-raw-thead>
<sc-raw-tr style="background:var(--bg-2)">
<sc-for list="{{ f.columnas }}" as="col" hint-placeholder-count="4">
<sc-raw-th style="padding:8px 10px;font-size:9.5px;font-weight:600;color:var(--fg-4);text-transform:uppercase;letter-spacing:0.06em;text-align:left;white-space:nowrap;position:sticky;top:0;background:var(--bg-2)">{{ col }}</sc-raw-th>
</sc-for>
</sc-raw-tr>
</sc-raw-thead>
<sc-raw-tbody>
<sc-for list="{{ f.rows }}" as="r" hint-placeholder-count="4">
<sc-raw-tr style="border-top:1px solid var(--border-1)">
<sc-for list="{{ r.celdas }}" as="c" hint-placeholder-count="6">
<sc-raw-td style="padding:8px 10px;font-size:12px;color:var(--fg-1);white-space:nowrap">{{ c }}</sc-raw-td>
</sc-for>
</sc-raw-tr>
</sc-for>
</sc-raw-tbody>
</sc-raw-table>
</div>
<sc-if value="{{ f.vacio }}" hint-placeholder-val="{{ false }}">
<div style="padding:18px;text-align:center;font-size:12px;color:var(--fg-4)">Sin datos para este cruce.</div>
</sc-if>
</div>
</sc-if>`,
);

lines[TEMPLATE_LINE] = JSON.stringify(template).replace(/<\//g, "<\\/");
fs.writeFileSync(filePath, lines.join("\n"));
console.log("OK. Mapa de calor: clic en una celda abre su detalle real:", filePath);
