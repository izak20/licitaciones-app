// One-off script: cablea a datos reales las secciones 5.7 Abastecimiento,
// 5.8 Despachos y recepción (parte Farmacia), 5.9 Análisis de consumo,
// 5.10 Farmacia y 5.11 Exportación, siguiendo el mismo patrón que
// wire-real-api.js / wire-forms.js / wire-input-values.js ya aplicaron a
// Maestros y Movimientos: reemplazo de funciones mock por apiFetch,
// simplificación de los campos "isScan" (varios ítems) a un solo
// lote/artículo real (el backend no soporta múltiples ítems por
// llamada), y listas desplegables con datos reales en vez de mockup.
//
// Deliberadamente NO se cablea 'solicitarEliminacionSegura' (Plan de
// salida / eliminación segura de todos los datos): el modal pide
// escribir "ELIMINAR", pero el backend exige la frase literal
// "ELIMINAR TODOS LOS DATOS" como segunda barrera de seguridad. Conectar
// ese botón a la ruta real requiere una decisión aparte, no una más
// de este barrido de cableado.
// Tampoco se cablea 'gestionarDiferencia': el modal "reparos" que lo
// dispara se abre desde una fila de mockup sin id real de movimiento.
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
    throw new Error("No se encontró el texto exacto:\n" + desde);
  }
  template = template.replace(desde, hasta);
}

// ============================================================
// 1. Funciones mock -> apiFetch real (rutas que sí existen en el
//    backend por especificación; se dejan como mock las que no tienen
//    ruta documentada: exportarAbastecimiento, imprimirOrden,
//    exportarDespachos, imprimir*, gestionarDiferencia,
//    solicitarEliminacionSegura).
// ============================================================
reemplazar(
  `  generarOrdenAbastecimiento: p => mockRequest('generarOrdenAbastecimiento', 'POST', '/abastecimiento/ordenes', p, 'Orden de abastecimiento generada'),`,
  `  generarOrdenAbastecimiento: p => apiFetch('POST', '/abastecimiento/ordenes', p, 'Orden de abastecimiento generada'),`,
);
reemplazar(
  `  exportarRecepciones:  p => mockRequest('exportarRecepciones', 'GET', '/recepciones/export', p, 'Exportación de recepciones lista'),`,
  `  exportarRecepciones:  p => apiFetch('GET', '/recepciones/export', p, 'Exportación de recepciones lista'),`,
);
reemplazar(
  `  registrarRecepcionOD: p => mockRequest('registrarRecepcionOD', 'POST', '/recepciones', p, 'Recepción registrada'),`,
  `  registrarRecepcionOD: p => apiFetch('POST', '/recepciones', p, 'Recepción registrada'),`,
);
reemplazar(
  `  exportarAnalisisConsumo: p => mockRequest('exportarAnalisisConsumo', 'GET', '/analisis-consumo/export', p, 'Exportación a Excel lista'),`,
  `  exportarAnalisisConsumo: p => apiFetch('GET', '/analisis-consumo/export', p, 'Exportación a Excel lista'),`,
);
reemplazar(
  `  desglosarPorProducto:    p => mockRequest('desglosarPorProducto', 'GET', '/analisis-consumo/detalle', p, 'Desglose por producto cargado'),`,
  `  desglosarPorProducto:    p => apiFetch('GET', '/analisis-consumo/detalle', p, 'Desglose por producto cargado'),`,
);
reemplazar(
  `  registrarDonacion:     p => mockRequest('registrarDonacion', 'POST', '/farmacia/donaciones', p, 'Donación registrada'),`,
  `  registrarDonacion:     p => apiFetch('POST', '/farmacia/donaciones', p, 'Donación registrada'),`,
);
reemplazar(
  `  emitirDespachoInterno: p => mockRequest('emitirDespachoInterno', 'POST', '/farmacia/despachos-internos', p, 'Despacho interno emitido'),`,
  `  emitirDespachoInterno: p => apiFetch('POST', '/farmacia/despachos-internos', p, 'Despacho interno emitido'),`,
);
reemplazar(
  `  registrarValeConsumo:  p => mockRequest('registrarValeConsumo', 'POST', '/farmacia/vales', p, 'Vale de consumo registrado'),`,
  `  registrarValeConsumo:  p => apiFetch('POST', '/farmacia/vales', p, 'Vale de consumo registrado'),`,
);
reemplazar(
  `  enviarSolicitudAbastecimiento: p => mockRequest('enviarSolicitudAbastecimiento', 'POST', '/farmacia/solicitudes', p, 'Solicitud enviada a la Droguería'),`,
  `  enviarSolicitudAbastecimiento: p => apiFetch('POST', '/farmacia/solicitudes', p, 'Solicitud enviada a la Droguería'),`,
);
reemplazar(
  `  verMisSolicitudes:     p => mockRequest('verMisSolicitudes', 'GET', '/farmacia/solicitudes', p, '2 solicitudes en gestión'),`,
  `  verMisSolicitudes:     p => apiFetch('GET', '/farmacia/solicitudes', p, '2 solicitudes en gestión'),`,
);
reemplazar(
  `  generarExportacion:   p => mockRequest('generarExportacion', 'POST', '/exportaciones', p, 'Exportación completa generada'),`,
  `  generarExportacion:   p => apiFetch('POST', '/exportaciones', p, 'Exportación completa generada'),`,
);

