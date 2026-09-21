// Paso 8: inventario() con datos reales — tab "Toma de inventario"
// (GET /api/inventario/tomas) y tab "Ajustes" (GET
// /api/inventario/lotes-vencidos), y cablea retirarLotesVencidos.
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
    throw new Error("No se encontró el texto exacto (inventario):\n" + desde.slice(0, 300));
  }
  template = template.replace(desde, hasta);
}

const DESDE = `  inventario(farmacia) {
    const t = this.state.tab;
    const bod = farmacia ? 'Bodega farmacia · CESFAM Raúl Cuevas' : 'Bodega general · Droguería Comunal';
    const base = {
      isList: true,
      eyebrow: farmacia ? 'FARMACIA · INTERFAZ 22' : 'DROGUERÍA · INTERFAZ 17',
      title: farmacia ? 'Inventario (Farmacia)' : 'Inventario',
      secondary: [{ label: 'Exportar', icon: ic('download', 13), fn: 'exportarInventario' }, { label: 'Imprimir', icon: ic('printer', 13), fn: 'imprimirInventario' }],
      tabs: [{ label: 'Toma de inventario', count: 1, i: 0 }, { label: 'Ajustes', count: 23, i: 1 }]
    };
    if (t === 1) return Object.assign(base, {
      req: 'Anexo N°4 · retirar productos vencidos y configurar stocks máx/mín masivamente',
      primary: null,
      searchPlaceholder: 'Buscar por artículo o lote',
      filters: [{ label: 'Estado', value: 'Vencidos', icon: ic('filter', 13) }],
      panels: [
        { icon: ic('trash', 15), title: 'Retirar productos vencidos', text: 'La lista se genera automáticamente con los lotes cuya fecha de vencimiento ya pasó. Selecciona los que se retiran físicamente y el sistema descuenta el stock y registra la merma.', cta: 'Retirar seleccionados (3)', ctaBg: 'var(--danger)', cta2: 'Seleccionar todos', cta2Fn: 'seleccionarTodosLotesVencidos', go: this.open('retiro') },
        { icon: ic('upload', 15), title: 'Configurar stock mín/máx masivo', text: 'Carga una planilla con código de artículo, stock mínimo y stock máximo por bodega. El sistema valida cada fila antes de aplicar los cambios.', isUpload: true, fileHint: 'stock-min-max-sep2026.xlsx · 34 KB', uploadFn: 'seleccionarArchivoStockMasivo', cta: 'Validar y aplicar', ctaBg: 'var(--brand-blue)', go: this.open('masivo') }
      ],
      columns: cols('', 'Artículo', 'Lote', 'Vencimiento', 'Bodega', ['Stock', 'right'], 'Estado'),
      rows: [
        [true, 'Metformina 850 mg comprimido', 'Medicamentos / Antidiabéticos', 'L-22712', '30 ago 2026', bod, '1.200', ['VENCIDO', 'bad']],
        [true, 'Amoxicilina 500 mg cápsula', 'Medicamentos / Antibióticos', 'L-22690', '15 ago 2026', bod, '640', ['VENCIDO', 'bad']],
        [true, 'Paracetamol 500 mg comprimido', 'Medicamentos / Analgésicos', 'L-22410', '20 ago 2026', bod, '3.600', ['VENCIDO', 'bad']],
        [false, 'Suero fisiológico 500 ml', 'Insumos / Soluciones', 'L-22388', '02 sep 2026', bod, '180', ['VENCIDO', 'bad']],
        [false, 'Insulina NPH 100 UI/ml', 'Medicamentos / Cadena de frío', 'L-22301', '28 ago 2026', 'Bodega refrigerada 1', '90', ['VENCIDO', 'bad']]
      ].map(r => ({
        cells: [chk(r[0]), stack(r[1], r[2]), mono(r[3]), txt(r[4]), txt(r[5]), mono(r[6], 'right'), badge(r[7][0], r[7][1])],
        actions: [{ icon: ic('info', 14), title: 'Ver lote', go: () => this.setState({ drawer: true }) }]
      })),
      footer: 'Mostrando 5 de 23 lotes vencidos · el retiro queda registrado en el log de auditoría'
    });
    return Object.assign(base, {
      req: 'Anexo N°4 · realizar toma de inventario con trazabilidad completa',
      primary: { label: 'Iniciar toma de inventario', modal: 'toma' },
      searchPlaceholder: 'Buscar por artículo o lote',
      filters: [{ label: 'Toma', value: 'TI-0042 · en curso', icon: ic('clipboard', 13) }, { label: 'Bodega', value: farmacia ? 'Farmacia' : 'General', icon: ic('warehouse', 13) }],
      banner: { bg: B.warn[0], border: B.warn[2], fg: B.warn[1], icon: ic('clock', 15), text: 'Toma de inventario TI-0042 en curso desde el 14 sep 2026, 08:30. Mientras esté abierta, los movimientos de esta bodega quedan bloqueados.' },
      columns: cols('Artículo', 'Lote', ['Stock sistema', 'right'], ['Stock físico', 'right'], ['Diferencia', 'right'], 'Estado'),
      rows: [
        ['Paracetamol 500 mg comprimido', 'Medicamentos / Analgésicos', 'L-22910', '12.000', '12.000', '0', 'ok', ['CUADRA', 'ok']],
        ['Amoxicilina 500 mg cápsula', 'Medicamentos / Antibióticos', 'L-22908', '6.400', '6.380', '−20', 'bad', ['DIFERENCIA', 'bad']],
        ['Fentanilo 0,05 mg/ml ampolla', 'Medicamentos / Controlados', 'L-22903', '240', '240', '0', 'ok', ['CUADRA', 'ok']],
        ['Suero fisiológico 500 ml', 'Insumos / Soluciones', 'L-22884', '2.200', '2.240', '+40', 'warn', ['DIFERENCIA', 'warn']],
        ['Guantes de nitrilo talla M', 'Insumos / Protección', 'L-22879', '18.000', '18.000', '0', 'ok', ['CUADRA', 'ok']],
        ['Insulina NPH 100 UI/ml', 'Medicamentos / Cadena de frío', 'L-22887', '320', '—', '—', 'neutral', ['PENDIENTE', 'neutral']],
        ['Metformina 850 mg comprimido', 'Medicamentos / Antidiabéticos', 'L-22874', '9.600', '9.600', '0', 'ok', ['CUADRA', 'ok']]
      ].map(r => ({
        cells: [stack(r[0], r[1]), mono(r[2]), mono(r[3], 'right'), mono(r[4], 'right'), mono(r[5], 'right', B[r[6]][1]), badge(r[7][0], r[7][1])],
        actions: [{ icon: ic('pencil', 14), title: 'Ajustar conteo', go: this.open('toma') }]
      })),
      footer: 'Mostrando 7 de 412 artículos contados · 2 diferencias por resolver'
    });
  }`;

