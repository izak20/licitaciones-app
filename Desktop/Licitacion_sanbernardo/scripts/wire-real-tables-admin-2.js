// Paso 10b: listados reales de usuarios, bodegas, centros de costo,
// log de auditoría y exportación.
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
    throw new Error("No se encontró el texto exacto (admin listas):\n" + desde.slice(0, 300));
  }
  template = template.replace(desde, hasta);
}

const DESDE = `    if (p === 'usuarios') return {
      isList: true, eyebrow: 'ADMINISTRACIÓN · INTERFAZ 3', title: 'Usuarios y perfiles',
      req: 'Anexo N°4 · crear, editar y eliminar perfiles · mínimo 4 tipos',
      primary: { label: 'Nuevo usuario', go: this.open('usuario') },
      secondary: [{ label: 'Exportar', icon: ic('download', 13), fn: 'exportarUsuarios' }],
      searchPlaceholder: 'Buscar por nombre o correo',
      filters: [{ label: 'Perfil', value: 'Todos', icon: ic('filter', 13) }, { label: 'Estado', value: 'Activos', icon: ic('filter', 13) }],
      columns: cols('Nombre', 'Usuario', 'Correo', 'Perfil', 'Bodega asignada', 'Estado'),
      rows: [
        ['Marcela Orellana', 'm.orellana', 'm.orellana@sanbernardo.cl', 'Administrador', '—', ['ACTIVO', 'ok']],
        ['Patricia Reyes', 'p.reyes', 'p.reyes@sanbernardo.cl', 'Droguería', 'Droguería Comunal', ['ACTIVO', 'ok']],
        ['Cristián Muñoz', 'c.munoz', 'c.munoz@sanbernardo.cl', 'Droguería', 'Droguería Comunal', ['ACTIVO', 'ok']],
        ['Verónica Tapia', 'v.tapia', 'v.tapia@sanbernardo.cl', 'Cliente Interno', CENTROS[0], ['ACTIVO', 'ok']],
        ['Jorge Alsina', 'j.alsina', 'j.alsina@sanbernardo.cl', 'Cliente Interno', CENTROS[1], ['ACTIVO', 'ok']],
        ['Daniela Fuentes', 'd.fuentes', 'd.fuentes@sanbernardo.cl', 'Cliente Interno', CENTROS[2], ['ACTIVO', 'ok']],
        ['Rodrigo Nilo', 'r.nilo', 'r.nilo@sanbernardo.cl', 'Finanzas', '—', ['ACTIVO', 'ok']],
        ['Claudia Bravo', 'c.bravo', 'c.bravo@sanbernardo.cl', 'Cliente Interno', CENTROS[3], ['INACTIVO', 'neutral']]
      ].map(r => ({
        cells: [txt(r[0]), mono(r[1]), txt(r[2]), badge(r[3].toUpperCase(), r[3] === 'Administrador' ? 'info' : 'neutral'), txt(r[4]), badge(r[5][0], r[5][1])],
        actions: [{ icon: ic('pencil', 14), title: 'Editar', go: this.open('usuario') }, { icon: ic('trash', 14), title: 'Eliminar', fn: 'eliminarUsuario', payload: { usuario: r[1] } }]
      })),
      footer: 'Mostrando 8 de 62 usuarios · 4 perfiles: Administrador, Droguería, Finanzas, Cliente Interno'
    };

    if (p === 'bodegas') return {
      isTree: true, eyebrow: 'ADMINISTRACIÓN · INTERFAZ 5', title: 'Bodegas y sub-bodegas',
      req: 'Anexo N°4 · estructura de la red de bodegas',
      primary: { label: 'Agregar bodega', go: this.open('bodega') },
      secondary: [],
      tree: [
        { label: 'Droguería Comunal', sub: 'Bulnes N°577, San Bernardo', code: 'BOD-001', icon: ic('warehouse', 18), iconColor: 'var(--brand-blue)', indent: '16px', size: '13.5px', weight: '600', tag: 'RAÍZ', tagBg: B.info[0], tagFg: B.info[1] },
        { label: 'Bodega general', code: 'BOD-001-01', icon: ic('package', 15), iconColor: 'var(--fg-3)', indent: '44px', size: '12.5px', weight: '500' },
        { label: 'Bodega controlados', sub: 'Acceso restringido · doble llave', code: 'BOD-001-02', icon: ic('shield', 15), iconColor: 'var(--fg-3)', indent: '44px', size: '12.5px', weight: '500', tag: 'CONTROLADO', tagBg: B.warn[0], tagFg: B.warn[1] },
        { label: 'Bodega refrigerada 1', code: 'BOD-001-03', icon: ic('snow', 15), iconColor: 'var(--fg-3)', indent: '44px', size: '12.5px', weight: '500', tag: 'CADENA DE FRÍO', tagBg: B.info[0], tagFg: B.info[1] },
        { label: 'Bodega refrigerada 2', code: 'BOD-001-04', icon: ic('snow', 15), iconColor: 'var(--fg-3)', indent: '44px', size: '12.5px', weight: '500', tag: 'CADENA DE FRÍO', tagBg: B.info[0], tagFg: B.info[1] },
        { label: 'Bodega insumos', code: 'BOD-001-05', icon: ic('package', 15), iconColor: 'var(--fg-3)', indent: '44px', size: '12.5px', weight: '500' },
        { label: 'Bodega informática', code: 'BOD-001-06', icon: ic('package', 15), iconColor: 'var(--fg-3)', indent: '44px', size: '12.5px', weight: '500' },
        { label: 'Centros de salud', sub: '21 establecimientos · 42 bodegas', code: '', icon: ic('chevDown', 15), iconColor: 'var(--fg-4)', indent: '16px', size: '11px', weight: '600' },
        { label: CENTROS[0], sub: 'CC-1042', code: 'BOD-042', icon: ic('warehouse', 16), iconColor: 'var(--fg-2)', indent: '44px', size: '12.5px', weight: '600' },
        { label: 'Bodega farmacia', code: 'BOD-042-01', icon: ic('pill', 14), iconColor: 'var(--fg-4)', indent: '72px', size: '12px', weight: '400' },
        { label: 'Bodega informática', code: 'BOD-042-02', icon: ic('package', 14), iconColor: 'var(--fg-4)', indent: '72px', size: '12px', weight: '400' },
        { label: CENTROS[1], sub: 'CC-1043', code: 'BOD-043', icon: ic('warehouse', 16), iconColor: 'var(--fg-2)', indent: '44px', size: '12.5px', weight: '600' },
        { label: 'Bodega farmacia', code: 'BOD-043-01', icon: ic('pill', 14), iconColor: 'var(--fg-4)', indent: '72px', size: '12px', weight: '400' },
        { label: 'Bodega informática', code: 'BOD-043-02', icon: ic('package', 14), iconColor: 'var(--fg-4)', indent: '72px', size: '12px', weight: '400' },
        { label: CENTROS[2], sub: 'CC-1044', code: 'BOD-044', icon: ic('warehouse', 16), iconColor: 'var(--fg-2)', indent: '44px', size: '12.5px', weight: '600' },
        { label: 'Bodega farmacia', code: 'BOD-044-01', icon: ic('pill', 14), iconColor: 'var(--fg-4)', indent: '72px', size: '12px', weight: '400' },
        { label: 'Bodega informática', code: 'BOD-044-02', icon: ic('package', 14), iconColor: 'var(--fg-4)', indent: '72px', size: '12px', weight: '400' },
        { label: CENTROS[3], sub: 'Mall Plaza San Bernardo · CC-1051', code: 'BOD-051', icon: ic('warehouse', 16), iconColor: 'var(--fg-2)', indent: '44px', size: '12.5px', weight: '600' },
        { label: 'Bodega farmacia', code: 'BOD-051-01', icon: ic('pill', 14), iconColor: 'var(--fg-4)', indent: '72px', size: '12px', weight: '400' },
        { label: 'Bodega informática', code: 'BOD-051-02', icon: ic('package', 14), iconColor: 'var(--fg-4)', indent: '72px', size: '12px', weight: '400' },
        { label: '17 centros de salud más', sub: 'CESFAM, CECOSF y postas rurales de la comuna', code: '', icon: ic('chevRight', 14), iconColor: 'var(--fg-4)', indent: '44px', size: '12px', weight: '500' }
      ]
    };

    if (p === 'centros') return {
      isList: true, eyebrow: 'ADMINISTRACIÓN · INTERFAZ 6', title: 'Centros de costo',
      req: 'Anexo N°4 · implementar 30 centros de costo (cliente interno)',
      primary: { label: 'Nuevo centro de costo', go: this.open('centro') },
      secondary: [{ label: 'Exportar', icon: ic('download', 13), fn: 'exportarCentrosCosto' }],
      searchPlaceholder: 'Buscar por código o nombre',
      filters: [{ label: 'Estado', value: 'Activos', icon: ic('filter', 13) }],
      columns: cols('Código', 'Nombre', 'Bodega asociada', ['Consumo mes', 'right'], 'Estado'),
      rows: [
        ['CC-1001', 'Droguería Comunal', 'BOD-001', '$1,1M', ['ACTIVO', 'ok']],
        ['CC-1042', CENTROS[0], 'BOD-042', '$9,1M', ['ACTIVO', 'ok']],
        ['CC-1043', CENTROS[1], 'BOD-043', '$7,8M', ['ACTIVO', 'ok']],
        ['CC-1044', CENTROS[2], 'BOD-044', '$2,7M', ['ACTIVO', 'ok']],
        ['CC-1051', CENTROS[3], 'BOD-051', '$6,4M', ['ACTIVO', 'ok']],
        ['CC-1052', 'Programa Salud Mental', 'BOD-042', '$1,9M', ['ACTIVO', 'ok']],
        ['CC-1053', 'Programa Odontológico', 'BOD-043', '$0,8M', ['ACTIVO', 'ok']],
        ['CC-1099', 'Campaña invierno 2025', 'BOD-001', '—', ['INACTIVO', 'neutral']]
      ].map(r => ({
        cells: [mono(r[0]), txt(r[1]), mono(r[2]), mono(r[3], 'right'), badge(r[4][0], r[4][1])],
        actions: [{ icon: ic('pencil', 14), title: 'Editar', go: this.open('centro') }]
      })),
      footer: 'Mostrando 8 de 30 centros de costo'
    };

    if (p === 'auditoria') return {
      isList: true, eyebrow: 'ADMINISTRACIÓN · INTERFAZ 7', title: 'Log de auditoría',
      req: 'Anexo N°4 · log de TODOS los movimientos · consulta por rango de fecha y palabra clave',
      primary: null,
      secondary: [{ label: 'Exportar', icon: ic('download', 13), fn: 'exportarAuditoria' }],
      searchPlaceholder: 'Buscar por palabra clave',
      filters: [{ label: 'Rango', value: '01–15 sep 2026', icon: ic('calendar', 13) }, { label: 'Usuario', value: 'Todos', icon: ic('users', 13) }],
      columns: cols('Fecha y hora', 'Usuario', 'Perfil', 'Acción', 'Entidad afectada', 'Origen'),
      rows: [
        ['15/09/2026 09:41:12', 'm.orellana', 'Administrador', 'Creó artículo', 'ART-001301 · Fentanilo 0,05 mg/ml', '10.14.2.31'],
        ['15/09/2026 09:12:48', 'p.reyes', 'Droguería', 'Registró recepción', 'REC-08812 · lote L-22910', '10.14.2.44'],
        ['15/09/2026 08:55:03', 'j.alsina', 'Cliente Interno', 'Informó recepción con reparos', 'DES-04780', '10.22.7.18'],
        ['15/09/2026 08:40:22', 'c.munoz', 'Droguería', 'Editó perfil de usuario', 'v.tapia · Cliente Interno → Droguería', '10.14.2.51'],
        ['14/09/2026 18:02:10', 'r.nilo', 'Finanzas', 'Generó exportación completa', 'EXP-0094 · CSV UTF-8', '10.14.9.7'],
        ['14/09/2026 17:31:55', 'p.reyes', 'Droguería', 'Creó despacho', 'DES-04812 · CESFAM Raúl Cuevas', '10.14.2.44'],
        ['14/09/2026 16:18:07', 'm.orellana', 'Administrador', 'Desactivó usuario', 'c.bravo', '10.14.2.31'],
        ['14/09/2026 15:44:31', 'd.fuentes', 'Cliente Interno', 'Registró vale de consumo', 'VC-02291 · 14 ítems', '10.31.4.9']
      ].map(r => ({
        cells: [mono(r[0]), mono(r[1]), txt(r[2]), txt(r[3]), stack(r[4], ''), mono(r[5])],
        actions: []
      })),
      footer: 'Mostrando 8 de 41.902 registros · sólo lectura, sin edición ni borrado'
    };

    if (p === 'exportacion') return {
      isExport: true, eyebrow: 'ADMINISTRACIÓN · INTERFAZ 8', title: 'Exportación y respaldo',
      req: 'Foro pregunta 18 · exportación en formatos abiertos + certificado de eliminación segura',
      primary: null, secondary: [],
      exports: [
        { date: '14/09/2026 18:02', by: 'Rodrigo Nilo · Finanzas', format: 'CSV (UTF-8) + JSON', size: '84 MB' },
        { date: '31/08/2026 22:00', by: 'Respaldo automático', format: 'SQL dump', size: '312 MB' },
        { date: '31/07/2026 22:00', by: 'Respaldo automático', format: 'SQL dump', size: '298 MB' }
      ]
    };`;

