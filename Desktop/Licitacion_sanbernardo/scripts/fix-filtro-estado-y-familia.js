// El usuario reportó que el filtro de Estado no funcionaba: al
// cliquearlo, no se abría ningún desplegable — en vez de eso, la
// tabla quedaba en "0 de 0" y aparecía un aviso "Filtro aplicado".
//
// Causa real encontrada viendo la app en vivo: existe un transform
// GENÉRICO (de antes, para las pastillas de filtro 100% decorativas
// que ya había en otras pantallas, como "Agrupar por: Familia") que
// SIEMPRE sobrescribe el "go" de cualquier filtro con una llamada
// falsa a API.aplicarFiltro — sin importar que el filtro ya trajera
// su propio "go" real. Esa llamada falsa, al "tener éxito", limpia
// TODO el caché de listas cargadas (listas: {}), por eso la tabla se
// veía vacía — no era el filtro de Estado en sí, era este mecanismo
// de antes pisando el filtro nuevo.
//
// Arreglo: el transform genérico ahora respeta un "go" real si el
// filtro ya lo trae, y solo cae al mock si no (así no se tocan los
// otros filtros decorativos de otras pantallas que no se pidió
// arreglar ahora).
//
// De paso se agrega el segundo filtro pedido: "Familia" (del
// artículo), con el mismo mecanismo real, encadenado después del de
// Estado (se calcula sobre lo que ya dejó el filtro de Estado). Si una
// pestaña no tiene artículos asociados (ej. despacho a cuentas
// internas sin lote), el filtro de Familia simplemente no aparece en
// vez de mostrar una lista vacía inútil.
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

function reemplazarUna(contenedor, desde, hasta, contexto) {
  if (!contenedor.includes(desde)) {
    throw new Error("No se encontró el texto exacto (" + contexto + "):\n" + desde.slice(0, 300));
  }
  return contenedor.replace(desde, () => hasta);
}

// 1. La causa raíz: el transform genérico de filters ya no pisa un
//    "go" real.
template = reemplazarUna(
  template,
  `      filters: (page.filters || []).map(f => Object.assign({}, f, {
        go: this.run('aplicarFiltro', { campo: f.label, valor: f.value })
      })),`,
  `      filters: (page.filters || []).map(f => Object.assign({}, f, {
        go: f.go || this.run('aplicarFiltro', { campo: f.label, valor: f.value })
      })),`,
  "transform genérico de filters",
);

// 2. Nuevo helper: filtro por Familia del artículo, mismo patrón que
//    el de Estado pero que no se muestra si la pestaña no tiene datos
//    de artículo (en vez de un filtro vacío e inútil).
template = reemplazarUna(
  template,
  `  filtroEstadoControl = (filas) => {`,
  `  filtroFamiliaControl = (filas) => {
    const actual = this.state.filtroFamilia;
    const conteo = {};
    filas.forEach(m => {
      const lote = this.desanidar(m.lote);
      const articulo = lote ? this.desanidar(lote.articulo) : null;
      const familia = articulo && articulo.familia;
      if (familia) conteo[familia] = (conteo[familia] || 0) + 1;
    });
    const familias = Object.keys(conteo).sort();
    if (familias.length === 0) return null;
    const elegir = (valor) => () => this.setState({ filtroFamilia: valor, dd: null });
    const opciones = [{ label: 'Todas', count: filas.length, go: elegir(null), bg: actual ? 'transparent' : 'var(--brand-blue-050)' }]
      .concat(familias.map(f => ({ label: f, count: conteo[f], go: elegir(f), bg: actual === f ? 'var(--brand-blue-050)' : 'transparent' })));
    const filtro = {
      label: 'Familia', value: actual || 'Todas', icon: ic('filter', 13),
      go: this.dd('filtroFamilia'), ddAbierto: this.state.dd === 'filtroFamilia', opciones
    };
    const filasFiltradas = actual ? filas.filter(m => {
      const lote = this.desanidar(m.lote);
      const articulo = lote ? this.desanidar(lote.articulo) : null;
      return !!articulo && articulo.familia === actual;
    }) : filas;
    return { filtro, filasFiltradas };
  };
  filtroEstadoControl = (filas) => {`,
  "nuevo helper filtroFamiliaControl",
);

// 3. Estado inicial: nuevo campo para el filtro de Familia.
template = reemplazarUna(
  template,
  `    chartTooltipKey: null, columnasPagina: {}, busquedaTabla: '', filtroEstado: null,`,
  `    chartTooltipKey: null, columnasPagina: {}, busquedaTabla: '', filtroEstado: null, filtroFamilia: null,`,
  "estado inicial filtroFamilia",
);

// 4. Al cambiar de pestaña, también se olvida el filtro de Familia.
template = reemplazarUna(
  template,
  `          go: () => this.setState({ tab: t.i, modal: null, filtroEstado: null }),`,
  `          go: () => this.setState({ tab: t.i, modal: null, filtroEstado: null, filtroFamilia: null }),`,
  "reset de filtroFamilia al cambiar de tab",
);

lines[TEMPLATE_LINE] = JSON.stringify(template).replace(/<\//g, "<\\/");
fs.writeFileSync(filePath, lines.join("\n"));
console.log("OK. Paso A: causa raíz arreglada + helper de Familia agregado:", filePath);
