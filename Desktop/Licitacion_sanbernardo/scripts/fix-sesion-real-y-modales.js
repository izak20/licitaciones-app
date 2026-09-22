// El usuario reportó que al iniciar sesión el nombre/perfil que se ve
// en la barra lateral es fijo ("Marcela Orellana", perfil "Administrador"
// seleccionable a mano), no la sesión real. Además, tres acciones reales
// (devolución a proveedor, registrar temperatura, iniciar toma de
// inventario) tenían un backend ya construido pero el frontend seguía
// llamando a mockRequest con datos de ejemplo hardcodeados en vez de
// leer los combos reales (bodegas/lotes) y llamar a la API real.
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
    throw new Error("No se encontró el texto exacto (sesión real):\n" + desde.slice(0, 400));
  }
  template = template.replace(desde, hasta);
}

// 1. Mapa de nombres de perfil real (tabla `perfil`) -> etiqueta de rol
// que usa el frontend para filtrar el menú (NAV / roleOptions).
reemplazar(
  `const ROLES = ['Administrador', 'Droguería', 'Finanzas', 'Cliente Interno'];`,
  `const ROLES = ['Administrador', 'Droguería', 'Finanzas', 'Cliente Interno'];
const PERFIL_A_ROL = {
  'Administrador': 'Administrador',
  'Usuario Droguería': 'Droguería',
  'Usuario Finanzas': 'Finanzas',
  'Cliente Interno': 'Cliente Interno'
};`,
);

// 2. Estado: nombre/iniciales reales del usuario conectado (se llenan
// al montar, ver cargarUsuarioActual). Placeholder neutro mientras
// carga, en vez del nombre de ejemplo fijo.
reemplazar(
  `    dd: null, role: 'Administrador', bodega: 'Todas', query: '', toggle: true, frio: false,`,
  `    dd: null, role: 'Administrador', nombreUsuario: 'Usuario', iniciales: '•', bodega: 'Todas', query: '', toggle: true, frio: false,`,
);

// 3. Cargar la sesión real al montar, junto a las referencias.
reemplazar(
  `    this.cargarReferencias();
  }`,
  `    this.cargarReferencias();
    this.cargarUsuarioActual();
  }`,
);

// 4. Método que trae la identidad real desde /api/auth/me y fija el
// nombre, las iniciales y el rol real (ya no seleccionable a mano).
reemplazar(
  `  opcionesPerfiles = () => (this.state.refPerfiles || []).map(p => p.nombre);`,
  `  cargarUsuarioActual = () => {
    fetch('/api/auth/me').then(r => r.json()).then(d => {
      const u = d && d.data;
      if (!u) return;
      const nombre = u.nombre_completo || u.email || 'Usuario';
      const iniciales = nombre.split(' ').filter(Boolean).slice(0, 2).map(p => p[0]).join('').toUpperCase() || 'U';
      const perfilNombre = u.perfil && u.perfil.nombre;
      const role = PERFIL_A_ROL[perfilNombre] || 'Administrador';
      this.setState({ nombreUsuario: nombre, iniciales, role });
    }).catch(() => {});
  };
  opcionesPerfiles = () => (this.state.refPerfiles || []).map(p => p.nombre);`,
);

// 5. Exponer nombreUsuario/iniciales al template.
reemplazar(
  `      role, bodega: s.bodega, query: s.query,`,
  `      role, nombreUsuario: s.nombreUsuario, iniciales: s.iniciales, bodega: s.bodega, query: s.query,`,
);

