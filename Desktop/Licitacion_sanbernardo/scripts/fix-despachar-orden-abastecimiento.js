// Conecta "Solicitar abastecimiento" (y las órdenes automáticas) con
// el traspaso real entre bodegas, que es donde ya existe el mecanismo
// físico de "alguien despacha, alguien recibe" (ver conversación: el
// usuario pensó que eso pasaba en "Donación" de Movimientos Farmacia,
// que en realidad es para donaciones externas sin costo).
//
// El propio esquema (001_schema.sql) ya traía movimiento.id_orden_
// abastecimiento y el estado 'despachada' en orden_abastecimiento,
// pero nada los usaba: fn_crear_traspaso no aceptaba la orden de
// origen, y no había ningún botón para generar ese traspaso desde una
// orden. Esto agrega el botón "Despachar" en Abastecimiento → Órdenes
// generadas, que abre un modal para elegir, por cada línea pedida,
// qué lote real despachar (con el stock real disponible) — y genera
// un traspaso de verdad por cada línea, dejando la orden en
// 'despachada'. La recepción la hace Farmacia con el mismo botón
// "Recibir traspaso" que ya existe y ya funciona.
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

function reemplazar(desde, hasta, tag) {
  if (!template.includes(desde)) {
    throw new Error("No se encontró el texto exacto (" + tag + "):\n" + desde.slice(0, 400));
  }
  template = template.replace(desde, () => hasta);
}

// 1. Servicio de API real para el despacho.
reemplazar(
  `  /* Abastecimiento */
  generarOrdenAbastecimiento: p => apiFetch('POST', '/abastecimiento/ordenes', p, 'Orden de abastecimiento generada'),`,
  `  /* Abastecimiento */
  generarOrdenAbastecimiento: p => apiFetch('POST', '/abastecimiento/ordenes', p, 'Orden de abastecimiento generada'),
  despacharOrden: p => apiFetch('POST', '/abastecimiento/ordenes/' + p.id_orden + '/despachar', { lineas: p.lineas }, 'Orden despachada · traspaso generado'),`,
  "API.despacharOrden",
);

// 2. Clave del modal.
reemplazar(
  `  orden: 'generarOrdenAbastecimiento', recepcionOD: 'registrarRecepcionOD',`,
  `  orden: 'generarOrdenAbastecimiento', despachar: 'despacharOrden', recepcionOD: 'registrarRecepcionOD',`,
  "MODAL_ACTIONS.despachar",
);

// 3. Estado inicial: qué orden se está despachando ahora mismo.
reemplazar(
  `    viasActivas: null, ultimoArticuloId: null, ultimoTraspasoId: null, ultimoProveedorId: null, listas: {}`,
  `    viasActivas: null, ultimoArticuloId: null, ultimoTraspasoId: null, ultimoProveedorId: null, ordenDespachando: null, listas: {}`,
  "estado inicial ordenDespachando",
);

// 4. Botón "Despachar" en Abastecimiento → Órdenes generadas, visible
//    mientras la orden siga pendiente, y un color de estado real
//    (antes sólo distinguía "cerrada" del resto).
reemplazar(
  `      rows: ordenes.map(o => {
        const bodega = this.desanidar(o.bodega_solicitante);
        return {
          cells: [mono(o.folio), txt(this.fechaCorta(o.fecha_creacion)), txt(bodega ? bodega.nombre : '—'), txt(o.origen), mono((o.lineas || []).length, 'right'), badge(o.estado, o.estado === 'cerrada' ? 'ok' : 'neutral')],
          actions: []
        };
      }),`,
  `      rows: ordenes.map(o => {
        const bodega = this.desanidar(o.bodega_solicitante);
        const pendiente = o.estado === 'generada' || o.estado === 'aprobada';
        return {
          cells: [mono(o.folio), txt(this.fechaCorta(o.fecha_creacion)), txt(bodega ? bodega.nombre : '—'), txt(o.origen), mono((o.lineas || []).length, 'right'), badge(o.estado, o.estado === 'cerrada' ? 'ok' : (o.estado === 'despachada' ? 'info' : 'warn'))],
          actions: pendiente ? [{ isLabeled: true, title: 'Despachar', go: () => this.setState({ ordenDespachando: o, modal: 'despachar', dd: null }) }] : []
        };
      }),`,
  "abastecimiento ordenes rows+accion",
);

