// Paso 10: Administración completa — usuarios (crear/listar/eliminar),
// bodegas (crear/listar), centros de costo (crear/listar), log de
// auditoría (listar), exportación (listar historial + generar).
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
    throw new Error("No se encontró el texto exacto (admin):\n" + desde.slice(0, 300));
  }
  template = template.replace(desde, hasta);
}

// 1. cargarReferencias también trae los perfiles reales.
reemplazar(
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
  `  cargarReferencias = () => {
    const cargar = (ruta) => fetch(ruta).then(r => r.json()).then(d => d.data || []).catch(() => []);
    Promise.all([
      cargar('/api/bodegas'), cargar('/api/articulos'), cargar('/api/proveedores'),
      cargar('/api/centros-costo'), cargar('/api/lotes'), cargar('/api/despachos'), cargar('/api/perfiles')
    ]).then(([refBodegas, refArticulos, refProveedores, refCentrosCosto, refLotes, despachos, refPerfiles]) => {
      const refPendientes = (despachos || []).filter(m => m.estado === 'enviado' || m.estado === 'en_transito');
      this.setState({ refBodegas, refArticulos, refProveedores, refCentrosCosto, refLotes, refPendientes, refPerfiles });
    });
  };
  opcionesPerfiles = () => (this.state.refPerfiles || []).map(p => p.nombre);`,
);
reemplazar(
  `    refBodegas: [], refArticulos: [], refProveedores: [], refCentrosCosto: [], refLotes: [], refPendientes: [],`,
  `    refBodegas: [], refArticulos: [], refProveedores: [], refCentrosCosto: [], refLotes: [], refPendientes: [], refPerfiles: [],`,
);

// 2. Modales usuario/bodega/centro: selects con datos reales.
reemplazar(
  `      usuario: {
        eyebrow: 'INTERFAZ 4 · MODAL SOBRE USUARIOS', title: 'Nuevo usuario',
        sub: 'Anexo N°4 · especificación general #6', width: '560px', cta: 'Guardar usuario', ctaBg: 'var(--brand-blue)',
        fields: [
          inp('Nombre completo', 'Verónica Tapia', 2),
          inp('Usuario', 'v.tapia'), inp('Correo', 'v.tapia@sanbernardo.cl'),
          { label: 'Contraseña', isInput: true, inputType: 'password', value: '', placeholder: 'Sólo se define al crear', span: 1, hint2: 'El usuario deberá cambiarla en su primer ingreso.' },
          sel('Perfil', ROLES, 1),
          sel('Bodega asignada', [CENTROS[0], CENTROS[1], CENTROS[2], CENTROS[3]], 2, 'Sólo aplica cuando el perfil es Cliente Interno.'),
          tg('Estado', 'ok', 'Activo', 'Inactivo')
        ]
      },
      bodega: {
        eyebrow: 'INTERFAZ 5 · MODAL SOBRE BODEGAS', title: 'Agregar bodega',
        width: '460px', cta: 'Agregar', ctaBg: 'var(--brand-blue)',
        fields: [
          inp('Nombre de la bodega', '', 2, 'ej: Bodega refrigerada 3'),
          sel('Bodega padre', ['Droguería Comunal', CENTROS[0], CENTROS[1], CENTROS[2], CENTROS[3]], 2)
        ]
      },
      centro: {
        eyebrow: 'INTERFAZ 6 · MODAL SOBRE CENTROS DE COSTO', title: 'Nuevo centro de costo',
        width: '460px', cta: 'Guardar', ctaBg: 'var(--brand-blue)',
        fields: [inp('Código', 'CC-1054'), inp('Nombre', '', 1, 'ej: Programa Cardiovascular'), sel('Bodega asociada', ['BOD-042', 'BOD-043', 'BOD-044', 'BOD-051'], 2)]
      },`,
  `      usuario: {
        eyebrow: 'INTERFAZ 4 · MODAL SOBRE USUARIOS', title: 'Nuevo usuario',
        sub: 'Anexo N°4 · especificación general #6', width: '560px', cta: 'Guardar usuario', ctaBg: 'var(--brand-blue)',
        fields: [
          inp('Nombre completo', '', 2, 'ej: Verónica Tapia'),
          inp('Correo', '', 1, 'ej: v.tapia@sanbernardo.cl'),
          { label: 'Contraseña', isInput: true, inputType: 'password', value: campoValor('Contraseña', ''), onInput: onCampo('Contraseña'), placeholder: 'Mínimo 6 caracteres', span: 1, hint2: 'El usuario deberá cambiarla en su primer ingreso.' },
          sel('Perfil', this.opcionesPerfiles(), 1),
          sel('Bodega asignada', this.opcionesBodegas(), 2, 'Sólo aplica cuando el perfil es Cliente Interno.')
        ]
      },
      bodega: {
        eyebrow: 'INTERFAZ 5 · MODAL SOBRE BODEGAS', title: 'Agregar bodega',
        width: '460px', cta: 'Agregar', ctaBg: 'var(--brand-blue)',
        fields: [
          inp('Nombre de la bodega', '', 2, 'ej: Bodega refrigerada 3'),
          sel('Tipo', ['centro_distribucion', 'bodega', 'sub_bodega'], 1),
          sel('Bodega padre (opcional)', ['(ninguna)'].concat(this.opcionesBodegas()), 1)
        ]
      },
      centro: {
        eyebrow: 'INTERFAZ 6 · MODAL SOBRE CENTROS DE COSTO', title: 'Nuevo centro de costo',
        width: '460px', cta: 'Guardar', ctaBg: 'var(--brand-blue)',
        fields: [inp('Código', '', 1, 'ej: CC-1054'), inp('Nombre', '', 1, 'ej: Programa Cardiovascular'), sel('Bodega asociada', this.opcionesBodegas(), 2)]
      },`,
);

