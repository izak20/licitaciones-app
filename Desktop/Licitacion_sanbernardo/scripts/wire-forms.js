// One-off script: cablea los formularios de Maestros (artículo,
// proveedor) y Movimientos (recepción, despacho, traspaso, recibir
// traspaso, vías de administración) para que capturen datos reales del
// DOM y usen listas de referencia reales (bodegas/artículos/
// proveedores/centros de costo/lotes) en vez de texto de mockup.
//
// Estrategia: el mockup es 100% no controlado (sin onChange en ningún
// input de todo el archivo). En vez de reescribir su motor de
// templates custom (sc-if/sc-for/{{ }}), se lee el DOM en el momento
// del submit (por texto de <label>), y las listas desplegables pasan a
// alimentarse de datos reales ya cargados en el estado del componente.
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

function reemplazar(desde, hasta, { required = true } = {}) {
  if (!template.includes(desde)) {
    if (required) throw new Error("No se encontró el texto exacto:\n" + desde);
    return;
  }
  template = template.replace(desde, hasta);
}

// 1. Estado inicial: listas de referencia + últimos ids creados en la sesión.
reemplazar(
  `  state = {
    screen: 'app', page: 'movimientos', tab: 0, modal: null, drawer: false,
    dd: null, role: 'Administrador', bodega: 'Todas (49)', query: '', toggle: true, frio: false,
    w: typeof window !== 'undefined' ? window.innerWidth : 1440, navOpen: false, showPass: false,
    toast: null, estadoOverride: null
  };`,
  `  state = {
    screen: 'app', page: 'movimientos', tab: 0, modal: null, drawer: false,
    dd: null, role: 'Administrador', bodega: 'Todas (49)', query: '', toggle: true, frio: false,
    w: typeof window !== 'undefined' ? window.innerWidth : 1440, navOpen: false, showPass: false,
    toast: null, estadoOverride: null,
    refBodegas: [], refArticulos: [], refProveedores: [], refCentrosCosto: [], refLotes: [],
    viasActivas: null, ultimoArticuloId: null, ultimoTraspasoId: null
  };`,
);

// 2. run(): agrega un hook opcional onOk(data) tras un éxito, sin tocar
// el comportamiento existente de las ~50 acciones que no lo usan.
reemplazar(
  `  run = (nombre, payload, opts) => () => {
    const o = opts || {};
    const fn = API[nombre];
    if (!fn) { console.warn('[API] función no definida: ' + nombre); return; }
    clearTimeout(this._toastTimer);
    this.setState({ toast: { fn: nombre, estado: 'cargando', mensaje: o.cargando || 'Procesando…' }, dd: null });
    fn(payload).then(res => {
      this.setState(st => ({
        toast: { fn: nombre, estado: res.ok ? 'ok' : 'error', mensaje: res.mensaje },
        modal: o.mantenerModal ? st.modal : null,
        drawer: o.mantenerModal ? st.drawer : false
      }));
      this._toastTimer = setTimeout(() => this.setState({ toast: null }), 3400);
    });
  };`,
  `  run = (nombre, payload, opts) => () => {
    const o = opts || {};
    const fn = API[nombre];
    if (!fn) { console.warn('[API] función no definida: ' + nombre); return; }
    clearTimeout(this._toastTimer);
    this.setState({ toast: { fn: nombre, estado: 'cargando', mensaje: o.cargando || 'Procesando…' }, dd: null });
    fn(payload).then(res => {
      this.setState(st => ({
        toast: { fn: nombre, estado: res.ok ? 'ok' : 'error', mensaje: res.mensaje },
        modal: o.mantenerModal ? st.modal : null,
        drawer: o.mantenerModal ? st.drawer : false
      }));
      if (res.ok && o.onOk) o.onOk(res.data);
      this._toastTimer = setTimeout(() => this.setState({ toast: null }), 3400);
    });
  };`,
);

