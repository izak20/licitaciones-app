// Auditoría completa de "filters:" en la plataforma (ver conversación):
// de todos los filtros existentes, sólo dos seguían siendo decoración
// pura (texto fijo, sin "go"): "Agrupar por: Familia" en Análisis de
// consumo (droguería y farmacia comparten la misma función analisis())
// y "Documento: Todos" en Proveedores. Movimientos/mov-farmacia ya
// estaban resueltos en un fix anterior; Artículos se corrigió recién;
// el resto de las páginas con filters:[] simplemente no muestra
// ningún filtro (no hay nada roto ahí, no hay nada que cliquear).
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

// 1. Estado inicial: agrupación real de Análisis de consumo (persiste
//    al navegar, igual que analisisDesde/analisisHasta) y filtro de
//    Documento de Proveedores (se limpia al navegar, igual que los
//    filtros de Artículos).
reemplazar(
  `    chartTooltipKey: null, columnasPagina: {}, busquedaTabla: '', filtroEstado: null, filtroFamilia: null, filtroGrupoArt: null, filtroFamiliaArt: null,`,
  `    chartTooltipKey: null, columnasPagina: {}, busquedaTabla: '', filtroEstado: null, filtroFamilia: null, filtroGrupoArt: null, filtroFamiliaArt: null, filtroDocumentoProv: null, analisisAgrupar: 'familia',`,
  "estado inicial",
);

reemplazar(
  `  go = (page) => () => this.setState({ page, tab: 0, dd: null, modal: null, drawer: false, navOpen: false, estadoOverride: null, form: {}, busquedaTabla: '', filtroGrupoArt: null, filtroFamiliaArt: null });`,
  `  go = (page) => () => this.setState({ page, tab: 0, dd: null, modal: null, drawer: false, navOpen: false, estadoOverride: null, form: {}, busquedaTabla: '', filtroGrupoArt: null, filtroFamiliaArt: null, filtroDocumentoProv: null });`,
  "go reset",
);

// 2. Control de filtro nuevo para Proveedores, mismo patrón que los
//    de Artículos.
reemplazar(
  `  fechaCorta = (f) => String(f || '').slice(0, 10);`,
  `  filtroDocumentoControl = (filas) => {
    const actual = this.state.filtroDocumentoProv;
    const conDoc = filas.filter(p => !!p.documento_adjunto_url).length;
    const sinDoc = filas.length - conDoc;
    const elegir = (valor) => () => this.setState({ filtroDocumentoProv: valor, dd: null });
    const opciones = [
      { label: 'Todos', count: filas.length, go: elegir(null), bg: actual ? 'transparent' : 'var(--brand-blue-050)' },
      { label: 'Con documento', count: conDoc, go: elegir('con'), bg: actual === 'con' ? 'var(--brand-blue-050)' : 'transparent' },
      { label: 'Sin documento', count: sinDoc, go: elegir('sin'), bg: actual === 'sin' ? 'var(--brand-blue-050)' : 'transparent' }
    ];
    const filtro = {
      label: 'Documento', value: actual === 'con' ? 'Con documento' : (actual === 'sin' ? 'Sin documento' : 'Todos'), icon: ic('filter', 13),
      go: this.dd('filtroDocumentoProv'), ddAbierto: this.state.dd === 'filtroDocumentoProv', opciones
    };
    const filasFiltradas = actual ? filas.filter(p => actual === 'con' ? !!p.documento_adjunto_url : !p.documento_adjunto_url) : filas;
    return { filtro, filasFiltradas };
  };
  fechaCorta = (f) => String(f || '').slice(0, 10);`,
  "filtroDocumentoControl",
);