// El botón real solo pide tipo (el backend fija el formato en xlsx);
// se reemplaza el payload fijo de mockup.
reemplazar(
  `      generarExportacionGo: this.run('generarExportacion', { formato: 'CSV (UTF-8) + esquema JSON', periodo: 'Todo el histórico' }),`,
  `      generarExportacionGo: this.run('generarExportacion', { tipo: 'a_solicitud' }),`,
);

// ============================================================
// 2. Estado: agrega refPendientes (despachos/traspasos aún no
//    recepcionados, usados por "Nueva orden de recepción" en Farmacia).
// ============================================================
reemplazar(
  `    refBodegas: [], refArticulos: [], refProveedores: [], refCentrosCosto: [], refLotes: [],
    viasActivas: null, ultimoArticuloId: null, ultimoTraspasoId: null
  };`,
  `    refBodegas: [], refArticulos: [], refProveedores: [], refCentrosCosto: [], refLotes: [], refPendientes: [],
    viasActivas: null, ultimoArticuloId: null, ultimoTraspasoId: null
  };`,
);

// ============================================================
// 3. cargarReferencias: también trae movimientos pendientes de
//    recepción (despacho/traspaso con estado 'enviado' o 'en_transito').
// ============================================================
reemplazar(
  `  cargarReferencias = () => {
    const cargar = (ruta) => fetch(ruta).then(r => r.json()).then(d => d.data || []).catch(() => []);
    Promise.all([
      cargar('/api/bodegas'), cargar('/api/articulos'), cargar('/api/proveedores'),
      cargar('/api/centros-costo'), cargar('/api/lotes')
    ]).then(([refBodegas, refArticulos, refProveedores, refCentrosCosto, refLotes]) => {
      this.setState({ refBodegas, refArticulos, refProveedores, refCentrosCosto, refLotes });
    });
  };`,
  `  cargarReferencias = () => {
    const cargar = (ruta) => fetch(ruta).then(r => r.json()).then(d => d.data || []).catch(() => []);
    Promise.all([
      cargar('/api/bodegas'), cargar('/api/articulos'), cargar('/api/proveedores'),
      cargar('/api/centros-costo'), cargar('/api/lotes'), cargar('/api/despachos')
    ]).then(([refBodegas, refArticulos, refProveedores, refCentrosCosto, refLotes, despachos]) => {
      const refPendientes = (despachos || []).filter(m => m.estado === 'enviado' || m.estado === 'en_transito');
      this.setState({ refBodegas, refArticulos, refProveedores, refCentrosCosto, refLotes, refPendientes });
    });
  };`,
);

// ============================================================
// 4. Nuevas opciones derivadas (misma familia que opcionesLotes, etc.)
// ============================================================
reemplazar(
  `  opcionesLotes = () => (this.state.refLotes || []).map(this.etiquetaLote);`,
  `  opcionesLotes = () => (this.state.refLotes || []).map(this.etiquetaLote);
  etiquetaPendiente = (m) => {
    const lote = m.lote || {};
    const articulo = lote.articulo || {};
    const folio = m.folio || ('Traspaso ' + String(m.id_movimiento || '').slice(0, 8));
    return folio + ' · ' + (articulo.nombre || '?') + ' · ' + m.cantidad + ' · ' + String(m.fecha_movimiento || '').slice(0, 10);
  };
  opcionesPendientes = () => (this.state.refPendientes || []).map(this.etiquetaPendiente);`,
);