// 3. componentDidMount: cargar listas de referencia reales al montar.
reemplazar(
  `  componentDidMount() {
    if ((this.props.startScreen || 'Aplicación') === 'Login') this.setState({ screen: 'login' });
    window.addEventListener('resize', this.measure);
    this.measure();
  }`,
  `  componentDidMount() {
    if ((this.props.startScreen || 'Aplicación') === 'Login') this.setState({ screen: 'login' });
    window.addEventListener('resize', this.measure);
    this.measure();
    this.cargarReferencias();
  }

  // ============================================================
  // Cableado a datos reales (Maestros + Movimientos): carga listas de
  // referencia, lee el DOM del modal/ficha abierto al enviar, y arma
  // el payload real que espera cada endpoint.
  // ============================================================
  cargarReferencias = () => {
    const cargar = (ruta) => fetch(ruta).then(r => r.json()).then(d => d.data || []).catch(() => []);
    Promise.all([
      cargar('/api/bodegas'), cargar('/api/articulos'), cargar('/api/proveedores'),
      cargar('/api/centros-costo'), cargar('/api/lotes')
    ]).then(([refBodegas, refArticulos, refProveedores, refCentrosCosto, refLotes]) => {
      this.setState({ refBodegas, refArticulos, refProveedores, refCentrosCosto, refLotes });
    });
  };

  etiquetaLote = (l) => {
    const art = l.articulo || {};
    const bod = l.bodega || {};
    return (art.nombre || '?') + ' — Lote ' + l.numero_lote + ' — ' + (bod.nombre || '?') + ' (' + l.cantidad_disponible + ' disp.)';
  };

  opcionesBodegas = () => (this.state.refBodegas || []).map(b => b.nombre);
  opcionesArticulos = () => (this.state.refArticulos || []).map(a => a.nombre);
  opcionesProveedores = () => (this.state.refProveedores || []).map(p => p.razon_social);
  opcionesCentrosCosto = () => (this.state.refCentrosCosto || []).map(c => c.codigo + ' · ' + c.nombre);
  opcionesLotes = () => (this.state.refLotes || []).map(this.etiquetaLote);

  leerCampo = (raiz, label) => {
    if (!raiz) return undefined;
    const labels = Array.from(raiz.querySelectorAll('label'));
    const lbl = labels.find(l => l.textContent.trim() === label);
    if (!lbl) return undefined;
    const campo = lbl.parentElement.querySelector('input, select, textarea');
    return campo ? campo.value : undefined;
  };

  numero = (texto) => {
    if (texto === undefined || texto === null || texto === '') return undefined;
    const limpio = String(texto).replace(/[^0-9,.-]/g, '').replace(/\\.(?=\\d{3}(\\D|$))/g, '').replace(',', '.');
    const n = parseFloat(limpio);
    return isNaN(n) ? undefined : n;
  };

  recolectarPayload = (nombre) => {
    const modalRoot = document.querySelector('[data-modal-container]');
    const fichaRoot = document.querySelector('[data-ficha-container]');
    const leerModal = (label) => this.leerCampo(modalRoot, label);
    const leerFicha = (label) => this.leerCampo(fichaRoot, label);

    if (nombre === 'guardarArticulo') {
      const trazabilidad = leerFicha('Trazabilidad') || '';
      return {
        codigo_interno: leerFicha('Código'),
        nombre: leerFicha('Nombre del artículo'),
        grupo: leerFicha('Grupo'),
        familia: leerFicha('Familia'),
        subfamilia: leerFicha('Subfamilia'),
        unidad_medida: leerFicha('Unidad de medida'),
        es_controlado: !!this.state.toggle,
        requiere_cadena_frio: !!this.state.frio,
        requiere_lote: trazabilidad !== 'Sin trazabilidad'
      };
    }
    if (nombre === 'guardarProveedor') {
      return {
        rut: leerModal('RUT'),
        razon_social: leerModal('Razón social'),
        direccion: leerModal('Dirección'),
        telefono: leerModal('Teléfono'),
        email: leerModal('Correo'),
        nombre_ejecutivo: leerModal('Ejecutivo de cuenta'),
        telefono_ejecutivo: leerModal('Contacto del ejecutivo')
      };
    }
    if (nombre === 'registrarRecepcion') {
      const proveedor = (this.state.refProveedores || []).find(p => p.razon_social === leerModal('Proveedor'));
      const bodega = (this.state.refBodegas || []).find(b => b.nombre === leerModal('Bodega de destino'));
      const articulo = (this.state.refArticulos || []).find(a => a.nombre === leerModal('Artículo'));
      return {
        id_bodega: bodega && bodega.id_bodega,
        id_articulo: articulo && articulo.id_articulo,
        id_proveedor: proveedor && proveedor.id_proveedor,
        numero_lote: leerModal('Lote'),
        fecha_vencimiento: leerModal('Fecha de vencimiento'),
        cantidad: this.numero(leerModal('Cantidad recibida'))
      };
    }
    if (nombre === 'emitirDespacho') {
      const lote = (this.state.refLotes || []).find(l => this.etiquetaLote(l) === leerModal('Lote a despachar'));
      const centro = (this.state.refCentrosCosto || []).find(c => (c.codigo + ' · ' + c.nombre) === leerModal('Centro de costo'));
      return {
        id_lote: lote && lote.id_lote,
        id_bodega_origen: lote && lote.id_bodega,
        id_centro_costo: centro && centro.id_centro_costo,
        cantidad: this.numero(leerModal('Cantidad a despachar')),
        observacion: leerModal('Observaciones')
      };
    }
    if (nombre === 'registrarTraspaso') {
      const lote = (this.state.refLotes || []).find(l => this.etiquetaLote(l) === leerModal('Lote de origen'));
      const destino = (this.state.refBodegas || []).find(b => b.nombre === leerModal('Bodega destino'));
      return {
        id_lote: lote && lote.id_lote,
        id_bodega_origen: lote && lote.id_bodega,
        id_bodega_destino: destino && destino.id_bodega,
        cantidad: this.numero(leerModal('Cantidad')),
        observacion: leerModal('Motivo')
      };
    }
    if (nombre === 'recibirTraspaso') {
      return {
        id: this.state.ultimoTraspasoId,
        con_reparos: !this.state.toggle,
        observacion: leerModal('Observaciones')
      };
    }
    return undefined;
  };

  mostrarError = (fn, mensaje) => {
    clearTimeout(this._toastTimer);
    this.setState({ toast: { fn, estado: 'error', mensaje } });
    this._toastTimer = setTimeout(() => this.setState({ toast: null }), 3400);
  };

  submitAccion = (nombre) => () => {
    const CON_PAYLOAD_PROPIO = ['guardarArticulo', 'guardarProveedor', 'registrarRecepcion', 'emitirDespacho', 'registrarTraspaso', 'recibirTraspaso'];
    if (nombre === 'recibirTraspaso' && !this.state.ultimoTraspasoId) {
      this.mostrarError(nombre, 'Primero registra un traspaso en esta sesión para poder confirmarlo.');
      return;
    }
    if (!CON_PAYLOAD_PROPIO.includes(nombre)) {
      this.run(nombre)();
      return;
    }
    const payload = this.recolectarPayload(nombre);
    const opts = {};
    if (nombre === 'registrarTraspaso') {
      opts.onOk = (data) => {
        const id = Array.isArray(data) && data[0] && data[0].id_movimiento;
        if (id) this.setState({ ultimoTraspasoId: id });
      };
    }
    if (nombre === 'guardarArticulo') {
      opts.onOk = (data) => {
        if (data && data.id_articulo) this.setState({ ultimoArticuloId: data.id_articulo });
      };
    }
    this.run(nombre, payload, opts)();
  };

  toggleVia = (label) => {
    const actuales = this.state.viasActivas || VIAS_INICIALES;
    const nuevas = Object.assign({}, actuales, { [label]: !actuales[label] });
    this.setState({ viasActivas: nuevas });
    if (!this.state.ultimoArticuloId) {
      this.mostrarError('actualizarViaAdministracion', 'Primero guarda un artículo en esta sesión para poder configurar sus vías.');
      return;
    }
    const activas = Object.keys(nuevas).filter(k => nuevas[k]);
    this.run('actualizarViaAdministracion', { id: this.state.ultimoArticuloId, vias: activas }, { mantenerModal: true })();
  };`,
);