const HASTA = `    if (p === 'usuarios') {
      const usuarios = this.cargarLista('usuarios', '/api/usuarios');
      return {
        isList: true, eyebrow: 'ADMINISTRACIÓN · INTERFAZ 3', title: 'Usuarios y perfiles',
        req: 'Anexo N°4 · crear, editar y eliminar perfiles · mínimo 4 tipos',
        primary: { label: 'Nuevo usuario', go: this.open('usuario') },
        secondary: [],
        searchPlaceholder: 'Buscar por nombre',
        filters: [],
        columns: cols('Nombre', 'Perfil', 'Bodega asignada', 'Estado'),
        rows: usuarios.map(u => {
          const perfil = this.desanidar(u.perfil);
          const bodega = this.desanidar(u.bodega);
          return {
            cells: [txt(u.nombre_completo), badge((perfil ? perfil.nombre : '—').toUpperCase(), perfil && perfil.nombre === 'Administrador' ? 'info' : 'neutral'), txt(bodega ? bodega.nombre : '—'), badge(u.activo ? 'ACTIVO' : 'INACTIVO', u.activo ? 'ok' : 'neutral')],
            actions: [{ icon: ic('trash', 14), title: 'Eliminar', go: () => { if (window.confirm('¿Eliminar a ' + u.nombre_completo + '?')) this.run('eliminarUsuario', { id: u.id_usuario })(); } }]
          };
        }),
        footer: 'Mostrando ' + usuarios.length + ' usuarios reales'
      };
    }

    if (p === 'bodegas') {
      const bodegasReales = this.cargarLista('bodegas_admin', '/api/bodegas');
      return {
        isTree: true, eyebrow: 'ADMINISTRACIÓN · INTERFAZ 5', title: 'Bodegas y sub-bodegas',
        req: 'Anexo N°4 · estructura de la red de bodegas',
        primary: { label: 'Agregar bodega', go: this.open('bodega') },
        secondary: [],
        tree: bodegasReales.map(b => ({
          label: b.nombre, sub: b.tipo, code: '', icon: ic(b.id_bodega_padre ? 'package' : 'warehouse', b.id_bodega_padre ? 15 : 18),
          iconColor: b.id_bodega_padre ? 'var(--fg-3)' : 'var(--brand-blue)', indent: b.id_bodega_padre ? '44px' : '16px',
          size: b.id_bodega_padre ? '12.5px' : '13.5px', weight: b.id_bodega_padre ? '500' : '600',
          tag: b.requiere_cadena_frio ? 'CADENA DE FRÍO' : null, tagBg: B.info[0], tagFg: B.info[1]
        }))
      };
    }

    if (p === 'centros') {
      const centros = this.cargarLista('centros_admin', '/api/centros-costo');
      return {
        isList: true, eyebrow: 'ADMINISTRACIÓN · INTERFAZ 6', title: 'Centros de costo',
        req: 'Anexo N°4 · implementar 30 centros de costo (cliente interno)',
        primary: { label: 'Nuevo centro de costo', go: this.open('centro') },
        secondary: [],
        searchPlaceholder: 'Buscar por código o nombre',
        filters: [],
        columns: cols('Código', 'Nombre', 'Bodega asociada', 'Estado'),
        rows: centros.map(c => {
          const bodega = this.desanidar(c.bodega);
          return {
            cells: [mono(c.codigo), txt(c.nombre), txt(bodega ? bodega.nombre : '—'), badge(c.activo ? 'ACTIVO' : 'INACTIVO', c.activo ? 'ok' : 'neutral')],
            actions: []
          };
        }),
        footer: 'Mostrando ' + centros.length + ' centros de costo reales'
      };
    }

    if (p === 'auditoria') {
      const registros = this.cargarLista('auditoria', '/api/log-auditoria');
      return {
        isList: true, eyebrow: 'ADMINISTRACIÓN · INTERFAZ 7', title: 'Log de auditoría',
        req: 'Anexo N°4 · log de TODOS los movimientos · consulta por rango de fecha y palabra clave',
        primary: null,
        secondary: [],
        searchPlaceholder: 'Buscar por palabra clave',
        filters: [],
        columns: cols('Fecha y hora', 'Usuario', 'Acción', 'Entidad afectada'),
        rows: registros.map(r => ({
          cells: [mono(String(r.fecha_hora || '').slice(0, 16).replace('T', ' ')), txt(r.usuario || '—'), txt(r.accion), stack(r.entidad, r.id_entidad || '')],
          actions: []
        })),
        footer: 'Mostrando ' + registros.length + ' registros reales · sólo lectura, sin edición ni borrado'
      };
    }

    if (p === 'exportacion') {
      const historial = this.cargarLista('exportaciones', '/api/exportaciones');
      return {
        isExport: true, eyebrow: 'ADMINISTRACIÓN · INTERFAZ 8', title: 'Exportación y respaldo',
        req: 'Foro pregunta 18 · exportación en formatos abiertos + certificado de eliminación segura',
        primary: null, secondary: [],
        exports: historial.map(e => ({
          date: String(e.fecha_generacion || '').slice(0, 16).replace('T', ' '),
          by: e.generado_por || '—',
          format: e.formato,
          size: e.tipo
        }))
      };
    }`;

reemplazar(DESDE, HASTA);

lines[TEMPLATE_LINE] = JSON.stringify(template).replace(/<\//g, "<\\/");
fs.writeFileSync(filePath, lines.join("\n"));
console.log("OK. Paso 10b (admin: listas) aplicado:", filePath);