// ============================================================
// 5. recolectarPayload: nuevas ramas para las 6 acciones de
//    Abastecimiento/Farmacia con payload propio.
// ============================================================
reemplazar(
  `    if (nombre === 'recibirTraspaso') {
      return {
        id: this.state.ultimoTraspasoId,
        con_reparos: !this.state.toggle,
        observacion: leerModal('Observaciones')
      };
    }
    return undefined;
  };`,
  `    if (nombre === 'recibirTraspaso') {
      return {
        id: this.state.ultimoTraspasoId,
        con_reparos: !this.state.toggle,
        observacion: leerModal('Observaciones')
      };
    }
    if (nombre === 'generarOrdenAbastecimiento') {
      const tipo = leerModal('Tipo de orden');
      const bodega = (this.state.refBodegas || []).find(b => b.nombre === leerModal('Bodega'));
      if (tipo === 'Manual por solicitud') {
        const articulo = (this.state.refArticulos || []).find(a => a.nombre === leerModal('Artículo'));
        return {
          modo: 'solicitud',
          id_bodega: bodega && bodega.id_bodega,
          lineas: [{
            id_articulo: articulo && articulo.id_articulo,
            cantidad: this.numero(leerModal('Cantidad')),
            observacion: leerModal('Observaciones')
          }]
        };
      }
      return {
        modo: tipo === 'Automática por stock mínimo' ? 'automatica_stock_minimo' : 'automatica_consumo',
        id_bodega: bodega && bodega.id_bodega
      };
    }
    if (nombre === 'enviarSolicitudAbastecimiento') {
      const bodega = (this.state.refBodegas || []).find(b => b.nombre === leerFicha('Bodega solicitante'));
      const articulo = (this.state.refArticulos || []).find(a => a.nombre === leerFicha('Artículo'));
      return {
        id_bodega: bodega && bodega.id_bodega,
        lineas: [{
          id_articulo: articulo && articulo.id_articulo,
          cantidad: this.numero(leerFicha('Cantidad solicitada')),
          observacion: leerFicha('Observaciones para la Droguería')
        }]
      };
    }
    if (nombre === 'registrarDonacion') {
      const bodega = (this.state.refBodegas || []).find(b => b.nombre === leerModal('Bodega de ingreso'));
      const articulo = (this.state.refArticulos || []).find(a => a.nombre === leerModal('Artículo'));
      const acta = leerModal('N° de acta de donación');
      return {
        id_bodega: bodega && bodega.id_bodega,
        id_articulo: articulo && articulo.id_articulo,
        cantidad: this.numero(leerModal('Cantidad')),
        numero_lote: leerModal('Lote'),
        fecha_vencimiento: leerModal('Fecha de vencimiento'),
        donante: leerModal('Donante'),
        observacion: acta ? ('Acta: ' + acta) : undefined
      };
    }
    if (nombre === 'emitirDespachoInterno') {
      const lote = (this.state.refLotes || []).find(l => this.etiquetaLote(l) === leerModal('Lote a despachar'));
      const centro = (this.state.refCentrosCosto || []).find(c => (c.codigo + ' · ' + c.nombre) === leerModal('Centro de costo'));
      const solicitante = leerModal('Solicitante');
      return {
        id_bodega: lote && lote.id_bodega,
        id_lote: lote && lote.id_lote,
        id_centro_costo: centro && centro.id_centro_costo,
        cantidad: this.numero(leerModal('Cantidad')),
        observacion: solicitante ? ('Solicitante: ' + solicitante) : leerModal('Observaciones')
      };
    }
    if (nombre === 'registrarValeConsumo') {
      const lote = (this.state.refLotes || []).find(l => this.etiquetaLote(l) === leerModal('Lote'));
      const centro = (this.state.refCentrosCosto || []).find(c => (c.codigo + ' · ' + c.nombre) === leerModal('Centro de costo'));
      const prof = leerModal('Profesional solicitante');
      const serv = leerModal('Servicio');
      return {
        id_bodega: lote && lote.id_bodega,
        id_lote: lote && lote.id_lote,
        id_centro_costo: centro && centro.id_centro_costo,
        cantidad: this.numero(leerModal('Cantidad')),
        observacion: [prof, serv].filter(Boolean).join(' · ') || undefined
      };
    }
    if (nombre === 'registrarRecepcionOD') {
      const pend = (this.state.refPendientes || []).find(m => this.etiquetaPendiente(m) === leerModal('Orden de despacho origen'));
      return {
        id_movimiento: pend && pend.id_movimiento,
        con_reparos: !this.state.toggle,
        observacion: leerModal('Observaciones')
      };
    }
    return undefined;
  };`,
);