// 4. Constante con las vías por defecto (usada por state.viasActivas).
reemplazar(
  `const API_BASE = '/api';`,
  `const VIAS_INICIALES = { Oral: true, Intravenosa: false, Intramuscular: false, 'Subcutánea': false, 'Tópica': false, Rectal: true };
const API_BASE = '/api';`,
);

// 5. Chips de vías: ahora se derivan de state.viasActivas y llaman a
// toggleVia() en vez de disparar un payload fijo con datos de mockup.
reemplazar(
  `            { label: 'Vías habilitadas', isChips: true, span: 2, chips: [
              { label: 'Oral', on: true }, { label: 'Intravenosa', on: false }, { label: 'Intramuscular', on: false },
              { label: 'Subcutánea', on: false }, { label: 'Tópica', on: false }, { label: 'Rectal', on: true }
            ].map(c => ({
              label: c.label, go: this.run('actualizarViaAdministracion', { via: c.label, activa: !c.on }, { mantenerModal: true }),
              bg: c.on ? 'var(--brand-blue-050)' : 'var(--surface)',
              border: c.on ? 'var(--brand-blue-300)' : 'var(--border-2)',
              fg: c.on ? 'var(--brand-blue)' : 'var(--fg-2)',
              weight: c.on ? '600' : '400',
              checkOpacity: c.on ? '1' : '0.25'
            })) },`,
  `            { label: 'Vías habilitadas', isChips: true, span: 2, chips: Object.keys(this.state.viasActivas || VIAS_INICIALES).map(label => ({ label, on: (this.state.viasActivas || VIAS_INICIALES)[label] })).map(c => ({
              label: c.label, go: () => this.toggleVia(c.label),
              bg: c.on ? 'var(--brand-blue-050)' : 'var(--surface)',
              border: c.on ? 'var(--brand-blue-300)' : 'var(--border-2)',
              fg: c.on ? 'var(--brand-blue)' : 'var(--fg-2)',
              weight: c.on ? '600' : '400',
              checkOpacity: c.on ? '1' : '0.25'
            })) },`,
);

