// El cliente pidió poder ocultar/mostrar columnas en las tablas
// (adaptarlas a su gusto) y que esa preferencia se mantenga al
// recargar la página. Se implementa UNA sola vez en el ensamblado
// central de columnas/filas (renderVals), así que aplica
// automáticamente a TODAS las tablas isList de la app sin tocar cada
// página una por una. Se guarda en localStorage (persistente entre
// recargas, igual que pedía con "cookie") por id de página.
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
    throw new Error("No se encontró el texto exacto (columnas editables):\n" + desde.slice(0, 400));
  }
  template = template.replace(desde, () => hasta);
}

// (icono expuesto en el paso 6, junto a iconCalendar)

// 1. Ícono para el botón "Columnas".
reemplazar(
  `  grid:'<rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 9h18"/><path d="M3 15h18"/><path d="M9 3v18"/><path d="M15 3v18"/>'
};`,
  `  grid:'<rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 9h18"/><path d="M3 15h18"/><path d="M9 3v18"/><path d="M15 3v18"/>',
  columns:'<rect width="18" height="18" x="3" y="3" rx="2"/><path d="M12 3v18"/>'
};`,
);

// 2. Estado: qué columnas quedan ocultas, por página. Se carga desde
// localStorage al montar (persiste entre recargas).
reemplazar(
  `    chartTooltipKey: null,`,
  `    chartTooltipKey: null, columnasOcultas: {},`,
);
reemplazar(
  `  componentDidMount() {
    if ((this.props.startScreen || 'Aplicación') === 'Login') this.setState({ screen: 'login' });
    window.addEventListener('resize', this.measure);
    this.measure();
    this.cargarReferencias();
    this.cargarUsuarioActual();
  }`,
  `  componentDidMount() {
    if ((this.props.startScreen || 'Aplicación') === 'Login') this.setState({ screen: 'login' });
    window.addEventListener('resize', this.measure);
    this.measure();
    this.cargarReferencias();
    this.cargarUsuarioActual();
    try {
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
);

// 3. renderVals(): calcula qué columnas están visibles para la página
// actual, antes de ensamblar "pg".
reemplazar(
  `    const bodegas = ['Todas'].concat((this.state.refBodegas || []).map(b => b.nombre));`,
  `    const bodegas = ['Todas'].concat((this.state.refBodegas || []).map(b => b.nombre));
    const ocultasPagina = (s.columnasOcultas && s.columnasOcultas[s.page]) || [];
    const indicesColumnasVisibles = (page.columns || [])
      .map((c, i) => i)
      .filter(i => !ocultasPagina.includes((page.columns[i] || {}).label));`,
);

// 4. Aplica el filtro a columns/rows (misma posición para ambos, ya
// que las celdas están alineadas por índice con las columnas) y
// expone la lista para el selector "Columnas".
reemplazar(
  `      columns: page.columns || [],
      rows: (page.rows || []).map(r => Object.assign({}, r, {
        actions: (r.actions || []).map(a => Object.assign({ isIcon: !a.isLabeled }, a, { go: a.go || this.run(a.fn, a.payload) }))
      })),`,
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
);

// 5. Botón "Columnas" + menú de checkboxes, en la misma barra de
// filtros/búsqueda que ya comparten todas las tablas isList.
reemplazar(
  `<div style="flex:1"></div>
<div style="display:flex;align-items:center;gap:8px;height:30px;padding:0 10px;background:var(--surface);border:1px solid var(--border-1);border-radius:6px;width:250px">
<span style="display:flex;color:var(--fg-3)">{{ iconSearch }}</span>`,
  `<sc-if value="{{ page.tieneColumnas }}" hint-placeholder-val="{{ false }}">
<div style="position:relative">
<button sc-camel-on-click="{{ page.toggleColumnasDd }}" style="display:inline-flex;align-items:center;gap:6px;height:30px;padding:0 11px;font-size:12px;border-radius:999px;cursor:pointer;background:var(--surface);border:1px solid var(--border-2);color:var(--fg-2)" style-hover="background:var(--bg-3)">
<span style="display:flex;color:var(--fg-3)">{{ iconColumns }}</span>Columnas
<span style="display:flex;color:var(--fg-4)">{{ iconChevronDown }}</span>
</button>
<sc-if value="{{ page.columnasDdOpen }}" hint-placeholder-val="{{ false }}">
<div style="position:absolute;top:36px;left:0;background:var(--surface);border:1px solid var(--border-1);border-radius:8px;box-shadow:var(--shadow-lg);padding:6px;z-index:60;min-width:200px;animation:mdIn 180ms cubic-bezier(0.16,1,0.3,1)">
<div style="font-size:9.5px;font-weight:600;text-transform:uppercase;letter-spacing:0.1em;color:var(--fg-4);padding:6px 9px 4px">Mostrar columnas</div>
<sc-for list="{{ page.columnasDisponibles }}" as="c" hint-placeholder-count="4">
<button sc-camel-on-click="{{ c.go }}" style="display:flex;align-items:center;gap:8px;width:100%;padding:7px 9px;border:none;border-radius:5px;font-size:12.5px;text-align:left;cursor:pointer;background:transparent;color:var(--fg-1)" style-hover="background:var(--bg-3)">
<input type="checkbox" checked="{{ c.visible }}" style="width:14px;height:14px;accent-color:#115B99;pointer-events:none">
<span>{{ c.label }}</span>
</button>
</sc-for>
</div>
</sc-if>
</div>
</sc-if>
<div style="flex:1"></div>
<div style="display:flex;align-items:center;gap:8px;height:30px;padding:0 10px;background:var(--surface);border:1px solid var(--border-1);border-radius:6px;width:250px">
<span style="display:flex;color:var(--fg-3)">{{ iconSearch }}</span>`,
);

// 6. Ícono del botón "Columnas" expuesto al nivel raíz del render.
reemplazar(
  `      iconCalendar: ic('calendar', 14),`,
  `      iconCalendar: ic('calendar', 14), iconColumns: ic('columns', 14),`,
);

lines[TEMPLATE_LINE] = JSON.stringify(template).replace(/<\//g, "<\\/");
fs.writeFileSync(filePath, lines.join("\n"));
console.log("OK. Columnas mostrar/ocultar, persistente entre recargas:", filePath);
