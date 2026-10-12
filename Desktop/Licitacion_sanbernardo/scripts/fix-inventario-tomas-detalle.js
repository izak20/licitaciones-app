// El usuario reportó dos cosas reales en Inventario:
// 1) Las dos pestañas ("Toma de inventario" / "Ajustes") muestran
//    "0" en el contador aunque la tabla sí tiene datos reales. Causa:
//    cuando se conectó el filtro de bodega del header a Inventario,
//    la clave de caché pasó a llevar sufijo de bodega
//    ('inventario_tomas_' + bodega), pero el contador de las pestañas
//    se quedó leyendo la clave vieja sin sufijo (que nunca se llena),
//    así que siempre da 0 — aunque la tabla de abajo sí usa la clave
//    correcta y por eso muestra datos.
// 2) La columna "Artículos" de Toma de inventario solo dice "12 de
//    16" pero no deja ver CUÁLES son esos artículos — hay que irlos a
//    buscar en el catálogo de arriba, sin ninguna relación con esa
//    toma puntual. El backend YA tenía una ruta real para esto
//    (GET /api/inventario/tomas/[id], pensada para una vista "Ajustar
//    conteo" que nunca se conectó en el frontend — el botón que
//    existía, "Ajustar conteo", solo llamaba a un mock que mostraba
//    un aviso sin mostrar ningún dato real). Se conecta de verdad: al
//    cliquear una fila de Toma de inventario se abre un modal con la
//    lista real de artículos de esa toma — lote, stock de sistema,
//    cuánto se contó y la diferencia.
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
    throw new Error("No se encontró el texto exacto (inventario tomas detalle):\n" + desde.slice(0, 400));
  }
  template = template.replace(desde, () => hasta);
}

// 1. El contador de las pestañas usa la misma clave (con sufijo de
//    bodega) que la tabla real.
reemplazar(
  `      tabs: [{ label: 'Toma de inventario', count: (this.state.listas.inventario_tomas || []).length, i: 0 }, { label: 'Ajustes', count: (this.state.listas.inventario_vencidos || []).length, i: 1 }]`,
  `      tabs: [{ label: 'Toma de inventario', count: (this.state.listas['inventario_tomas_' + (bId || 'todas')] || []).length, i: 0 }, { label: 'Ajustes', count: (this.state.listas['inventario_vencidos_' + (bId || 'todas')] || []).length, i: 1 }]`,
);

// 2. Cada fila de Toma de inventario abre el detalle real de sus
//    artículos.
reemplazar(
  `      rows: tomas.map(tm => {
        const bodega = this.desanidar(tm.bodega);
        const total = tm.total_articulos || 0;
        const contados = tm.articulos_contados || 0;
        return {
          cells: [txt(bodega ? bodega.nombre : '—'), txt(tm.alcance), txt(tm.responsable || '—'), mono(contados + ' de ' + total, 'right', contados === total && total > 0 ? B.ok[1] : 'var(--fg-1)'), badge(tm.estado, tm.estado === 'cerrada' ? 'ok' : 'warn'), txt(this.fechaCorta(tm.fecha_inicio)), txt(tm.segundo_verificador || '—'), badge(tm.conteo_a_ciegas ? 'SÍ' : 'NO', tm.conteo_a_ciegas ? 'info' : 'neutral')],
          actions: []
        };
      }),`,
  `      rows: tomas.map(tm => {
        const bodega = this.desanidar(tm.bodega);
        const total = tm.total_articulos || 0;
        const contados = tm.articulos_contados || 0;
        return {
          cells: [txt(bodega ? bodega.nombre : '—'), txt(tm.alcance), txt(tm.responsable || '—'), mono(contados + ' de ' + total, 'right', contados === total && total > 0 ? B.ok[1] : 'var(--fg-1)'), badge(tm.estado, tm.estado === 'cerrada' ? 'ok' : 'warn'), txt(this.fechaCorta(tm.fecha_inicio)), txt(tm.segundo_verificador || '—'), badge(tm.conteo_a_ciegas ? 'SÍ' : 'NO', tm.conteo_a_ciegas ? 'info' : 'neutral')],
          actions: [],
          go: () => this.setState({ modal: 'detalleToma', detalleTomaId: tm.id_toma, detalleTomaTitulo: (bodega ? bodega.nombre : '—') + ' · ' + tm.alcance }),
          cursorPointer: 'pointer'
        };
      }),`,
);