// 6. Selects de la recepción: opciones reales en vez de texto de mockup.
reemplazar(
  `          sel('Proveedor', ['Laboratorio Chile S.A.', 'Laboratorios Saval S.A.', 'Laboratorio Sanderson S.A.'], 2),
          inp('N° de factura o guía', '4412908'), sel('Bodega de destino', ['Bodega general', 'Bodega controlados', 'Bodega refrigerada 1'], 1),
          sel('Artículo', ['Paracetamol 500 mg comprimido', 'Amoxicilina 500 mg cápsula', 'Fentanilo 0,05 mg/ml ampolla'], 2),`,
  `          sel('Proveedor', this.opcionesProveedores(), 2),
          inp('N° de factura o guía', '4412908'), sel('Bodega de destino', this.opcionesBodegas(), 1),
          sel('Artículo', this.opcionesArticulos(), 2),`,
);

// 7. Despacho: simplificado a lo que el endpoint real soporta (un lote
// por despacho — no hay columnas de transporte en el esquema, y el
// endpoint no maneja múltiples ítems por llamada).
reemplazar(
  `        fields: [
          sel('Centro de salud de destino', CENTROS.slice(0, 4), 1), sel('Centro de costo', ['CC-1042', 'CC-1043', 'CC-1044', 'CC-1051'], 1),
          { label: 'Ítems a despachar', isScan: true, span: 2, lines: [
            { name: 'Paracetamol 500 mg comprimido', lote: 'L-22910', qty: '4.000' },
            { name: 'Amoxicilina 500 mg cápsula', lote: 'L-22908', qty: '1.200' },
            { name: 'Suero fisiológico 500 ml', lote: 'L-22884', qty: '300' }
          ] },
          inp('RUT empresa de transporte', '76.412.900-1'), inp('RUT del chofer', '13.882.401-9'),
          inp('Nombre del chofer', 'Jaime Sepúlveda'), inp('Patente del vehículo', 'KXPR-42'),
          { label: 'Observaciones', isArea: true, span: 2, value: '', placeholder: 'Indicaciones de entrega, horarios, contacto en destino…' }
        ]
      },
      traspaso: {`,
  `        fields: [
          sel('Lote a despachar', this.opcionesLotes(), 2),
          sel('Centro de costo', this.opcionesCentrosCosto(), 2),
          inp('Cantidad a despachar', '1'),
          { label: 'Observaciones', isArea: true, span: 2, value: '', placeholder: 'Indicaciones de entrega, horarios, contacto en destino…' }
        ]
      },
      traspaso: {`,
);