const HASTA = `  inventario(farmacia) {
    const t = this.state.tab;
    const base = {
      isList: true,
      eyebrow: farmacia ? 'FARMACIA · INTERFAZ 22' : 'DROGUERÍA · INTERFAZ 17',
      title: farmacia ? 'Inventario (Farmacia)' : 'Inventario',
      secondary: [{ label: 'Exportar', icon: ic('download', 13), fn: 'exportarInventario' }, { label: 'Imprimir', icon: ic('printer', 13), fn: 'imprimirInventario' }],
      tabs: [{ label: 'Toma de inventario', count: (this.state.listas.inventario_tomas || []).length, i: 0 }, { label: 'Ajustes', count: (this.state.listas.inventario_vencidos || []).length, i: 1 }]
    };
    if (t === 1) {
      const vencidos = this.cargarLista('inventario_vencidos', '/api/inventario/lotes-vencidos');
      return Object.assign(base, {
        req: 'Anexo N°4 · retirar productos vencidos y configurar stocks máx/mín masivamente',
        primary: null,
        searchPlaceholder: 'Buscar por artículo o lote',
        filters: [],
        panels: [
          { icon: ic('upload', 15), title: 'Configurar stock mín/máx masivo', text: 'Carga una planilla real (.xlsx) con columnas codigo_interno | bodega | stock_minimo | stock_maximo | stock_critico. El sistema valida cada fila y aplica los cambios de inmediato.', isUpload: true, fileHint: 'Elegir archivo .xlsx', uploadFn: 'seleccionarArchivoStockMasivo', cta: 'Configurar', ctaBg: 'var(--brand-blue)', go: () => this.elegirArchivo('seleccionarArchivoStockMasivo') }
        ],
        columns: cols('Artículo', 'Lote', 'Vencimiento', 'Bodega', ['Stock', 'right']),
        rows: vencidos.map(v => {
          const articulo = this.desanidar(v.articulo);
          const bodega = this.desanidar(v.bodega);
          return {
            cells: [txt(articulo ? articulo.nombre : '—'), mono(v.numero_lote), txt(v.fecha_vencimiento), txt(bodega ? bodega.nombre : '—'), mono(v.cantidad_disponible, 'right')],
            actions: [{ icon: ic('trash', 14), title: 'Retirar', go: () => { this.setState({ loteVencidoSeleccionado: v }); this.open('retiro')(); } }]
          };
        }),
        footer: 'Mostrando ' + vencidos.length + ' lotes vencidos reales · el retiro queda registrado en el log de auditoría'
      });
    }
    const tomas = this.cargarLista('inventario_tomas', '/api/inventario/tomas');
    return Object.assign(base, {
      req: 'Anexo N°4 · realizar toma de inventario con trazabilidad completa',
      primary: { label: 'Iniciar toma de inventario', modal: 'toma' },
      searchPlaceholder: 'Buscar por bodega o responsable',
      filters: [],
      columns: cols('Bodega', 'Alcance', 'Responsable', 'Estado', 'Fecha inicio'),
      rows: tomas.map(tm => {
        const bodega = this.desanidar(tm.bodega);
        return {
          cells: [txt(bodega ? bodega.nombre : '—'), txt(tm.alcance), txt(tm.responsable || '—'), badge(tm.estado, tm.estado === 'cerrada' ? 'ok' : 'warn'), txt(this.fechaCorta(tm.fecha_inicio))],
          actions: []
        };
      }),
      footer: 'Mostrando ' + tomas.length + ' tomas de inventario reales'
    });
  }`;