// 5. Modal "Despachar": una línea por artículo pedido, cada una con
//    el lote real a usar (con su stock real) y la cantidad a enviar.
//    Si un artículo no tiene stock en ninguna bodega, se avisa en vez
//    de ofrecer un selector vacío, y esa línea simplemente no se
//    despacha (el resto de la orden sí puede seguir).
reemplazar(
  `      orden: {
        eyebrow: 'INTERFAZ 18 · MODAL SOBRE ABASTECIMIENTO', title: 'Nueva orden de abastecimiento',`,
  `      despachar: (() => {
        const orden = this.state.ordenDespachando || { lineas: [] };
        const fields = [];
        (orden.lineas || []).forEach(linea => {
          const art = linea.articulo || {};
          const lotesArt = (this.state.refLotes || []).filter(l => l.articulo && l.articulo.id_articulo === art.id_articulo);
          fields.push({ label: 'Artículo · ' + (art.nombre || '?'), isRead: true, value: linea.cantidad_solicitada + ' solicitadas' + (linea.observacion ? ' · ' + linea.observacion : ''), span: 2 });
          if (lotesArt.length === 0) {
            fields.push(note('Sin stock disponible para ' + (art.nombre || 'este artículo') + ' en ninguna bodega. Esta línea no se despachará.', 'warn', 'alert'));
          } else {
            const opciones = lotesArt.map(l => 'Lote ' + l.numero_lote + ' · ' + (l.bodega ? l.bodega.nombre : '?') + ' · ' + l.cantidad_disponible + ' disp.');
            const defecto = Math.min(linea.cantidad_solicitada, lotesArt[0].cantidad_disponible);
            fields.push(sel('Lote a despachar · ' + (art.nombre || '?'), opciones, 1));
            fields.push(inp('Cantidad a despachar · ' + (art.nombre || '?'), String(defecto), 1));
          }
        });
        return {
          eyebrow: 'INTERFAZ 18 · DESPACHO DE ORDEN', title: 'Despachar ' + (orden.folio || 'orden'),
          sub: 'Genera un traspaso real por cada línea; la Farmacia deberá confirmar su recepción, igual que cualquier traspaso.',
          width: '600px', cta: 'Despachar', ctaBg: 'var(--brand-blue)',
          fields: fields.length ? fields : [note('Esta orden no tiene líneas.', 'warn', 'alert')]
        };
      })(),
      orden: {
        eyebrow: 'INTERFAZ 18 · MODAL SOBRE ABASTECIMIENTO', title: 'Nueva orden de abastecimiento',`,
  "M.despachar",
);

// 6. Armar el payload real a partir de lo elegido en el modal.
reemplazar(
  `    if (nombre === 'registrarTraspaso') {
      const lote = (this.state.refLotes || []).find(l => this.etiquetaLote(l) === leerModal('Lote de origen'));`,
  `    if (nombre === 'despacharOrden') {
      const orden = this.state.ordenDespachando || { lineas: [] };
      const lineas = [];
      (orden.lineas || []).forEach(linea => {
        const art = linea.articulo || {};
        const lotesArt = (this.state.refLotes || []).filter(l => l.articulo && l.articulo.id_articulo === art.id_articulo);
        if (lotesArt.length === 0) return;
        const opciones = lotesArt.map(l => 'Lote ' + l.numero_lote + ' · ' + (l.bodega ? l.bodega.nombre : '?') + ' · ' + l.cantidad_disponible + ' disp.');
        const elegido = leerModal('Lote a despachar · ' + (art.nombre || '?'));
        const idx = opciones.indexOf(elegido);
        const lote = idx >= 0 ? lotesArt[idx] : lotesArt[0];
        const cantidad = this.numero(leerModal('Cantidad a despachar · ' + (art.nombre || '?')));
        lineas.push({ id_linea: linea.id_linea, id_lote: lote.id_lote, cantidad: cantidad || 0 });
      });
      return { id_orden: orden.id_orden, lineas };
    }
    if (nombre === 'registrarTraspaso') {
      const lote = (this.state.refLotes || []).find(l => this.etiquetaLote(l) === leerModal('Lote de origen'));`,
  "recolectarPayload.despacharOrden",
);