// ============================================================
// 6. submitAccion: registra las 6 nuevas acciones como "con payload
//    propio", y refresca referencias (stock/lotes) tras las que
//    afectan inventario.
// ============================================================
reemplazar(
  `    const CON_PAYLOAD_PROPIO = ['guardarArticulo', 'guardarProveedor', 'registrarRecepcion', 'emitirDespacho', 'registrarTraspaso', 'recibirTraspaso'];`,
  `    const CON_PAYLOAD_PROPIO = ['guardarArticulo', 'guardarProveedor', 'registrarRecepcion', 'emitirDespacho', 'registrarTraspaso', 'recibirTraspaso', 'generarOrdenAbastecimiento', 'enviarSolicitudAbastecimiento', 'registrarDonacion', 'emitirDespachoInterno', 'registrarValeConsumo', 'registrarRecepcionOD'];`,
);
reemplazar(
  `    if (['registrarRecepcion', 'emitirDespacho', 'registrarTraspaso'].includes(nombre)) {`,
  `    if (['registrarRecepcion', 'emitirDespacho', 'registrarTraspaso', 'registrarDonacion', 'emitirDespachoInterno', 'registrarValeConsumo'].includes(nombre)) {`,
);

// ============================================================
// 7. Modal "orden" (Nueva orden de abastecimiento): simplificado a lo
//    que fn_generar_orden_automatica / POST ordenes soportan — sin
//    proveedor (el endpoint no lo usa) y con un solo ítem cuando es
//    manual, en vez del carrito de ítems del mockup.
// ============================================================
reemplazar(
  `      orden: {
        eyebrow: 'INTERFAZ 18 · MODAL SOBRE ABASTECIMIENTO', title: 'Nueva orden de abastecimiento',
        width: '560px', cta: 'Generar orden', ctaBg: 'var(--brand-blue)',
        fields: [
          sel('Tipo de orden', ['Automática por consumo', 'Manual por solicitud'], 2, 'La automática calcula cantidades con el consumo de los últimos 3 meses y el stock mín/máx configurado.'),
          sel('Proveedor', ['Laboratorio Chile S.A.', 'Laboratorios Saval S.A.', 'Novo Nordisk Chile', 'Distribuidora Andes Ltda.'], 2),
          sel('Bodega de destino', ['Bodega general', 'Bodega refrigerada 1', 'Bodega insumos'], 1),
          { label: 'Fecha requerida', isInput: true, inputType: 'date', value: '2026-09-25', span: 1 },
          { label: 'Ítems de la orden', isScan: true, span: 2, lines: [
            { name: 'Amoxicilina 500 mg cápsula', lote: 'sugerido', qty: '6.000' },
            { name: 'Paracetamol 500 mg comprimido', lote: 'sugerido', qty: '4.000' },
            { name: 'Insulina NPH 100 UI/ml', lote: 'sugerido', qty: '900' }
          ] },
          { label: 'Observaciones', isArea: true, span: 2, value: '', placeholder: 'Condiciones de entrega, plazos, referencia a convenio marco…' }
        ]
      },`,
  `      orden: {
        eyebrow: 'INTERFAZ 18 · MODAL SOBRE ABASTECIMIENTO', title: 'Nueva orden de abastecimiento',
        width: '560px', cta: 'Generar orden', ctaBg: 'var(--brand-blue)',
        fields: [
          sel('Tipo de orden', ['Automática por consumo', 'Automática por stock mínimo', 'Manual por solicitud'], 2, 'La automática calcula cantidades con el consumo de los últimos 3 meses o con el stock mín/máx configurado; la manual pide un solo artículo y cantidad.'),
          sel('Bodega', this.opcionesBodegas(), 2),
          sel('Artículo', this.opcionesArticulos(), 2),
          inp('Cantidad', '1'),
          { label: 'Observaciones', isArea: true, span: 2, value: '', placeholder: 'Solo aplica a la orden manual por solicitud…' }
        ]
      },`,
);