reemplazar(DESDE, HASTA);

// Cablear retirarLotesVencidos con el lote real seleccionado en la
// tabla de vencidos.
reemplazar(
  `  retirarLotesVencidos:  p => mockRequest('retirarLotesVencidos', 'POST', '/inventario/retiros', p, 'Lotes vencidos retirados'),`,
  `  retirarLotesVencidos:  p => apiFetch('POST', '/inventario/retiros', p, 'Lote vencido retirado'),`,
);
reemplazar(
  `      retiro: {
        eyebrow: 'INTERFAZ 17b · RETIRO DE PRODUCTOS VENCIDOS', title: 'Retirar 3 lotes vencidos',
        sub: 'Metformina L-22712 · Amoxicilina L-22690 · Paracetamol L-22410',
        width: '520px', cta: 'Confirmar retiro', ctaBg: 'var(--danger)',
        fields: [
          { label: 'Unidades a retirar', isRead: true, value: '5.440 unidades en 3 lotes', span: 1 },
          { label: 'Valorización de la merma', isRead: true, value: '$1,9M', span: 1 },
          sel('Destino del retiro', ['Eliminación por empresa autorizada', 'Devolución a proveedor', 'Cuarentena interna'], 2),
          inp('N° de acta de eliminación', 'ACT-2026-118', 2),
          { label: 'Observaciones', isArea: true, span: 2, value: '', placeholder: 'Responsable presente, condiciones del retiro…' },
          note('El stock se descuenta al confirmar y el movimiento queda en el log de auditoría como merma autorizada.', 'warn', 'alert')
        ]
      },`,
  `      retiro: {
        eyebrow: 'INTERFAZ 17b · RETIRO DE PRODUCTOS VENCIDOS', title: 'Retirar lote vencido',
        sub: this.state.loteVencidoSeleccionado ? (this.state.loteVencidoSeleccionado.numero_lote + ' · ' + this.state.loteVencidoSeleccionado.cantidad_disponible + ' unidades disponibles') : 'Selecciona un lote desde la pestaña Ajustes',
        width: '520px', cta: 'Confirmar retiro', ctaBg: 'var(--danger)',
        fields: [
          inp('Cantidad', this.state.loteVencidoSeleccionado ? String(this.state.loteVencidoSeleccionado.cantidad_disponible) : ''),
          { label: 'Observaciones', isArea: true, span: 2, value: '', placeholder: 'Responsable presente, condiciones del retiro…' },
          note('El stock se descuenta al confirmar y el movimiento queda en el log de auditoría como ajuste.', 'warn', 'alert')
        ]
      },`,
);
reemplazar(
  `    if (nombre === 'registrarRecepcionOD') {`,
  `    if (nombre === 'retirarLotesVencidos') {
      const lote = this.state.loteVencidoSeleccionado;
      return {
        id_lote: lote && lote.id_lote,
        cantidad: this.numero(leerModal('Cantidad')),
        motivo: leerModal('Observaciones')
      };
    }
    if (nombre === 'registrarRecepcionOD') {`,
);
reemplazar(
  `const CON_PAYLOAD_PROPIO = ['guardarArticulo', 'guardarProveedor', 'registrarRecepcion', 'emitirDespacho', 'registrarTraspaso', 'recibirTraspaso', 'generarOrdenAbastecimiento', 'enviarSolicitudAbastecimiento', 'registrarDonacion', 'emitirDespachoInterno', 'registrarValeConsumo', 'registrarRecepcionOD'];`,
  `const CON_PAYLOAD_PROPIO = ['guardarArticulo', 'guardarProveedor', 'registrarRecepcion', 'emitirDespacho', 'registrarTraspaso', 'recibirTraspaso', 'generarOrdenAbastecimiento', 'enviarSolicitudAbastecimiento', 'registrarDonacion', 'emitirDespachoInterno', 'registrarValeConsumo', 'registrarRecepcionOD', 'retirarLotesVencidos'];`,
);

lines[TEMPLATE_LINE] = JSON.stringify(template).replace(/<\//g, "<\\/");
fs.writeFileSync(filePath, lines.join("\n"));
console.log("OK. Paso 8 (inventario) aplicado:", filePath);
