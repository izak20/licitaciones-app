// Corrige el selector "Bodega" del header (interfaz 29): mostraba una
// lista fija de mockup ("Todas (49)" + nombres que no existen en la
// base de datos) sin relación con las bodegas reales, y no filtraba
// nada. Ahora se arma con this.state.refBodegas (ya cargadas por
// cargarReferencias) y filtra de verdad las páginas de Movimientos
// (Droguería y Farmacia), que es donde tiene sentido el filtro.
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
    throw new Error("No se encontró el texto exacto (header bodega):\n" + desde.slice(0, 300));
  }
  template = template.replace(desde, hasta);
}

// 1. Estado inicial: "Todas" en vez de la etiqueta falsa "Todas (49)".
reemplazar(
  `    dd: null, role: 'Administrador', bodega: 'Todas (49)', query: '', toggle: true, frio: false,`,
  `    dd: null, role: 'Administrador', bodega: 'Todas', query: '', toggle: true, frio: false,`,
);

// 2. Lista real de bodegas para el selector (antes: array hardcodeado
// con nombres que no existen en la base de datos).
reemplazar(
  `    const bodegas = ['Todas (49)', 'Droguería Comunal', 'Bodega general', 'Bodega controlados', 'Bodega refrigerada 1'].concat(CENTROS.slice(0, 4));`,
  `    const bodegas = ['Todas'].concat((this.state.refBodegas || []).map(b => b.nombre));`,
);

// 3. Helper para resolver el id real de la bodega elegida en el header.
reemplazar(
  `  desanidar = (v) => (Array.isArray(v) ? v[0] : v) || null;`,
  `  desanidar = (v) => (Array.isArray(v) ? v[0] : v) || null;
  bodegaSeleccionadaId = () => {
    const b = (this.state.refBodegas || []).find(x => x.nombre === this.state.bodega);
    return b ? b.id_bodega : null;
  };`,
);

// 4. movimientos() (Droguería): las 4 rutas/llaves de cargarLista
// respetan la bodega elegida en el header.
reemplazar(
  `    const claves = ['mov_recepcion', 'mov_despacho', 'mov_traspaso', 'mov_devolucion'];
    const rutas = ['/api/movimientos?tipo=recepcion', '/api/movimientos?tipo=despacho', '/api/movimientos?tipo=traspaso', '/api/movimientos?tipo=devolucion'];`,
  `    const bId = this.bodegaSeleccionadaId();
    const bSuf = bId ? ('&bodega=' + bId) : '';
    const claves = ['mov_recepcion_' + (bId || 'todas'), 'mov_despacho_' + (bId || 'todas'), 'mov_traspaso_' + (bId || 'todas'), 'mov_devolucion_' + (bId || 'todas')];
    const rutas = ['/api/movimientos?tipo=recepcion' + bSuf, '/api/movimientos?tipo=despacho' + bSuf, '/api/movimientos?tipo=traspaso' + bSuf, '/api/movimientos?tipo=devolucion' + bSuf];`,
);

// 5. movFarmacia(): mismo criterio.
reemplazar(
  `    const claves = ['farm_donacion', 'farm_traspaso', 'farm_despacho', 'farm_vale'];
    const rutas = ['/api/movimientos?tipo=donacion', '/api/movimientos?tipo=traspaso', '/api/movimientos?tipo=despacho', '/api/movimientos?tipo=vale_consumo'];`,
  `    const bId = this.bodegaSeleccionadaId();
    const bSuf = bId ? ('&bodega=' + bId) : '';
    const claves = ['farm_donacion_' + (bId || 'todas'), 'farm_traspaso_' + (bId || 'todas'), 'farm_despacho_' + (bId || 'todas'), 'farm_vale_' + (bId || 'todas')];
    const rutas = ['/api/movimientos?tipo=donacion' + bSuf, '/api/movimientos?tipo=traspaso' + bSuf, '/api/movimientos?tipo=despacho' + bSuf, '/api/movimientos?tipo=vale_consumo' + bSuf];`,
);

lines[TEMPLATE_LINE] = JSON.stringify(template).replace(/<\//g, "<\\/");
fs.writeFileSync(filePath, lines.join("\n"));
console.log("OK. Selector de bodega del header corregido:", filePath);
