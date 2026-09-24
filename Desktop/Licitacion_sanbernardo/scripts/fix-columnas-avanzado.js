// Extiende el selector de columnas (ya existente) para permitir además
// REORDENAR (botones subir/bajar) y AGREGAR columnas reales que antes
// no se mostraban (marcadas extra:true en cols(...), ocultas por
// defecto). Reemplaza el mecanismo anterior (solo ocultar) por uno
// unificado: { ocultas, orden } por página, persistido en localStorage.
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
    throw new Error("No se encontró el texto exacto (columnas avanzado):\n" + desde.slice(0, 400));
  }
  template = template.replace(desde, () => hasta);
}

// 1. cols(): tercer argumento opcional 'extra' marca una columna real
// que existe pero empieza oculta (el usuario la "agrega" desde el
// selector de Columnas).
reemplazar(
  `const cols = (...defs) => defs.map(d => (typeof d === 'string' ? { label: d, align: 'left' } : { label: d[0], align: d[1] }));`,
  `const cols = (...defs) => defs.map(d => (typeof d === 'string' ? { label: d, align: 'left', extra: false } : { label: d[0], align: d[1] || 'left', extra: d[2] === 'extra' }));`,
);

// 2. Estado + carga/guardado unificado (reemplaza el mecanismo anterior
// de solo-ocultar).
reemplazar(
  `    chartTooltipKey: null, columnasOcultas: {},`,
  `    chartTooltipKey: null, columnasPagina: {},`,
);
reemplazar(
  `    try {
      const guardado = window.localStorage.getItem('columnasOcultas');
      if (guardado) this.setState({ columnasOcultas: JSON.parse(guardado) });
    } catch (e) {}
  }

  toggleColumna = (pagina, label) => {
    this.setState(s => {
      const actuales = (s.columnasOcultas && s.columnasOcultas[pagina]) || [];
      const nuevas = actuales.includes(label) ? actuales.filter(l => l !== label) : actuales.concat(label);
      const columnasOcultas = Object.assign({}, s.columnasOcultas, { [pagina]: nuevas });
      try { window.localStorage.setItem('columnasOcultas', JSON.stringify(columnasOcultas)); } catch (e) {}
      return { columnasOcultas };
    });
  };`,
  `    try {
      const guardado = window.localStorage.getItem('columnasPagina');
      if (guardado) this.setState({ columnasPagina: JSON.parse(guardado) });
    } catch (e) {}
  }

  guardarPrefColumnas = (pagina, ocultas, orden) => {
    this.setState(s => {
      const columnasPagina = Object.assign({}, s.columnasPagina, { [pagina]: { ocultas, orden } });
      try { window.localStorage.setItem('columnasPagina', JSON.stringify(columnasPagina)); } catch (e) {}
      return { columnasPagina };
    });
  };`,
);

// 3. renderVals(): resuelve orden + visibilidad reales de las columnas
// de la página actual (con default: extras ocultas, resto en su orden
// original) antes de ensamblar "pg".
reemplazar(
  `    const bodegas = ['Todas'].concat((this.state.refBodegas || []).map(b => b.nombre));
    const ocultasPagina = (s.columnasOcultas && s.columnasOcultas[s.page]) || [];
    const indicesColumnasVisibles = (page.columns || [])
      .map((c, i) => i)
      .filter(i => !ocultasPagina.includes((page.columns[i] || {}).label));`,
  `    const bodegas = ['Todas'].concat((this.state.refBodegas || []).map(b => b.nombre));
    const columnasBase = page.columns || [];
    const labelsBase = columnasBase.map(c => c.label);
    const prefColumnas = (s.columnasPagina && s.columnasPagina[s.page]) || null;
    const extrasPorDefecto = columnasBase.filter(c => c.extra).map(c => c.label);
    const ocultasPagina = prefColumnas && prefColumnas.ocultas ? prefColumnas.ocultas : extrasPorDefecto;
    const ordenGuardado = (prefColumnas && prefColumnas.orden) || [];
    const ordenPagina = ordenGuardado.filter(l => labelsBase.includes(l)).concat(labelsBase.filter(l => !ordenGuardado.includes(l)));
    const indicesEnOrden = ordenPagina.filter(l => !ocultasPagina.includes(l)).map(l => labelsBase.indexOf(l));`,
);