// 6. Sidebar: nombre e iniciales reales en vez del texto fijo, y se
// quita el selector "Cambiar perfil conectado" (no es una función real:
// usuario_perfil es 1:1 con auth.users, cada usuario tiene un solo
// perfil real; el switcher dejaba ver el menú de cualquier rol sin
// tener ese perfil).
reemplazar(
  `<span style="width:30px;height:30px;border-radius:50%;background:var(--brand-blue);color:#fff;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:600;flex-shrink:0">MO</span>
<span style="flex:1;min-width:0">
<span style="display:block;font-size:12.5px;font-weight:600;color:var(--fg-1);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">Marcela Orellana</span>
<span style="display:block;font-size:10.5px;color:var(--fg-3)">{{ role }}</span>
</span>
<span style="display:flex;color:var(--fg-4)">{{ iconChevrons }}</span>
</button>
<sc-if value="{{ userOpen }}" hint-placeholder-val="{{ false }}">
<div style="position:absolute;bottom:56px;left:10px;right:10px;background:var(--surface);border:1px solid var(--border-1);border-radius:8px;box-shadow:var(--shadow-lg);padding:6px;z-index:60;animation:mdIn 180ms cubic-bezier(0.16,1,0.3,1)">
<div style="font-size:9.5px;font-weight:600;text-transform:uppercase;letter-spacing:0.1em;color:var(--fg-4);padding:7px 10px 5px">Cambiar perfil conectado</div>
<sc-for list="{{ roleOptions }}" as="r" hint-placeholder-count="4">
<button sc-camel-on-click="{{ r.go }}" style="display:flex;align-items:center;gap:8px;width:100%;padding:7px 10px;border:none;border-radius:5px;font-size:12.5px;text-align:left;cursor:pointer;background:{{ r.bg }};color:{{ r.fg }};font-weight:{{ r.weight }}">
<span style="flex:1">{{ r.label }}</span>
<span style="display:flex;opacity:{{ r.checkOpacity }};color:var(--brand-blue)">{{ iconCheck }}</span>
</button>
</sc-for>
<div style="border-top:1px solid var(--border-1);margin:5px 0"></div>
<button sc-camel-on-click="{{ logout }}"`,
  `<span style="width:30px;height:30px;border-radius:50%;background:var(--brand-blue);color:#fff;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:600;flex-shrink:0">{{ iniciales }}</span>
<span style="flex:1;min-width:0">
<span style="display:block;font-size:12.5px;font-weight:600;color:var(--fg-1);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">{{ nombreUsuario }}</span>
<span style="display:block;font-size:10.5px;color:var(--fg-3)">{{ role }}</span>
</span>
<span style="display:flex;color:var(--fg-4)">{{ iconChevrons }}</span>
</button>
<sc-if value="{{ userOpen }}" hint-placeholder-val="{{ false }}">
<div style="position:absolute;bottom:56px;left:10px;right:10px;background:var(--surface);border:1px solid var(--border-1);border-radius:8px;box-shadow:var(--shadow-lg);padding:6px;z-index:60;animation:mdIn 180ms cubic-bezier(0.16,1,0.3,1)">
<button sc-camel-on-click="{{ logout }}"`,
);

// 7. Tres acciones que ya tenían backend real (movimientos/devoluciones,
// temperatura/registros, inventario/tomas) pero el frontend seguía
// simulando el éxito con mockRequest sin guardar nada de verdad.
reemplazar(
  `  registrarDevolucion:  p => mockRequest('registrarDevolucion', 'POST', '/movimientos/devoluciones', p, 'Devolución registrada'),`,
  `  registrarDevolucion:  p => apiFetch('POST', '/movimientos/devoluciones', p, 'Devolución registrada'),`,
);
reemplazar(
  `  registrarTemperatura: p => mockRequest('registrarTemperatura', 'POST', '/temperatura/registros', p, 'Temperatura registrada'),`,
  `  registrarTemperatura: p => apiFetch('POST', '/temperatura/registros', p, 'Temperatura registrada'),`,
);
reemplazar(
  `  iniciarTomaInventario: p => mockRequest('iniciarTomaInventario', 'POST', '/inventario/tomas', p, 'Toma de inventario iniciada'),`,
  `  iniciarTomaInventario: p => apiFetch('POST', '/inventario/tomas', p, 'Toma de inventario iniciada'),`,
);

// 8. Esas tres acciones ahora arman su propio payload real (antes ni
// siquiera se recolectaba: se llamaban sin ningún dato).
reemplazar(
  `const CON_PAYLOAD_PROPIO = ['guardarArticulo', 'guardarProveedor', 'registrarRecepcion', 'emitirDespacho', 'registrarTraspaso', 'recibirTraspaso', 'generarOrdenAbastecimiento', 'enviarSolicitudAbastecimiento', 'registrarDonacion', 'emitirDespachoInterno', 'registrarValeConsumo', 'registrarRecepcionOD', 'retirarLotesVencidos', 'guardarUsuario', 'guardarBodega', 'guardarCentroCosto'];`,
  `const CON_PAYLOAD_PROPIO = ['guardarArticulo', 'guardarProveedor', 'registrarRecepcion', 'emitirDespacho', 'registrarTraspaso', 'recibirTraspaso', 'generarOrdenAbastecimiento', 'enviarSolicitudAbastecimiento', 'registrarDonacion', 'emitirDespachoInterno', 'registrarValeConsumo', 'registrarRecepcionOD', 'retirarLotesVencidos', 'guardarUsuario', 'guardarBodega', 'guardarCentroCosto', 'registrarDevolucion', 'registrarTemperatura', 'iniciarTomaInventario'];`,
);