// 3. Proveedores: el filtro ahora es real y encadena con las filas.
reemplazar(
  `    if (p === 'proveedores') return {
      isList: true, eyebrow: 'MAESTROS · INTERFAZ 12', title: 'Listado de proveedores',
      req: 'Anexo N°4 · gestión de proveedores · esp. general #9 (resolución sanitaria)',
      primary: { label: 'Nuevo proveedor', go: this.open('proveedor') },
      secondary: [
        { label: 'Exportar', icon: ic('download', 13), fn: 'exportarProveedores' },
        { label: 'Plantilla Excel', icon: ic('download', 13), go: () => this.descargarArchivo('/proveedores/masivo/plantilla', 'plantilla-proveedores.xlsx') },
        { label: 'Carga masiva', icon: ic('upload', 13), go: () => this.elegirArchivo('cargaMasivaProveedores') }
      ],
      searchPlaceholder: 'Buscar por RUT o razón social',
      filters: [{ label: 'Documento', value: 'Todos', icon: ic('filter', 13) }],
      columns: cols('RUT', 'Razón social', 'Ejecutivo', 'Teléfono', 'Correo', 'Resolución sanitaria', ['Dirección', 'left', 'extra'], ['Teléfono ejecutivo', 'left', 'extra']),
      rows: this.cargarLista('proveedores_list', '/api/proveedores').map(p => ({
        cells: [mono(p.rut), txt(p.razon_social), txt(p.nombre_ejecutivo || '—'), mono(p.telefono || '—'), txt(p.email || '—'), badge(p.documento_adjunto_url ? 'ADJUNTO' : 'SIN ADJUNTO', p.documento_adjunto_url ? 'ok' : 'bad'), txt(p.direccion || '—'), mono(p.telefono_ejecutivo || '—')],
        actions: [
          { icon: ic('pencil', 14), title: 'Editar ficha', go: () => { this.setState({ ultimoProveedorId: p.id_proveedor }); this.open('proveedor')(); } },
          { icon: ic('download', 14), title: 'Exportar lista de precios', go: () => this.run('exportarListaPrecios', { id: p.id_proveedor })() }
        ]
      })),
      footer: 'Mostrando ' + (this.state.listas.proveedores_list || []).length + ' proveedores reales'
    };`,
  `    if (p === 'proveedores') {
      const todosProv = this.cargarLista('proveedores_list', '/api/proveedores');
      const docCtl = this.filtroDocumentoControl(todosProv);
      const filasProv = docCtl.filasFiltradas;
      return {
        isList: true, eyebrow: 'MAESTROS · INTERFAZ 12', title: 'Listado de proveedores',
        req: 'Anexo N°4 · gestión de proveedores · esp. general #9 (resolución sanitaria)',
        primary: { label: 'Nuevo proveedor', go: this.open('proveedor') },
        secondary: [
          { label: 'Exportar', icon: ic('download', 13), fn: 'exportarProveedores' },
          { label: 'Plantilla Excel', icon: ic('download', 13), go: () => this.descargarArchivo('/proveedores/masivo/plantilla', 'plantilla-proveedores.xlsx') },
          { label: 'Carga masiva', icon: ic('upload', 13), go: () => this.elegirArchivo('cargaMasivaProveedores') }
        ],
        searchPlaceholder: 'Buscar por RUT o razón social',
        filters: [docCtl.filtro],
        columns: cols('RUT', 'Razón social', 'Ejecutivo', 'Teléfono', 'Correo', 'Resolución sanitaria', ['Dirección', 'left', 'extra'], ['Teléfono ejecutivo', 'left', 'extra']),
        rows: filasProv.map(p => ({
          cells: [mono(p.rut), txt(p.razon_social), txt(p.nombre_ejecutivo || '—'), mono(p.telefono || '—'), txt(p.email || '—'), badge(p.documento_adjunto_url ? 'ADJUNTO' : 'SIN ADJUNTO', p.documento_adjunto_url ? 'ok' : 'bad'), txt(p.direccion || '—'), mono(p.telefono_ejecutivo || '—')],
          actions: [
            { icon: ic('pencil', 14), title: 'Editar ficha', go: () => { this.setState({ ultimoProveedorId: p.id_proveedor }); this.open('proveedor')(); } },
            { icon: ic('download', 14), title: 'Exportar lista de precios', go: () => this.run('exportarListaPrecios', { id: p.id_proveedor })() }
          ]
        })),
        footer: 'Mostrando ' + filasProv.length + ' de ' + todosProv.length + ' proveedores reales'
      };
    }`,
  "proveedores",
);