// 3. recolectarPayload: nuevas ramas para usuario/bodega/centro.
reemplazar(
  `    if (nombre === 'retirarLotesVencidos') {`,
  `    if (nombre === 'guardarUsuario') {
      const perfil = (this.state.refPerfiles || []).find(p => p.nombre === leerModal('Perfil'));
      const bodega = (this.state.refBodegas || []).find(b => b.nombre === leerModal('Bodega asignada'));
      return {
        nombre_completo: leerModal('Nombre completo'),
        email: leerModal('Correo'),
        password: leerModal('Contraseña'),
        id_perfil: perfil && perfil.id_perfil,
        id_bodega: bodega && bodega.id_bodega
      };
    }
    if (nombre === 'guardarBodega') {
      const padreNombre = leerModal('Bodega padre (opcional)');
      const padre = (this.state.refBodegas || []).find(b => b.nombre === padreNombre);
      return {
        nombre: leerModal('Nombre de la bodega'),
        tipo: leerModal('Tipo'),
        id_bodega_padre: padre ? padre.id_bodega : null
      };
    }
    if (nombre === 'guardarCentroCosto') {
      const bodega = (this.state.refBodegas || []).find(b => b.nombre === leerModal('Bodega asociada'));
      return {
        codigo: leerModal('Código'),
        nombre: leerModal('Nombre'),
        id_bodega: bodega && bodega.id_bodega
      };
    }
    if (nombre === 'retirarLotesVencidos') {`,
);
reemplazar(
  `const CON_PAYLOAD_PROPIO = ['guardarArticulo', 'guardarProveedor', 'registrarRecepcion', 'emitirDespacho', 'registrarTraspaso', 'recibirTraspaso', 'generarOrdenAbastecimiento', 'enviarSolicitudAbastecimiento', 'registrarDonacion', 'emitirDespachoInterno', 'registrarValeConsumo', 'registrarRecepcionOD', 'retirarLotesVencidos'];`,
  `const CON_PAYLOAD_PROPIO = ['guardarArticulo', 'guardarProveedor', 'registrarRecepcion', 'emitirDespacho', 'registrarTraspaso', 'recibirTraspaso', 'generarOrdenAbastecimiento', 'enviarSolicitudAbastecimiento', 'registrarDonacion', 'emitirDespachoInterno', 'registrarValeConsumo', 'registrarRecepcionOD', 'retirarLotesVencidos', 'guardarUsuario', 'guardarBodega', 'guardarCentroCosto'];`,
);

// 4. Funciones API reales para usuarios/bodegas/centros.
reemplazar(
  `  guardarUsuario:       p => mockRequest('guardarUsuario', 'POST', '/usuarios', p, 'Usuario guardado'),
  eliminarUsuario:      p => mockRequest('eliminarUsuario', 'DELETE', '/usuarios/:id', p, 'Usuario eliminado'),
  exportarUsuarios:     p => mockRequest('exportarUsuarios', 'GET', '/usuarios/export', p, 'Exportación de usuarios lista'),
  guardarBodega:        p => mockRequest('guardarBodega', 'POST', '/bodegas', p, 'Bodega agregada'),
  guardarCentroCosto:   p => mockRequest('guardarCentroCosto', 'POST', '/centros-costo', p, 'Centro de costo guardado'),`,
  `  guardarUsuario:       p => apiFetch('POST', '/usuarios', p, 'Usuario guardado'),
  eliminarUsuario:      p => apiFetch('DELETE', '/usuarios/' + ((p && p.id) || ''), p, 'Usuario eliminado'),
  exportarUsuarios:     p => mockRequest('exportarUsuarios', 'GET', '/usuarios/export', p, 'Exportación de usuarios lista'),
  guardarBodega:        p => apiFetch('POST', '/bodegas', p, 'Bodega agregada'),
  guardarCentroCosto:   p => apiFetch('POST', '/centros-costo', p, 'Centro de costo guardado'),`,
);

lines[TEMPLATE_LINE] = JSON.stringify(template).replace(/<\//g, "<\\/");
fs.writeFileSync(filePath, lines.join("\n"));
console.log("OK. Paso 10a (admin: formularios) aplicado:", filePath);