// 9. Tras registrar una devolución cambia el stock del lote: refrescar
// referencias igual que recepción/despacho/traspaso.
reemplazar(
  `    if (['registrarRecepcion', 'emitirDespacho', 'registrarTraspaso', 'registrarDonacion', 'emitirDespachoInterno', 'registrarValeConsumo'].includes(nombre)) {`,
  `    if (['registrarRecepcion', 'emitirDespacho', 'registrarTraspaso', 'registrarDonacion', 'emitirDespachoInterno', 'registrarValeConsumo', 'registrarDevolucion'].includes(nombre)) {`,
);

// 10. Payload real para las tres acciones (resuelto contra refLotes /
// refBodegas, igual que el resto de recolectarPayload).
reemplazar(
  `    return undefined;
  };

  mostrarError = (fn, mensaje) => {`,
  `    if (nombre === 'registrarDevolucion') {
      const lote = (this.state.refLotes || []).find(l => this.etiquetaLote(l) === leerModal('Lote a devolver'));
      const motivo = leerModal('Motivo');
      const obs = leerModal('Observaciones');
      return {
        id_lote: lote && lote.id_lote,
        cantidad: this.numero(leerModal('Cantidad')),
        observacion: [motivo, obs].filter(Boolean).join(' · ') || undefined
      };
    }
    if (nombre === 'registrarTemperatura') {
      const bodega = (this.state.refBodegas || []).find(b => b.nombre === leerModal('Ubicación'));
      return {
        id_bodega: bodega && bodega.id_bodega,
        temperatura: this.numero(leerModal('Temperatura (°C)'))
      };
    }
    if (nombre === 'iniciarTomaInventario') {
      const ALCANCE_MAP = { 'Inventario total': 'total', 'Por grupo': 'grupo', 'Por familia': 'familia', 'Selección manual de artículos': 'manual' };
      const bodega = (this.state.refBodegas || []).find(b => b.nombre === leerModal('Bodega a inventariar'));
      return {
        id_bodega: bodega && bodega.id_bodega,
        alcance: ALCANCE_MAP[leerModal('Alcance')] || 'total',
        responsable: leerModal('Responsable del conteo') || undefined,
        segundo_verificador: leerModal('Segundo verificador') || undefined,
        conteo_a_ciegas: !!this.state.toggle
      };
    }
    return undefined;
  };

  mostrarError = (fn, mensaje) => {`,
);

// 11. Los combos de estos tres modales mostraban listas fijas de
// ejemplo (proveedores/artículos/bodegas inventados) que nunca podían
// resolverse contra un id real; ahora usan las referencias reales ya
// cargadas (refLotes/refBodegas). También se vacían los nombres de
// ejemplo de "Responsable"/"Segundo verificador" para no guardar datos
// de prueba como si fueran reales.
reemplazar(
  `      devolucion: {
        eyebrow: 'INTERFAZ 15d · MODAL SOBRE MOVIMIENTOS', title: 'Nueva devolución a proveedor',
        width: '540px', cta: 'Registrar devolución', ctaBg: 'var(--brand-blue)',
        fields: [
          sel('Proveedor', ['Novo Nordisk Chile', 'Distribuidora Andes Ltda.', 'Laboratorios Saval S.A.'], 2),
          sel('Artículo', ['Insulina NPH 100 UI/ml', 'Guantes de nitrilo talla M'], 2),
          inp('Lote', 'L-22887'), inp('Cantidad', '40'),
          sel('Motivo', ['Cadena de frío interrumpida', 'Empaque dañado', 'Vencimiento próximo', 'Error en cantidad recibida'], 2),
          { label: 'Observaciones', isArea: true, span: 2, value: '', placeholder: 'Detalle del hallazgo' }
        ]
      },`,
  `      devolucion: {
        eyebrow: 'INTERFAZ 15d · MODAL SOBRE MOVIMIENTOS', title: 'Nueva devolución a proveedor',
        width: '540px', cta: 'Registrar devolución', ctaBg: 'var(--brand-blue)',
        fields: [
          sel('Lote a devolver', this.opcionesLotes(), 2),
          inp('Cantidad', ''),
          sel('Motivo', ['Cadena de frío interrumpida', 'Empaque dañado', 'Vencimiento próximo', 'Error en cantidad recibida'], 2),
          { label: 'Observaciones', isArea: true, span: 2, value: '', placeholder: 'Detalle del hallazgo' }
        ]
      },`,
);
reemplazar(
  `          sel('Ubicación', ['Bodega refrigerada 1', 'Bodega refrigerada 2', 'Bodega general', 'Bodega controlados'], 2),`,
  `          sel('Ubicación', this.opcionesBodegas(), 2),`,
);
reemplazar(
  `          sel('Bodega a inventariar', ['Bodega general', 'Bodega controlados', 'Bodega refrigerada 1', 'Bodega insumos'], 2),
          sel('Alcance', ['Inventario total', 'Por grupo', 'Por familia', 'Selección manual de artículos'], 2),
          inp('Responsable del conteo', 'Patricia Reyes'),
          inp('Segundo verificador', 'Cristián Muñoz'),`,
  `          sel('Bodega a inventariar', this.opcionesBodegas(), 2),
          sel('Alcance', ['Inventario total', 'Por grupo', 'Por familia', 'Selección manual de artículos'], 2),
          inp('Responsable del conteo', ''),
          inp('Segundo verificador', ''),`,
);