// 4. Aplica orden+visibilidad a columns/rows y arma el selector con
// subir/bajar además de mostrar/ocultar.
reemplazar(
  `      columns: (page.columns || []).filter((c, i) => indicesColumnasVisibles.includes(i)),
      rows: (page.rows || []).map(r => Object.assign({}, r, {
        cells: (r.cells || []).filter((c, i) => indicesColumnasVisibles.includes(i)),
        actions: (r.actions || []).map(a => Object.assign({ isIcon: !a.isLabeled }, a, { go: a.go || this.run(a.fn, a.payload) }))
      })),
      columnasDisponibles: (page.columns || []).map(c => ({
        label: c.label,
        visible: !ocultasPagina.includes(c.label),
        go: () => this.toggleColumna(s.page, c.label)
      })),
      columnasDdOpen: s.dd === 'columnas',
      toggleColumnasDd: this.dd('columnas'),
      tieneColumnas: (page.columns || []).length > 0,`,
  `      columns: indicesEnOrden.map(i => columnasBase[i]),
      rows: (page.rows || []).map(r => Object.assign({}, r, {
        cells: indicesEnOrden.map(i => (r.cells || [])[i]),
        actions: (r.actions || []).map(a => Object.assign({ isIcon: !a.isLabeled }, a, { go: a.go || this.run(a.fn, a.payload) }))
      })),
      columnasDisponibles: ordenPagina.map((label, pos) => ({
        label,
        visible: !ocultasPagina.includes(label),
        colorSubir: pos > 0 ? 'var(--fg-3)' : 'var(--fg-4)',
        colorBajar: pos < ordenPagina.length - 1 ? 'var(--fg-3)' : 'var(--fg-4)',
        go: () => {
          const nuevasOcultas = ocultasPagina.includes(label) ? ocultasPagina.filter(l => l !== label) : ocultasPagina.concat(label);
          this.guardarPrefColumnas(s.page, nuevasOcultas, ordenPagina);
        },
        subir: () => {
          if (pos <= 0) return;
          const nuevoOrden = ordenPagina.slice();
          const tmp = nuevoOrden[pos - 1]; nuevoOrden[pos - 1] = nuevoOrden[pos]; nuevoOrden[pos] = tmp;
          this.guardarPrefColumnas(s.page, ocultasPagina, nuevoOrden);
        },
        bajar: () => {
          if (pos >= ordenPagina.length - 1) return;
          const nuevoOrden = ordenPagina.slice();
          const tmp = nuevoOrden[pos + 1]; nuevoOrden[pos + 1] = nuevoOrden[pos]; nuevoOrden[pos] = tmp;
          this.guardarPrefColumnas(s.page, ocultasPagina, nuevoOrden);
        }
      })),
      columnasDdOpen: s.dd === 'columnas',
      toggleColumnasDd: this.dd('columnas'),
      tieneColumnas: labelsBase.length > 0,`,
);

// 5. Markup del selector: cada fila ahora tiene, además del checkbox,
// dos botones para subir/bajar esa columna en el orden.
reemplazar(
  `<sc-for list="{{ page.columnasDisponibles }}" as="c" hint-placeholder-count="4">
<button sc-camel-on-click="{{ c.go }}" style="display:flex;align-items:center;gap:8px;width:100%;padding:7px 9px;border:none;border-radius:5px;font-size:12.5px;text-align:left;cursor:pointer;background:transparent;color:var(--fg-1)" style-hover="background:var(--bg-3)">
<input type="checkbox" checked="{{ c.visible }}" style="width:14px;height:14px;accent-color:#115B99;pointer-events:none">
<span>{{ c.label }}</span>
</button>
</sc-for>`,
  `<sc-for list="{{ page.columnasDisponibles }}" as="c" hint-placeholder-count="4">
<div style="display:flex;align-items:center;gap:2px">
<button sc-camel-on-click="{{ c.go }}" style="flex:1;min-width:0;display:flex;align-items:center;gap:8px;padding:7px 9px;border:none;border-radius:5px;font-size:12.5px;text-align:left;cursor:pointer;background:transparent;color:var(--fg-1)" style-hover="background:var(--bg-3)">
<input type="checkbox" checked="{{ c.visible }}" style="width:14px;height:14px;accent-color:#115B99;flex-shrink:0;pointer-events:none">
<span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">{{ c.label }}</span>
</button>
<button sc-camel-on-click="{{ c.subir }}" title="Subir" style="display:flex;align-items:center;justify-content:center;flex-shrink:0;width:22px;height:22px;border:none;border-radius:4px;background:transparent;color:{{ c.colorSubir }};cursor:pointer" style-hover="background:var(--bg-3)">
<span style="display:flex;transform:rotate(180deg)">{{ iconChevronDown }}</span>
</button>
<button sc-camel-on-click="{{ c.bajar }}" title="Bajar" style="display:flex;align-items:center;justify-content:center;flex-shrink:0;width:22px;height:22px;border:none;border-radius:4px;background:transparent;color:{{ c.colorBajar }};cursor:pointer" style-hover="background:var(--bg-3)">
<span style="display:flex">{{ iconChevronDown }}</span>
</button>
</div>
</sc-for>`,
);