// ============================================================
// 8. Modal "recepcionOD" (Farmacia: recepción con o sin reparos):
//    la "Orden de despacho origen" pasa a listar despachos/traspasos
//    reales pendientes de recepción; se quita el checklist de ítems
//    (no hay datos reales por línea) y el tipo de reparo (se funde en
//    observaciones).
// ============================================================
reemplazar(
  `      recepcionOD: {
        eyebrow: 'INTERFAZ 23 · MODAL SOBRE RECEPCIÓN (FARMACIA)', title: 'Nueva orden de recepción',
        sub: 'Anexo N°4 · seleccionar Orden de Recepción a partir de una Orden de Despacho',
        width: '600px', cta: 'Registrar recepción', ctaBg: 'var(--brand-blue)',
        fields: [
          sel('Orden de despacho origen', ['DES-04812 · 32 ítems · 14 sep 2026', 'DES-04811 · 18 ítems · 14 sep 2026', 'DES-04791 · 27 ítems · 12 sep 2026'], 2),
          { label: 'Checklist de ítems recibidos', isScan: true, span: 2, lines: [
            { name: 'Paracetamol 500 mg comprimido', lote: 'L-22910', qty: '4.000 / 4.000' },
            { name: 'Amoxicilina 500 mg cápsula', lote: 'L-22908', qty: '1.180 / 1.200' },
            { name: 'Suero fisiológico 500 ml', lote: 'L-22884', qty: '300 / 300' }
          ] },
          tg('Conformidad', 'ok', 'Sin reparos', 'Con reparos'),
          sel('Tipo de reparo', ['Diferencia de cantidad', 'Empaque dañado', 'Lote o vencimiento distinto', 'Cadena de frío interrumpida'], 1),
          { label: 'Observaciones', isArea: true, span: 2, value: '', placeholder: 'Obligatorio si la recepción se registra con reparos' },
          note('Al registrar con reparos, el sistema emite aviso automático a la Droguería Comunal y la orden queda visible en Consulta de despachos como "Recepcionada con reparos".', 'warn', 'alert')
        ]
      },`,
  `      recepcionOD: {
        eyebrow: 'INTERFAZ 23 · MODAL SOBRE RECEPCIÓN (FARMACIA)', title: 'Nueva orden de recepción',
        sub: 'Anexo N°4 · seleccionar Orden de Recepción a partir de una Orden de Despacho',
        width: '600px', cta: 'Registrar recepción', ctaBg: 'var(--brand-blue)',
        fields: [
          sel('Orden de despacho origen', this.opcionesPendientes(), 2),
          tg('Conformidad', 'ok', 'Sin reparos', 'Con reparos'),
          { label: 'Observaciones', isArea: true, span: 2, value: '', placeholder: 'Obligatorio si la recepción se registra con reparos' },
          note('Al registrar con reparos, el sistema emite aviso automático a la Droguería Comunal y la orden queda visible en Consulta de despachos como "Recepcionada con reparos".', 'warn', 'alert')
        ]
      },`,
);

// ============================================================
// 9. Modal "donacion": Artículo y Bodega de ingreso pasan a listas
//    reales; Fecha de vencimiento (sí se envía al backend) se corrige
//    para que sea editable, igual que se hizo antes con Código/Nombre
//    del artículo.
// ============================================================
reemplazar(
  `          sel('Artículo', ['Suero fisiológico 500 ml', 'Guantes de nitrilo talla M', 'Paracetamol 500 mg comprimido'], 2),
          inp('Lote', 'L-D0413'), { label: 'Fecha de vencimiento', isInput: true, inputType: 'date', value: '2029-08-02', span: 1 },
          inp('Cantidad', '400'), sel('Bodega de ingreso', ['Bodega farmacia', 'Bodega insumos'], 1),`,
  `          sel('Artículo', this.opcionesArticulos(), 2),
          inp('Lote', 'L-D0413'), { label: 'Fecha de vencimiento', isInput: true, inputType: 'date', value: campoValor('Fecha de vencimiento', '2029-08-02'), onInput: onCampo('Fecha de vencimiento'), span: 1 },
          inp('Cantidad', '400'), sel('Bodega de ingreso', this.opcionesBodegas(), 1),`,
);

