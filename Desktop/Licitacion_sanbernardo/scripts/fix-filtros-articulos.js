// Los 3 "filtros" del listado de Artículos (Rango/Tipo/Grupo) eran
// texto decorativo fijo — sin "go", sin selects de fecha reales, sin
// ninguna conexión a los datos. Se reemplazan por el mismo patrón ya
// usado y probado en Movimientos: filtros de pastilla con dropdown
// real (contando sobre los artículos ya cargados) + el selector de
// fechas genérico (page.mostrarFechas) filtrando por creado_en.
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
    throw new Error("No se encontró el texto exacto (filtros artículos):\n" + desde.slice(0, 400));
  }
  template = template.replace(desde, () => hasta);
}

// 1. Estado inicial: dos claves nuevas y dedicadas (no se reutilizan
//    filtroEstado/filtroFamilia de Movimientos para evitar que un
//    filtro elegido en Movimientos se arrastre, sin querer, al
//    listado de Artículos al navegar entre páginas).
reemplazar(
  `    chartTooltipKey: null, columnasPagina: {}, busquedaTabla: '', filtroEstado: null, filtroFamilia: null,`,
  `    chartTooltipKey: null, columnasPagina: {}, busquedaTabla: '', filtroEstado: null, filtroFamilia: null, filtroGrupoArt: null, filtroFamiliaArt: null,`,
);

// 2. Al navegar a otra página se limpian también estos dos filtros
//    nuevos (igual que ya ocurre, en otros puntos, con los de
//    Movimientos).
reemplazar(
  `  go = (page) => () => this.setState({ page, tab: 0, dd: null, modal: null, drawer: false, navOpen: false, estadoOverride: null, form: {}, busquedaTabla: '' });`,
  `  go = (page) => () => this.setState({ page, tab: 0, dd: null, modal: null, drawer: false, navOpen: false, estadoOverride: null, form: {}, busquedaTabla: '', filtroGrupoArt: null, filtroFamiliaArt: null });`,
);

// 3. Dos controles de filtro nuevos, mismo patrón que
//    filtroEstadoControl/filtroFamiliaControl pero sobre artículos
//    planos (sin pasar por lote.articulo).
reemplazar(
  `  fechaCorta = (f) => String(f || '').slice(0, 10);`,
  `  filtroGrupoArtControl = (filas) => {
    const actual = this.state.filtroGrupoArt;
    const conteo = {};
    filas.forEach(a => { if (a.grupo) conteo[a.grupo] = (conteo[a.grupo] || 0) + 1; });
    const grupos = Object.keys(conteo).sort();
    if (grupos.length === 0) return null;
    const elegir = (valor) => () => this.setState({ filtroGrupoArt: valor, dd: null });
    const opciones = [{ label: 'Todos', count: filas.length, go: elegir(null), bg: actual ? 'transparent' : 'var(--brand-blue-050)' }]
      .concat(grupos.map(g => ({ label: g, count: conteo[g], go: elegir(g), bg: actual === g ? 'var(--brand-blue-050)' : 'transparent' })));
    const filtro = {
      label: 'Grupo', value: actual || 'Todos', icon: ic('filter', 13),
      go: this.dd('filtroGrupoArt'), ddAbierto: this.state.dd === 'filtroGrupoArt', opciones
    };
    const filasFiltradas = actual ? filas.filter(a => a.grupo === actual) : filas;
    return { filtro, filasFiltradas };
  };
  filtroFamiliaArtControl = (filas) => {
    const actual = this.state.filtroFamiliaArt;
    const conteo = {};
    filas.forEach(a => { if (a.familia) conteo[a.familia] = (conteo[a.familia] || 0) + 1; });
    const familias = Object.keys(conteo).sort();
    if (familias.length === 0) return null;
    const elegir = (valor) => () => this.setState({ filtroFamiliaArt: valor, dd: null });
    const opciones = [{ label: 'Todas', count: filas.length, go: elegir(null), bg: actual ? 'transparent' : 'var(--brand-blue-050)' }]
      .concat(familias.map(f => ({ label: f, count: conteo[f], go: elegir(f), bg: actual === f ? 'var(--brand-blue-050)' : 'transparent' })));
    const filtro = {
      label: 'Tipo', value: actual || 'Todos', icon: ic('filter', 13),
      go: this.dd('filtroFamiliaArt'), ddAbierto: this.state.dd === 'filtroFamiliaArt', opciones
    };
    const filasFiltradas = actual ? filas.filter(a => a.familia === actual) : filas;
    return { filtro, filasFiltradas };
  };
  fechaCorta = (f) => String(f || '').slice(0, 10);`,
);

