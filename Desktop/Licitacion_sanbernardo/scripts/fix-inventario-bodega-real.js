// "Inventario" (Droguería) e "Inventario (Farmacia)" leían la misma
// bodega del selector global de arriba — por eso mostraban
// exactamente lo mismo si no se tocaba ese selector al cambiar de
// pantalla. La nota ya dejada en el propio código para la interfaz 22
// ("idéntica a la interfaz 17, con los datos de la bodega del centro
// de salud") confirma que cada una debe quedar atada a SU bodega, no
// competir por un selector compartido:
//   - Inventario (Droguería) siempre muestra la bodega central
//     (tipo 'centro_distribucion'), sin importar qué diga el selector.
//   - Inventario (Farmacia) muestra la bodega propia del usuario
//     (perfil Cliente Interno con id_bodega asignado); si quien mira
//     no tiene una bodega fija (Administrador), usa el selector de
//     arriba pero sólo si apunta a una CESFAM real — si no, cae en la
//     primera CESFAM disponible en vez de mezclarse con la Droguería.
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

// 1. Guardar la bodega propia del usuario (ya venía en /api/auth/me,
//    pero nunca se usaba para nada).
reemplazar(
  `  cargarUsuarioActual = () => {
    fetch('/api/auth/me').then(r => r.json()).then(d => {
      const u = d && d.data;
      if (!u) return;
      const nombre = u.nombre_completo || u.email || 'Usuario';
      const iniciales = nombre.split(' ').filter(Boolean).slice(0, 2).map(p => p[0]).join('').toUpperCase() || 'U';
      const perfilNombre = u.perfil && u.perfil.nombre;
      const role = PERFIL_A_ROL[perfilNombre] || 'Administrador';
      this.setState({ nombreUsuario: nombre, iniciales, role });
      this.precargarListas(role);
    }).catch(() => {});
  };`,
  `  cargarUsuarioActual = () => {
    fetch('/api/auth/me').then(r => r.json()).then(d => {
      const u = d && d.data;
      if (!u) return;
      const nombre = u.nombre_completo || u.email || 'Usuario';
      const iniciales = nombre.split(' ').filter(Boolean).slice(0, 2).map(p => p[0]).join('').toUpperCase() || 'U';
      const perfilNombre = u.perfil && u.perfil.nombre;
      const role = PERFIL_A_ROL[perfilNombre] || 'Administrador';
      this.setState({ nombreUsuario: nombre, iniciales, role, miBodegaId: u.bodega && u.bodega.id_bodega });
      this.precargarListas(role);
    }).catch(() => {});
  };`,
  "cargarUsuarioActual",
);

// 2. Estado inicial.
reemplazar(
  `    viasActivas: null, ultimoArticuloId: null, ultimoTraspasoId: null, ultimoProveedorId: null, ordenDespachando: null, listas: {}`,
  `    viasActivas: null, ultimoArticuloId: null, ultimoTraspasoId: null, ultimoProveedorId: null, ordenDespachando: null, miBodegaId: null, listas: {}`,
  "estado inicial miBodegaId",
);

// 3. inventario(): cada pantalla queda atada a su propia bodega.
reemplazar(
  `  inventario(farmacia) {
    const t = this.state.tab;
    const bId = this.bodegaSeleccionadaId();
    const bPrefijo = bId ? ('?bodega=' + bId) : '';
    const vencidos = this.cargarLista('inventario_vencidos_' + (bId || 'todas'), '/api/inventario/lotes-vencidos' + bPrefijo);
    const tomas = this.cargarLista('inventario_tomas_' + (bId || 'todas'), '/api/inventario/tomas' + bPrefijo);
    const base = {
      isList: true,
      eyebrow: farmacia ? 'FARMACIA · INTERFAZ 22' : 'DROGUERÍA · INTERFAZ 17',
      title: farmacia ? 'Inventario (Farmacia)' : 'Inventario',
      secondary: [{ label: 'Exportar', icon: ic('download', 13), fn: 'exportarInventario' }, { label: 'Imprimir', icon: ic('printer', 13), fn: 'imprimirInventario' }],
      tabs: [{ label: 'Toma de inventario', count: tomas.length, i: 0 }, { label: 'Ajustes', count: vencidos.length, i: 1 }]
    };`,
  `  inventario(farmacia) {
    const t = this.state.tab;
    const refBodegas = this.state.refBodegas || [];
    const bodegaCentral = refBodegas.find(b => b.tipo === 'centro_distribucion');
    const bodegasCesfam = refBodegas.filter(b => b.tipo !== 'centro_distribucion');
    const seleccionGlobal = this.bodegaSeleccionadaId();
    let bId, bodegaActual;
    if (!farmacia) {
      bodegaActual = bodegaCentral;
      bId = bodegaCentral ? bodegaCentral.id_bodega : null;
    } else if (this.state.miBodegaId) {
      bodegaActual = refBodegas.find(b => b.id_bodega === this.state.miBodegaId);
      bId = this.state.miBodegaId;
    } else {
      const seleccionEsCesfam = seleccionGlobal && bodegasCesfam.some(b => b.id_bodega === seleccionGlobal);
      bodegaActual = seleccionEsCesfam ? bodegasCesfam.find(b => b.id_bodega === seleccionGlobal) : bodegasCesfam[0];
      bId = bodegaActual ? bodegaActual.id_bodega : null;
    }
    const bPrefijo = bId ? ('?bodega=' + bId) : '';
    const vencidos = this.cargarLista('inventario_vencidos_' + (bId || 'todas'), '/api/inventario/lotes-vencidos' + bPrefijo);
    const tomas = this.cargarLista('inventario_tomas_' + (bId || 'todas'), '/api/inventario/tomas' + bPrefijo);
    const base = {
      isList: true,
      eyebrow: farmacia ? 'FARMACIA · INTERFAZ 22' : 'DROGUERÍA · INTERFAZ 17',
      title: (farmacia ? 'Inventario (Farmacia)' : 'Inventario') + (bodegaActual ? ' · ' + bodegaActual.nombre : ''),
      secondary: [{ label: 'Exportar', icon: ic('download', 13), fn: 'exportarInventario' }, { label: 'Imprimir', icon: ic('printer', 13), fn: 'imprimirInventario' }],
      tabs: [{ label: 'Toma de inventario', count: tomas.length, i: 0 }, { label: 'Ajustes', count: vencidos.length, i: 1 }]
    };`,
  "inventario bodega real",
);

lines[TEMPLATE_LINE] = JSON.stringify(template).replace(/<\//g, "<\\/");
fs.writeFileSync(filePath, lines.join("\n"));
console.log("OK. Inventario (Droguería) e Inventario (Farmacia) ahora quedan atados a su propia bodega, no al selector compartido:", filePath);