// ============================================================
// 10. Modal "cuentas" (despacho a cuenta interna, Farmacia):
//     simplificado a un solo lote real + cantidad, igual que el
//     despacho de Droguería.
// ============================================================
reemplazar(
  `      cuentas: {
        eyebrow: 'INTERFAZ 21 · MODAL SOBRE MOVIMIENTOS (FARMACIA)', title: 'Nuevo despacho a cuenta interna',
        width: '580px', cta: 'Emitir despacho', ctaBg: 'var(--brand-blue)',
        fields: [
          sel('Cuenta interna', ['Programa Salud Mental', 'Programa Odontológico', 'Programa Cardiovascular', 'Vacunatorio'], 1),
          sel('Centro de costo', ['CC-1052', 'CC-1053', 'CC-1054', 'CC-1042'], 1),
          inp('Solicitante', 'Verónica Tapia'), { label: 'Fecha', isInput: true, inputType: 'date', value: '2026-09-15', span: 1 },
          { label: 'Ítems a despachar', isScan: true, span: 2, lines: [
            { name: 'Paracetamol 500 mg comprimido', lote: 'L-22910', qty: '600' },
            { name: 'Amoxicilina 500 mg cápsula', lote: 'L-22908', qty: '200' }
          ] },
          { label: 'Observaciones', isArea: true, span: 2, value: '', placeholder: 'Referencia al programa, período de consumo…' }
        ]
      },`,
  `      cuentas: {
        eyebrow: 'INTERFAZ 21 · MODAL SOBRE MOVIMIENTOS (FARMACIA)', title: 'Nuevo despacho a cuenta interna',
        width: '580px', cta: 'Emitir despacho', ctaBg: 'var(--brand-blue)',
        fields: [
          sel('Centro de costo', this.opcionesCentrosCosto(), 1),
          inp('Solicitante', 'Verónica Tapia'),
          sel('Lote a despachar', this.opcionesLotes(), 2),
          inp('Cantidad', '1'),
          { label: 'Observaciones', isArea: true, span: 2, value: '', placeholder: 'Referencia al programa, período de consumo…' }
        ]
      },`,
);

// ============================================================
// 11. Modal "vale" (vale de consumo, Farmacia): simplificado igual.
// ============================================================
reemplazar(
  `      vale: {
        eyebrow: 'INTERFAZ 21 · MODAL SOBRE MOVIMIENTOS (FARMACIA)', title: 'Nuevo vale de consumo',
        width: '560px', cta: 'Registrar vale', ctaBg: 'var(--brand-blue)',
        fields: [
          inp('Profesional solicitante', 'Dra. Paulina Ibáñez', 1),
          sel('Servicio', ['Urgencia', 'Medicina general', 'Matronería', 'Sala de procedimientos', 'Dental'], 1),
          { label: 'Fecha', isInput: true, inputType: 'date', value: '2026-09-15', span: 1 },
          sel('Centro de costo', ['CC-1042', 'CC-1052', 'CC-1053'], 1),
          { label: 'Ítems consumidos', isScan: true, span: 2, lines: [
            { name: 'Suero fisiológico 500 ml', lote: 'L-22884', qty: '8' },
            { name: 'Guantes de nitrilo talla M', lote: 'L-22879', qty: '40' },
            { name: 'Paracetamol 500 mg comprimido', lote: 'L-22910', qty: '30' }
          ] },
          note('El vale descuenta stock de la bodega de farmacia y carga el consumo al centro de costo del servicio.', 'info', 'info')
        ]
      },`,
  `      vale: {
        eyebrow: 'INTERFAZ 21 · MODAL SOBRE MOVIMIENTOS (FARMACIA)', title: 'Nuevo vale de consumo',
        width: '560px', cta: 'Registrar vale', ctaBg: 'var(--brand-blue)',
        fields: [
          inp('Profesional solicitante', 'Dra. Paulina Ibáñez', 1),
          sel('Servicio', ['Urgencia', 'Medicina general', 'Matronería', 'Sala de procedimientos', 'Dental'], 1),
          sel('Centro de costo', this.opcionesCentrosCosto(), 1),
          sel('Lote', this.opcionesLotes(), 1),
          inp('Cantidad', '1'),
          note('El vale descuenta stock de la bodega de farmacia y carga el consumo al centro de costo del servicio.', 'info', 'info')
        ]
      },`,
);