// 3. El modal genérico ahora también sabe construir el detalle de una
//    toma (lo arma en caliente desde la ruta real que ya existía,
//    distinto de "detalleTabla" porque acá el dato se pide recién al
//    abrir, no viene precalculado).
reemplazar(
  `    const dT = this.state.detalleTabla || { eyebrow: '', titulo: '', sub: '', columnas: [], rows: [], vacio: true };
    const M = {
      detalleTabla: {
        eyebrow: dT.eyebrow, title: dT.titulo, sub: dT.sub,
        width: '680px', cta: 'Cerrar', ctaBg: 'var(--brand-blue)',
        fields: [{ isTable: true, span: 2, columnas: dT.columnas, rows: dT.rows, vacio: dT.vacio }]
      },`,
  `    const dT = this.state.detalleTabla || { eyebrow: '', titulo: '', sub: '', columnas: [], rows: [], vacio: true };
    const tomaIdActual = this.state.detalleTomaId;
    const tomaDetalle = tomaIdActual ? this.cargarLista('toma_detalle_' + tomaIdActual, '/api/inventario/tomas/' + tomaIdActual) : null;
    const tomaLineas = (tomaDetalle && !Array.isArray(tomaDetalle)) ? (tomaDetalle.lineas || []) : [];
    const M = {
      detalleTabla: {
        eyebrow: dT.eyebrow, title: dT.titulo, sub: dT.sub,
        width: '680px', cta: 'Cerrar', ctaBg: 'var(--brand-blue)',
        fields: [{ isTable: true, span: 2, columnas: dT.columnas, rows: dT.rows, vacio: dT.vacio }]
      },
      detalleToma: {
        eyebrow: 'INVENTARIO · TOMA', title: this.state.detalleTomaTitulo || 'Toma de inventario', sub: 'Artículos reales de esta toma · stock de sistema vs. conteo físico',
        width: '720px', cta: 'Cerrar', ctaBg: 'var(--brand-blue)',
        fields: [{
          isTable: true, span: 2,
          columnas: ['Artículo', 'Lote', 'Stock sistema', 'Contado', 'Diferencia'],
          rows: tomaLineas.map(l => {
            const lote = this.desanidar(l.lote);
            const articulo = lote ? this.desanidar(lote.articulo) : null;
            return {
              celdas: [
                articulo ? articulo.nombre : '—',
                lote ? lote.numero_lote : '—',
                String(l.cantidad_sistema ?? '—'),
                l.cantidad_contada === null || l.cantidad_contada === undefined ? 'Sin contar' : String(l.cantidad_contada),
                l.diferencia === null || l.diferencia === undefined ? '—' : String(l.diferencia)
              ]
            };
          }),
          vacio: tomaLineas.length === 0
        }]
      },`,
);

// 4. El botón del nuevo modal también solo cierra (es de solo
//    lectura, igual que detalleTabla).
reemplazar(
  `      modalSubmit: s.modal === 'detalleTabla' ? this.close : this.submitAccion(MODAL_ACTIONS[s.modal] || 'guardarUsuario'),`,
  `      modalSubmit: (s.modal === 'detalleTabla' || s.modal === 'detalleToma') ? this.close : this.submitAccion(MODAL_ACTIONS[s.modal] || 'guardarUsuario'),`,
);

lines[TEMPLATE_LINE] = JSON.stringify(template).replace(/<\//g, "<\\/");
fs.writeFileSync(filePath, lines.join("\n"));
console.log("OK. Inventario: contador de pestañas corregido + detalle real de artículos por toma:", filePath);