// 4. El bloque de la página 'articulos': ahora calcula de verdad el
//    rango de fechas (sobre creado_en) y encadena Grupo → Tipo igual
//    que Estado → Familia en Movimientos.
const DESDE = `    if (p === 'articulos') return {
      isList: true, eyebrow: 'MAESTROS · INTERFAZ 9', title: 'Listado de artículos',
      req: 'Anexo N°4 · bloque Cartola Artículos (6 ítems)',
      primary: { label: 'Nuevo artículo', go: this.go('ficha') },
      secondary: [
        { label: 'Exportar a Excel', icon: ic('download', 13), fn: 'exportarArticulos' },
        { label: 'Imprimir', icon: ic('printer', 13), fn: 'imprimirArticulos' },
        { label: 'Plantilla Excel', icon: ic('download', 13), go: () => this.descargarArchivo('/articulos/masivo/plantilla', 'plantilla-articulos.xlsx') },
        { label: 'Carga masiva', icon: ic('upload', 13), go: () => this.elegirArchivo('cargaMasivaArticulos') }
      ],
      searchPlaceholder: 'Buscar por código o nombre',
      filters: [
        { label: 'Rango', value: '01–15 sep 2026', icon: ic('calendar', 13) },
        { label: 'Tipo', value: 'Todos', icon: ic('filter', 13) },
        { label: 'Grupo', value: 'Medicamentos', icon: ic('package', 13) }
      ],
      columns: cols('Código', 'Artículo', 'Distintivos', 'Estado', ['Grupo', 'left', 'extra'], ['Familia', 'left', 'extra'], ['Unidad de medida', 'left', 'extra'], ['Ubicación', 'left', 'extra']),
      rows: this.cargarLista('articulos_list', '/api/articulos').map(a => {
        const distintivos = [];
        if (a.es_controlado) distintivos.push(['CONTROLADO', 'warn', 'shield']);
        if (a.requiere_cadena_frio) distintivos.push(['CADENA DE FRÍO', 'info', 'snow']);
        return {
          cells: [mono(a.codigo_interno), stack(a.nombre, [a.grupo, a.familia].filter(Boolean).join(' / ')), flags(distintivos), badge(a.activo ? 'VIGENTE' : 'INACTIVO', a.activo ? 'ok' : 'neutral'), txt(a.grupo || '—'), txt(a.familia || '—'), txt(a.unidad_medida || '—'), txt(a.ubicacion || '—')],
          actions: [{ icon: ic('pencil', 14), title: 'Editar ficha', go: this.go('ficha') }]
        };
      }),
      footer: 'Mostrando ' + (this.state.listas.articulos_list || []).length + ' artículos reales'
    };`;

const HASTA = `    if (p === 'articulos') {
      const desde = this.state.analisisDesde;
      const hasta = this.state.analisisHasta;
      const todos = this.cargarLista('articulos_list', '/api/articulos');
      const enRango = todos.filter(a => {
        const f = String(a.creado_en || '').slice(0, 10);
        return !f || (f >= desde && f <= hasta);
      });
      const grupoCtl = this.filtroGrupoArtControl(enRango);
      const trasGrupo = grupoCtl ? grupoCtl.filasFiltradas : enRango;
      const familiaCtl = this.filtroFamiliaArtControl(trasGrupo);
      const filasFiltradas = familiaCtl ? familiaCtl.filasFiltradas : trasGrupo;
      const filtrosActivos = [grupoCtl, familiaCtl].filter(Boolean).map(c => c.filtro);
      return {
        isList: true, eyebrow: 'MAESTROS · INTERFAZ 9', title: 'Listado de artículos',
        req: 'Anexo N°4 · bloque Cartola Artículos (6 ítems)',
        primary: { label: 'Nuevo artículo', go: this.go('ficha') },
        secondary: [
          { label: 'Exportar a Excel', icon: ic('download', 13), fn: 'exportarArticulos' },
          { label: 'Imprimir', icon: ic('printer', 13), fn: 'imprimirArticulos' },
          { label: 'Plantilla Excel', icon: ic('download', 13), go: () => this.descargarArchivo('/articulos/masivo/plantilla', 'plantilla-articulos.xlsx') },
          { label: 'Carga masiva', icon: ic('upload', 13), go: () => this.elegirArchivo('cargaMasivaArticulos') }
        ],
        searchPlaceholder: 'Buscar por código o nombre',
        mostrarFechas: true,
        filters: filtrosActivos,
        columns: cols('Código', 'Artículo', 'Distintivos', 'Estado', ['Grupo', 'left', 'extra'], ['Familia', 'left', 'extra'], ['Unidad de medida', 'left', 'extra'], ['Ubicación', 'left', 'extra']),
        rows: filasFiltradas.map(a => {
          const distintivos = [];
          if (a.es_controlado) distintivos.push(['CONTROLADO', 'warn', 'shield']);
          if (a.requiere_cadena_frio) distintivos.push(['CADENA DE FRÍO', 'info', 'snow']);
          return {
            cells: [mono(a.codigo_interno), stack(a.nombre, [a.grupo, a.familia].filter(Boolean).join(' / ')), flags(distintivos), badge(a.activo ? 'VIGENTE' : 'INACTIVO', a.activo ? 'ok' : 'neutral'), txt(a.grupo || '—'), txt(a.familia || '—'), txt(a.unidad_medida || '—'), txt(a.ubicacion || '—')],
            actions: [{ icon: ic('pencil', 14), title: 'Editar ficha', go: this.go('ficha') }]
          };
        }),
        footer: 'Mostrando ' + filasFiltradas.length + ' de ' + todos.length + ' artículos reales'
      };
    }`;

reemplazar(DESDE, HASTA);

lines[TEMPLATE_LINE] = JSON.stringify(template).replace(/<\//g, "<\\/");
fs.writeFileSync(filePath, lines.join("\n"));
console.log("OK. Filtros reales (Rango por fecha, Grupo, Tipo) en el listado de Artículos:", filePath);
