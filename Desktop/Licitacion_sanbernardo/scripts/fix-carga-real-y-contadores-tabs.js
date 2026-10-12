// Dos problemas reales detrás de "no cargan los datos, se demoran
// demasiado, y no se sabe si hay datos en las pestañas":
//
// 1. Varias páginas con tabs (Movimientos, Movimientos Farmacia,
//    Inventario, Abastecimiento) sólo pedían al backend los datos del
//    tab ACTIVO. El contador de las otras pestañas se leía
//    directamente de this.state.listas sin haberlo pedido nunca, así
//    que mostraba "0" aunque sí hubiera datos — simplemente nadie los
//    había ido a buscar todavía. En Abastecimiento esto era aún peor:
//    las claves usadas para el contador (abastecimiento_ordenes /
//    abastecimiento_faltantes) ni siquiera coincidían con las claves
//    reales con las que se guardan los datos (que llevan sufijo de
//    bodega) — el contador iba a estar SIEMPRE en 0, sin importar
//    cuánto se esperara.
//
// 2. No existía ninguna señal real de "cargando": estadoDatos() sólo
//    servía para una demo (Tweaks) y por defecto siempre devolvía
//    'Datos', aunque cargarLista todavía no hubiera recibido
//    respuesta. Por eso, mientras el pedido real estaba en camino, la
//    tabla se veía igual que si estuviera vacía — no había forma de
//    distinguir "todavía está cargando" de "no hay nada". La
//    plantilla ya tenía armado un esqueleto de carga (showLoading /
//    skeletonRows) para esto — sólo faltaba conectarlo a la carga
//    real en vez de a un interruptor de demo.
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

function reemplazarTodas(desde, hasta, tag, esperadas) {
  const partes = template.split(desde);
  if (partes.length - 1 !== esperadas) {
    throw new Error(
      "Se esperaban " + esperadas + " coincidencias para '" + tag + "' pero se encontraron " + (partes.length - 1),
    );
  }
  template = partes.join(hasta);
}

// 1. cargarLista ahora deja constancia de si, durante este render,
//    alguna lista todavía no había llegado (undefined = nunca pedida,
//    null = pedida pero sin respuesta todavía).
reemplazar(
  `  cargarLista = (clave, ruta) => {
    if (this.state.listas[clave] === undefined) {
      this.setState((s) => ({ listas: Object.assign({}, s.listas, { [clave]: null }) }));
      fetch(ruta)
        .then((r) => r.json())
        .then((d) => {
          this.setState((s) => ({
            listas: Object.assign({}, s.listas, { [clave]: d.data || [] }),
          }));
        })
        .catch(() => {
          this.setState((s) => {
            const listas = Object.assign({}, s.listas);
            delete listas[clave];
            return { listas };
          });
        });
    }
    return this.state.listas[clave] || [];
  };`,
  `  cargarLista = (clave, ruta) => {
    const actual = this.state.listas[clave];
    if (actual === undefined) {
      this.setState((s) => ({ listas: Object.assign({}, s.listas, { [clave]: null }) }));
      fetch(ruta)
        .then((r) => r.json())
        .then((d) => {
          this.setState((s) => ({
            listas: Object.assign({}, s.listas, { [clave]: d.data || [] }),
          }));
        })
        .catch(() => {
          this.setState((s) => {
            const listas = Object.assign({}, s.listas);
            delete listas[clave];
            return { listas };
          });
        });
    }
    if (actual === undefined || actual === null) this._cargandoListas = true;
    return actual || [];
  };`,
  "cargarLista",
);

// 2. estadoDatos(): sin anulación manual (demo), ahora refleja la
//    carga real en vez de asumir siempre 'Datos'.
reemplazar(
  `  /* Alterna el estado de la vista (Datos / Carga / Vacío / Error) sin lógica real.
     El valor por defecto viene del prop "estadoDatos" del panel de Tweaks. */
  estadoDatos = () => this.state.estadoOverride || this.props.estadoDatos || 'Datos';`,
  `  /* Antes esto sólo alternaba para la demo (Tweaks); ahora, sin una
     anulación manual, refleja si de verdad hay alguna lista todavía
     esperando respuesta (cargarLista va marcando _cargandoListas),
     para mostrar "Cargando…" real en vez de una tabla que se ve
     vacía mientras el pedido sigue en camino. */
  estadoDatos = () => this.state.estadoOverride || this.props.estadoDatos || (this._cargandoListas ? 'Carga' : 'Datos');`,
  "estadoDatos",
);

// 3. renderVals: la bandera se reinicia en cada render, antes de
//    construir la página (que es la que llama a cargarLista).
reemplazar(
  `  renderVals() {
    const s = this.state;
    const role = s.role;
    const page = this.page();`,
  `  renderVals() {
    const s = this.state;
    const role = s.role;
    this._cargandoListas = false;
    const page = this.page();`,
  "renderVals",
);

// 4. Movimientos (Droguería) y Movimientos (Farmacia): piden los 4
//    tabs en paralelo, no sólo el activo, para que los contadores de
//    las otras pestañas sean reales desde el principio.
reemplazarTodas(
  `    const filas = this.cargarLista(claves[t], rutas[t]);
    const counts = claves.map(c => (this.state.listas[c] || []).length);`,
  `    const listasPorTab = claves.map((c, i) => this.cargarLista(c, rutas[i]));
    const filas = listasPorTab[t];
    const counts = listasPorTab.map(l => l.length);`,
  "movimientos/movFarmacia counts",
  2,
);