// 4. Análisis de consumo: "Agrupar por" ahora es un selector real
//    (grupo/familia/subfamilia/producto), tal como describe el propio
//    comentario de la interfaz 20, en vez de un texto fijo en
//    "Familia". El backend (/api/analisis-consumo/detalle) ya soporta
//    los 4 valores — sólo faltaba conectarlo.
reemplazar(
  `  analisis(farmacia) {
    const desde = this.state.analisisDesde;
    const hasta = this.state.analisisHasta;
    const clave = 'analisis_detalle_' + (farmacia ? 'f_' : 'd_') + desde + '_' + hasta;
    const ruta = '/api/analisis-consumo/detalle?agrupar=familia&desde=' + desde + '&hasta=' + hasta;
    const detalle = this.cargarLista(clave, ruta) || [];`,
  `  analisis(farmacia) {
    const desde = this.state.analisisDesde;
    const hasta = this.state.analisisHasta;
    const AGRUPACIONES_ANALISIS = [
      { valor: 'grupo', label: 'Grupo', plural: 'grupos' },
      { valor: 'familia', label: 'Familia', plural: 'familias' },
      { valor: 'subfamilia', label: 'Subfamilia', plural: 'subfamilias' },
      { valor: 'producto', label: 'Producto', plural: 'productos' }
    ];
    const agrupar = this.state.analisisAgrupar || 'familia';
    const agrupacionActual = AGRUPACIONES_ANALISIS.find(a => a.valor === agrupar) || AGRUPACIONES_ANALISIS[1];
    const elegirAgrupar = (valor) => () => this.setState({ analisisAgrupar: valor, dd: null });
    const filtroAgrupar = {
      label: 'Agrupar por', value: agrupacionActual.label, icon: ic('chart', 13),
      go: this.dd('analisisAgrupar'), ddAbierto: this.state.dd === 'analisisAgrupar',
      opciones: AGRUPACIONES_ANALISIS.map(a => ({ label: a.label, count: '', go: elegirAgrupar(a.valor), bg: agrupar === a.valor ? 'var(--brand-blue-050)' : 'transparent' }))
    };
    const clave = 'analisis_detalle_' + (farmacia ? 'f_' : 'd_') + agrupar + '_' + desde + '_' + hasta;
    const ruta = '/api/analisis-consumo/detalle?agrupar=' + agrupar + '&desde=' + desde + '&hasta=' + hasta;
    const detalle = this.cargarLista(clave, ruta) || [];`,
  "analisis header",
);

reemplazar(
  `      searchPlaceholder: 'Buscar por grupo, familia o producto',
      filters: [
        { label: 'Agrupar por', value: 'Familia', icon: ic('chart', 13) }
      ],
      banner: { bg: B.info[0], border: B.info[2], fg: B.info[1], icon: ic('info', 15), text: 'Cada color es una bodega. Toca la leyenda para ocultar o mostrar una, y toca una barra o una fila de la tabla para ver qué productos y qué bodega componen ese consumo.' },
      chart: barsChart({
        title: 'Consumo por familia',`,
  `      searchPlaceholder: 'Buscar por grupo, familia o producto',
      filters: [filtroAgrupar],
      banner: { bg: B.info[0], border: B.info[2], fg: B.info[1], icon: ic('info', 15), text: 'Cada color es una bodega. Toca la leyenda para ocultar o mostrar una, y toca una barra o una fila de la tabla para ver qué productos y qué bodega componen ese consumo.' },
      chart: barsChart({
        title: 'Consumo por ' + agrupacionActual.label.toLowerCase(),`,
  "analisis filters+chart title",
);

reemplazar(
  `      footer: 'Mostrando ' + detalle.length + ' familias con consumo real · ' + desde + ' a ' + hasta + ' · toca una barra o fila para ver su detalle'`,
  `      footer: 'Mostrando ' + detalle.length + ' ' + agrupacionActual.plural + ' con consumo real · ' + desde + ' a ' + hasta + ' · toca una barra o fila para ver su detalle'`,
  "analisis footer",
);

lines[TEMPLATE_LINE] = JSON.stringify(template).replace(/<\//g, "<\\/");
fs.writeFileSync(filePath, lines.join("\n"));
console.log("OK. Agrupar-por real en Análisis de consumo + filtro Documento real en Proveedores:", filePath);