// ============================================================
// 12. Ficha "solicitar" (Farmacia: solicitud especial de
//     abastecimiento): Bodega/Centro de costo/Artículo con datos
//     reales; los dos únicos isInput de la ficha (Cantidad solicitada,
//     Observaciones) se corrigen para ser editables — mismo fix que
//     Código/Nombre del artículo, porque el <input> de la ficha ya
//     soporta onInput pero cada campo debe declararlo explícitamente.
// ============================================================
reemplazar(
  `        { title: 'Solicitud', icon: ic('send', 15), fields: [
          { label: 'Bodega solicitante', isSelect: true, options: [CENTROS[0], CENTROS[1], CENTROS[2], CENTROS[3]], span: 1 },
          { label: 'Centro de costo', isSelect: true, options: ['CC-1042', 'CC-1052', 'CC-1053'], span: 1 },
          { label: 'Artículo', isSelect: true, options: ['Amoxicilina 500 mg cápsula', 'Paracetamol 500 mg comprimido', 'Insulina NPH 100 UI/ml', 'Suero fisiológico 500 ml'], span: 2 },
          { label: 'Cantidad solicitada', isInput: true, value: '1.200', span: 1 },
          { label: 'Urgencia', isSelect: true, options: ['Alta · quiebre de stock', 'Media · bajo stock mínimo', 'Baja · reposición programada'], span: 1 },
          { label: 'Motivo', isSelect: true, options: ['Quiebre de stock', 'Aumento de demanda', 'Campaña o programa específico', 'Reemplazo por merma'], span: 2 },
          { label: 'Observaciones para la Droguería', isInput: true, value: 'Consumo duplicado por campaña de invierno en el sector norte.', span: 2 }
        ] }`,
  `        { title: 'Solicitud', icon: ic('send', 15), fields: [
          { label: 'Bodega solicitante', isSelect: true, options: this.opcionesBodegas(), span: 1 },
          { label: 'Centro de costo', isSelect: true, options: this.opcionesCentrosCosto(), span: 1 },
          { label: 'Artículo', isSelect: true, options: this.opcionesArticulos(), span: 2 },
          { label: 'Cantidad solicitada', isInput: true, value: (this.state.form && this.state.form['Cantidad solicitada'] !== undefined) ? this.state.form['Cantidad solicitada'] : '1.200', onInput: (e) => this.setState(s => ({ form: Object.assign({}, s.form, { 'Cantidad solicitada': e.target.value }) })), span: 1 },
          { label: 'Urgencia', isSelect: true, options: ['Alta · quiebre de stock', 'Media · bajo stock mínimo', 'Baja · reposición programada'], span: 1 },
          { label: 'Motivo', isSelect: true, options: ['Quiebre de stock', 'Aumento de demanda', 'Campaña o programa específico', 'Reemplazo por merma'], span: 2 },
          { label: 'Observaciones para la Droguería', isInput: true, value: (this.state.form && this.state.form['Observaciones para la Droguería'] !== undefined) ? this.state.form['Observaciones para la Droguería'] : 'Consumo duplicado por campaña de invierno en el sector norte.', onInput: (e) => this.setState(s => ({ form: Object.assign({}, s.form, { 'Observaciones para la Droguería': e.target.value }) })), span: 2 }
        ] }`,
);

lines[TEMPLATE_LINE] = JSON.stringify(template).replace(/<\//g, "<\\/");
fs.writeFileSync(filePath, lines.join("\n"));
console.log("OK. Abastecimiento/Farmacia/Análisis/Exportación cableados:", filePath);