// 8. Traspaso: simplificado — el lote de origen ya trae implícita su
// bodega y artículo, así que se elimina la redundancia.
reemplazar(
  `        fields: [
          sel('Bodega origen', ['Bodega general', 'Bodega controlados', 'Bodega refrigerada 1'], 1),
          sel('Bodega destino', ['Bodega controlados', 'Bodega refrigerada 2', 'Bodega insumos'], 1),
          sel('Artículo', ['Fentanilo 0,05 mg/ml ampolla', 'Insulina NPH 100 UI/ml'], 2),
          inp('Lote', 'L-22903'), inp('Cantidad', '120'),
          { label: 'Motivo', isArea: true, span: 2, value: '', placeholder: 'Reubicación por condiciones de almacenamiento…' }
        ]
      },
      recibir: {`,
  `        fields: [
          sel('Lote de origen', this.opcionesLotes(), 2),
          sel('Bodega destino', this.opcionesBodegas(), 2),
          inp('Cantidad', '120'),
          { label: 'Motivo', isArea: true, span: 2, value: '', placeholder: 'Reubicación por condiciones de almacenamiento…' }
        ]
      },
      recibir: {`,
);

// 9. saveGo / modalSubmit: recolectar el payload real al momento del
// click en vez de fijarlo (indefinido) en tiempo de render.
reemplazar(
  `      saveGo: this.run(page.saveFn || 'guardarArticulo'),`,
  `      saveGo: this.submitAccion(page.saveFn || 'guardarArticulo'),`,
);
reemplazar(
  `      modalSubmit: this.run(MODAL_ACTIONS[s.modal] || 'guardarUsuario'),`,
  `      modalSubmit: this.submitAccion(MODAL_ACTIONS[s.modal] || 'guardarUsuario'),`,
);

// 10. Atributos data- para poder ubicar el DOM del modal/ficha abiertos
// al leer los valores (edición aditiva, no toca la lógica de sc-if/sc-for).
reemplazar(
  `<div style="position:fixed;inset:0;z-index:90;display:flex;align-items:flex-start;justify-content:center;padding:{{ modalOuterPad }};overflow-y:auto">`,
  `<div data-modal-container style="position:fixed;inset:0;z-index:90;display:flex;align-items:flex-start;justify-content:center;padding:{{ modalOuterPad }};overflow-y:auto">`,
);
reemplazar(
  `<div style="display:grid;grid-template-columns:{{ fichaCols }};gap:16px;align-items:start">`,
  `<div data-ficha-container style="display:grid;grid-template-columns:{{ fichaCols }};gap:16px;align-items:start">`,
);

lines[TEMPLATE_LINE] = JSON.stringify(template).replace(/<\//g, "<\\/");
fs.writeFileSync(filePath, lines.join("\n"));
console.log("OK. Formularios cableados:", filePath);