// 5. Inventario: pide "Toma de inventario" y "Ajustes" siempre juntos
//    (antes sólo pedía el tab activo) y los contadores usan esos
//    mismos datos en vez de leer el estado por separado.
reemplazar(
  `    const bPrefijo = bId ? ('?bodega=' + bId) : '';
    const base = {
      isList: true,
      eyebrow: farmacia ? 'FARMACIA · INTERFAZ 22' : 'DROGUERÍA · INTERFAZ 17',
      title: farmacia ? 'Inventario (Farmacia)' : 'Inventario',
      secondary: [{ label: 'Exportar', icon: ic('download', 13), fn: 'exportarInventario' }, { label: 'Imprimir', icon: ic('printer', 13), fn: 'imprimirInventario' }],
      tabs: [{ label: 'Toma de inventario', count: (this.state.listas['inventario_tomas_' + (bId || 'todas')] || []).length, i: 0 }, { label: 'Ajustes', count: (this.state.listas['inventario_vencidos_' + (bId || 'todas')] || []).length, i: 1 }]
    };
    if (t === 1) {
      const vencidos = this.cargarLista('inventario_vencidos_' + (bId || 'todas'), '/api/inventario/lotes-vencidos' + bPrefijo);
      return Object.assign(base, {`,
  `    const bPrefijo = bId ? ('?bodega=' + bId) : '';
    const vencidos = this.cargarLista('inventario_vencidos_' + (bId || 'todas'), '/api/inventario/lotes-vencidos' + bPrefijo);
    const tomas = this.cargarLista('inventario_tomas_' + (bId || 'todas'), '/api/inventario/tomas' + bPrefijo);
    const base = {
      isList: true,
      eyebrow: farmacia ? 'FARMACIA · INTERFAZ 22' : 'DROGUERÍA · INTERFAZ 17',
      title: farmacia ? 'Inventario (Farmacia)' : 'Inventario',
      secondary: [{ label: 'Exportar', icon: ic('download', 13), fn: 'exportarInventario' }, { label: 'Imprimir', icon: ic('printer', 13), fn: 'imprimirInventario' }],
      tabs: [{ label: 'Toma de inventario', count: tomas.length, i: 0 }, { label: 'Ajustes', count: vencidos.length, i: 1 }]
    };
    if (t === 1) {
      return Object.assign(base, {`,
  "inventario setup",
);

reemplazar(
  `    const tomas = this.cargarLista('inventario_tomas_' + (bId || 'todas'), '/api/inventario/tomas' + bPrefijo);
    return Object.assign(base, {
      req: 'Anexo N°4 · realizar toma de inventario con trazabilidad completa',`,
  `    return Object.assign(base, {
      req: 'Anexo N°4 · realizar toma de inventario con trazabilidad completa',`,
  "inventario tomas (sin duplicar el pedido)",
);

// 6. Abastecimiento: mismo arreglo, más el bug de los contadores
//    (usaban claves sin el sufijo de bodega, así que nunca iban a
//    coincidir con los datos reales — siempre mostraban 0).
reemplazar(
  `    const t = this.state.tab;
    const bId = this.bodegaSeleccionadaId();
    const bPrefijo = bId ? ('?bodega=' + bId) : '';
    const base = {
      isList: true, eyebrow: 'DROGUERÍA · INTERFAZ 18', title: 'Abastecimiento',
      req: 'Anexo N°4 · bloque Abastecimientos (7 ítems)',
      secondary: [{ label: 'Exportar', icon: ic('download', 13), fn: 'exportarAbastecimiento' }],
      tabs: [{ label: 'Órdenes generadas', count: (this.state.listas.abastecimiento_ordenes || []).length, i: 0 }, { label: 'Faltantes', count: (this.state.listas.abastecimiento_faltantes || []).length, i: 1 }]
    };
    if (t === 1) {
      const faltantes = this.cargarLista('abastecimiento_faltantes_' + (bId || 'todas'), '/api/abastecimiento/faltantes' + bPrefijo);
      return Object.assign(base, {`,
  `    const t = this.state.tab;
    const bId = this.bodegaSeleccionadaId();
    const bPrefijo = bId ? ('?bodega=' + bId) : '';
    const faltantes = this.cargarLista('abastecimiento_faltantes_' + (bId || 'todas'), '/api/abastecimiento/faltantes' + bPrefijo);
    const ordenes = this.cargarLista('abastecimiento_ordenes_' + (bId || 'todas'), '/api/abastecimiento/ordenes' + bPrefijo);
    const base = {
      isList: true, eyebrow: 'DROGUERÍA · INTERFAZ 18', title: 'Abastecimiento',
      req: 'Anexo N°4 · bloque Abastecimientos (7 ítems)',
      secondary: [{ label: 'Exportar', icon: ic('download', 13), fn: 'exportarAbastecimiento' }],
      tabs: [{ label: 'Órdenes generadas', count: ordenes.length, i: 0 }, { label: 'Faltantes', count: faltantes.length, i: 1 }]
    };
    if (t === 1) {
      return Object.assign(base, {`,
  "abastecimiento setup",
);

reemplazar(
  `    const ordenes = this.cargarLista('abastecimiento_ordenes_' + (bId || 'todas'), '/api/abastecimiento/ordenes' + bPrefijo);
    return Object.assign(base, {
      primary: { label: 'Nueva orden', modal: 'orden' },`,
  `    return Object.assign(base, {
      primary: { label: 'Nueva orden', modal: 'orden' },`,
  "abastecimiento ordenes (sin duplicar el pedido)",
);

lines[TEMPLATE_LINE] = JSON.stringify(template).replace(/<\//g, "<\\/");
fs.writeFileSync(filePath, lines.join("\n"));
console.log("OK. Carga real (Cargando… en vez de tabla vacía) + contadores de tabs correctos en Movimientos, Movimientos Farmacia, Inventario y Abastecimiento:", filePath);