// 6. Columnas extra reales (ya existían en los datos, no se mostraban):
// Usuarios -> Fecha de creación. Proveedores -> Dirección, Teléfono
// del ejecutivo.
reemplazar(
  `        columns: cols('Nombre', 'Perfil', 'Bodega asignada', 'Estado'),
        rows: usuarios.map(u => {
          const perfil = this.desanidar(u.perfil);
          const bodega = this.desanidar(u.bodega);
          return {
            cells: [txt(u.nombre_completo), badge((perfil ? perfil.nombre : '—').toUpperCase(), perfil && perfil.nombre === 'Administrador' ? 'info' : 'neutral'), txt(bodega ? bodega.nombre : '—'), badge(u.activo ? 'ACTIVO' : 'INACTIVO', u.activo ? 'ok' : 'neutral')],`,
  `        columns: cols('Nombre', 'Perfil', 'Bodega asignada', 'Estado', ['Fecha de creación', 'right', 'extra']),
        rows: usuarios.map(u => {
          const perfil = this.desanidar(u.perfil);
          const bodega = this.desanidar(u.bodega);
          return {
            cells: [txt(u.nombre_completo), badge((perfil ? perfil.nombre : '—').toUpperCase(), perfil && perfil.nombre === 'Administrador' ? 'info' : 'neutral'), txt(bodega ? bodega.nombre : '—'), badge(u.activo ? 'ACTIVO' : 'INACTIVO', u.activo ? 'ok' : 'neutral'), mono(this.fechaCorta(u.fecha_creacion), 'right')],`,
);
reemplazar(
  `      columns: cols('RUT', 'Razón social', 'Ejecutivo', 'Teléfono', 'Correo', 'Resolución sanitaria'),
      rows: this.cargarLista('proveedores_list', '/api/proveedores').map(p => ({
        cells: [mono(p.rut), txt(p.razon_social), txt(p.nombre_ejecutivo || '—'), mono(p.telefono || '—'), txt(p.email || '—'), badge(p.documento_adjunto_url ? 'ADJUNTO' : 'SIN ADJUNTO', p.documento_adjunto_url ? 'ok' : 'bad')],`,
  `      columns: cols('RUT', 'Razón social', 'Ejecutivo', 'Teléfono', 'Correo', 'Resolución sanitaria', ['Dirección', 'left', 'extra'], ['Teléfono ejecutivo', 'left', 'extra']),
      rows: this.cargarLista('proveedores_list', '/api/proveedores').map(p => ({
        cells: [mono(p.rut), txt(p.razon_social), txt(p.nombre_ejecutivo || '—'), mono(p.telefono || '—'), txt(p.email || '—'), badge(p.documento_adjunto_url ? 'ADJUNTO' : 'SIN ADJUNTO', p.documento_adjunto_url ? 'ok' : 'bad'), txt(p.direccion || '—'), mono(p.telefono_ejecutivo || '—')],`,
);
reemplazar(
  `      columns: cols('Código', 'Artículo', 'Distintivos', 'Estado'),
      rows: this.cargarLista('articulos_list', '/api/articulos').map(a => {
        const distintivos = [];
        if (a.es_controlado) distintivos.push(['CONTROLADO', 'warn', 'shield']);
        if (a.requiere_cadena_frio) distintivos.push(['CADENA DE FRÍO', 'info', 'snow']);
        return {
          cells: [mono(a.codigo_interno), stack(a.nombre, [a.grupo, a.familia].filter(Boolean).join(' / ')), flags(distintivos), badge(a.activo ? 'VIGENTE' : 'INACTIVO', a.activo ? 'ok' : 'neutral')],`,
  `      columns: cols('Código', 'Artículo', 'Distintivos', 'Estado', ['Grupo', 'left', 'extra'], ['Familia', 'left', 'extra'], ['Unidad de medida', 'left', 'extra'], ['Ubicación', 'left', 'extra']),
      rows: this.cargarLista('articulos_list', '/api/articulos').map(a => {
        const distintivos = [];
        if (a.es_controlado) distintivos.push(['CONTROLADO', 'warn', 'shield']);
        if (a.requiere_cadena_frio) distintivos.push(['CADENA DE FRÍO', 'info', 'snow']);
        return {
          cells: [mono(a.codigo_interno), stack(a.nombre, [a.grupo, a.familia].filter(Boolean).join(' / ')), flags(distintivos), badge(a.activo ? 'VIGENTE' : 'INACTIVO', a.activo ? 'ok' : 'neutral'), txt(a.grupo || '—'), txt(a.familia || '—'), txt(a.unidad_medida || '—'), txt(a.ubicacion || '—')],`,
);

lines[TEMPLATE_LINE] = JSON.stringify(template).replace(/<\//g, "<\\/");
fs.writeFileSync(filePath, lines.join("\n"));
console.log("OK. Columnas: agregar (extra) + reordenar, además de ocultar:", filePath);