// 12. Botones "Imprimir": ya no simulan una llamada de red inexistente
// (los datos que se imprimen son los reales ya cargados en pantalla);
// disparan el diálogo de impresión real del navegador.
reemplazar(
  `  imprimirArticulos:    p => mockRequest('imprimirArticulos', 'GET', '/articulos/imprimir', p, 'Documento enviado a impresión'),`,
  `  imprimirArticulos:    p => { window.print(); return Promise.resolve({ ok: true, mensaje: 'Documento enviado a impresión' }); },`,
);
reemplazar(
  `  imprimirMovimientos:  p => mockRequest('imprimirMovimientos', 'GET', '/movimientos/imprimir', p, 'Listado enviado a impresión'),`,
  `  imprimirMovimientos:  p => { window.print(); return Promise.resolve({ ok: true, mensaje: 'Listado enviado a impresión' }); },`,
);
reemplazar(
  `  imprimirTemperatura:  p => mockRequest('imprimirTemperatura', 'GET', '/temperatura/imprimir', p, 'Registros enviados a impresión'),`,
  `  imprimirTemperatura:  p => { window.print(); return Promise.resolve({ ok: true, mensaje: 'Registros enviados a impresión' }); },`,
);
reemplazar(
  `  imprimirInventario:    p => mockRequest('imprimirInventario', 'GET', '/inventario/imprimir', p, 'Inventario enviado a impresión'),`,
  `  imprimirInventario:    p => { window.print(); return Promise.resolve({ ok: true, mensaje: 'Inventario enviado a impresión' }); },`,
);
reemplazar(
  `  imprimirDespachos:    p => mockRequest('imprimirDespachos', 'GET', '/despachos/imprimir', p, 'Listado enviado a impresión'),`,
  `  imprimirDespachos:    p => { window.print(); return Promise.resolve({ ok: true, mensaje: 'Listado enviado a impresión' }); },`,
);
reemplazar(
  `  imprimirRecepciones:  p => mockRequest('imprimirRecepciones', 'GET', '/recepciones/imprimir', p, 'Listado enviado a impresión'),`,
  `  imprimirRecepciones:  p => { window.print(); return Promise.resolve({ ok: true, mensaje: 'Listado enviado a impresión' }); },`,
);
reemplazar(
  `  imprimirAnalisisConsumo: p => mockRequest('imprimirAnalisisConsumo', 'GET', '/analisis-consumo/imprimir', p, 'Reporte enviado a impresión'),`,
  `  imprimirAnalisisConsumo: p => { window.print(); return Promise.resolve({ ok: true, mensaje: 'Reporte enviado a impresión' }); },`,
);

lines[TEMPLATE_LINE] = JSON.stringify(template).replace(/<\//g, "<\\/");
fs.writeFileSync(filePath, lines.join("\n"));
console.log("OK. Sesión real + 3 modales reales + imprimir real:", filePath);