// 7. submitAccion: no dejar despachar si ninguna línea tiene stock
//    real, y refrescar refLotes (el stock cambió) igual que con los
//    demás movimientos de stock.
reemplazar(
  `    if (nombre === 'recibirTraspaso' && !this.state.ultimoTraspasoId) {
      this.mostrarError(nombre, 'Primero registra un traspaso en esta sesión para poder confirmarlo.');
      return;
    }`,
  `    if (nombre === 'recibirTraspaso' && !this.state.ultimoTraspasoId) {
      this.mostrarError(nombre, 'Primero registra un traspaso en esta sesión para poder confirmarlo.');
      return;
    }
    if (nombre === 'despacharOrden') {
      const orden = this.state.ordenDespachando || { lineas: [] };
      const hayStock = (orden.lineas || []).some(linea => {
        const idArt = linea.articulo && linea.articulo.id_articulo;
        return (this.state.refLotes || []).some(l => l.articulo && l.articulo.id_articulo === idArt);
      });
      if (!hayStock) {
        this.mostrarError(nombre, 'Ninguna línea de esta orden tiene stock disponible para despachar.');
        return;
      }
    }`,
  "submitAccion guard despacharOrden",
);

reemplazar(
  `    const CON_PAYLOAD_PROPIO = ['guardarArticulo', 'guardarProveedor', 'registrarRecepcion', 'emitirDespacho', 'registrarTraspaso', 'recibirTraspaso', 'generarOrdenAbastecimiento', 'enviarSolicitudAbastecimiento', 'registrarDonacion', 'emitirDespachoInterno', 'registrarValeConsumo', 'registrarRecepcionOD', 'retirarLotesVencidos', 'guardarUsuario', 'guardarBodega', 'guardarCentroCosto', 'registrarDevolucion', 'registrarTemperatura', 'iniciarTomaInventario'];`,
  `    const CON_PAYLOAD_PROPIO = ['guardarArticulo', 'guardarProveedor', 'registrarRecepcion', 'emitirDespacho', 'registrarTraspaso', 'recibirTraspaso', 'generarOrdenAbastecimiento', 'despacharOrden', 'enviarSolicitudAbastecimiento', 'registrarDonacion', 'emitirDespachoInterno', 'registrarValeConsumo', 'registrarRecepcionOD', 'retirarLotesVencidos', 'guardarUsuario', 'guardarBodega', 'guardarCentroCosto', 'registrarDevolucion', 'registrarTemperatura', 'iniciarTomaInventario'];`,
  "CON_PAYLOAD_PROPIO += despacharOrden",
);

reemplazar(
  `    if (['registrarRecepcion', 'emitirDespacho', 'registrarTraspaso', 'registrarDonacion', 'emitirDespachoInterno', 'registrarValeConsumo', 'registrarDevolucion'].includes(nombre)) {
      const prevOnOk = opts.onOk;
      opts.onOk = (data) => { if (prevOnOk) prevOnOk(data); this.cargarReferencias(); };
    }`,
  `    if (['registrarRecepcion', 'emitirDespacho', 'registrarTraspaso', 'despacharOrden', 'registrarDonacion', 'emitirDespachoInterno', 'registrarValeConsumo', 'registrarDevolucion'].includes(nombre)) {
      const prevOnOk = opts.onOk;
      opts.onOk = (data) => { if (prevOnOk) prevOnOk(data); this.cargarReferencias(); };
    }`,
  "refrescar refLotes tras despacharOrden",
);

lines[TEMPLATE_LINE] = JSON.stringify(template).replace(/<\//g, "<\\/");
fs.writeFileSync(filePath, lines.join("\n"));
console.log("OK. Botón y modal reales para despachar una orden de abastecimiento (genera traspaso + Recibir traspaso):", filePath);
