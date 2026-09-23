// 1. El modal de recepción ya pedía "Precio unitario" pero nunca se
// enviaba al backend (no había ni columna para guardarlo). Ahora que
// existe lote.precio_unitario (migración 008), se recolecta de verdad.
// 2. El usuario pidió agrupar Artículos/Proveedores/Bodegas/Centros de
// costo/Usuarios bajo un solo ítem de menú "Mantenedores" en vez de
// repartidos entre "Maestros" y "Administración".
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
    throw new Error("No se encontró el texto exacto (precio/mantenedores):\n" + desde.slice(0, 400));
  }
  template = template.replace(desde, () => hasta);
}

// 1. Precio unitario real en la recepción.
reemplazar(
  `    if (nombre === 'registrarRecepcion') {
      const proveedor = (this.state.refProveedores || []).find(p => p.razon_social === leerModal('Proveedor'));
      const bodega = (this.state.refBodegas || []).find(b => b.nombre === leerModal('Bodega de destino'));
      const articulo = (this.state.refArticulos || []).find(a => a.nombre === leerModal('Artículo'));
      return {
        id_bodega: bodega && bodega.id_bodega,
        id_articulo: articulo && articulo.id_articulo,
        id_proveedor: proveedor && proveedor.id_proveedor,
        numero_lote: leerModal('Lote'),
        fecha_vencimiento: leerModal('Fecha de vencimiento'),
        cantidad: this.numero(leerModal('Cantidad recibida'))
      };
    }`,
  `    if (nombre === 'registrarRecepcion') {
      const proveedor = (this.state.refProveedores || []).find(p => p.razon_social === leerModal('Proveedor'));
      const bodega = (this.state.refBodegas || []).find(b => b.nombre === leerModal('Bodega de destino'));
      const articulo = (this.state.refArticulos || []).find(a => a.nombre === leerModal('Artículo'));
      return {
        id_bodega: bodega && bodega.id_bodega,
        id_articulo: articulo && articulo.id_articulo,
        id_proveedor: proveedor && proveedor.id_proveedor,
        numero_lote: leerModal('Lote'),
        fecha_vencimiento: leerModal('Fecha de vencimiento'),
        cantidad: this.numero(leerModal('Cantidad recibida')),
        precio_unitario: this.numero(leerModal('Precio unitario'))
      };
    }`,
);

// 2. Reagrupar el menú: nueva sección "Mantenedores" con Artículos,
// Proveedores, Bodegas, Centros de costo y Usuarios (conservando
// exactamente los mismos roles por ítem que tenían antes repartidos
// entre Maestros/Administración). Administración queda solo con
// Auditoría y Exportación.
reemplazar(
  `  { label: 'Maestros', items: [
    { id: 'articulos', icon: 'package', label: 'Artículos' },
    { id: 'proveedores', icon: 'truck', label: 'Proveedores' }
  ] },
  { label: 'Administración', roles: ['Administrador', 'Finanzas'], items: [
    { id: 'usuarios', icon: 'users', label: 'Usuarios', roles: ['Administrador'] },
    { id: 'bodegas', icon: 'warehouse', label: 'Bodegas', roles: ['Administrador'] },
    { id: 'centros', icon: 'wallet', label: 'Centros de costo' },
    { id: 'auditoria', icon: 'scroll', label: 'Log de auditoría' },
    { id: 'exportacion', icon: 'database', label: 'Exportación' }
  ] },`,
  `  { label: 'Mantenedores', items: [
    { id: 'articulos', icon: 'package', label: 'Artículos' },
    { id: 'proveedores', icon: 'truck', label: 'Proveedores' },
    { id: 'bodegas', icon: 'warehouse', label: 'Bodegas', roles: ['Administrador'] },
    { id: 'centros', icon: 'wallet', label: 'Centros de costo', roles: ['Administrador', 'Finanzas'] },
    { id: 'usuarios', icon: 'users', label: 'Usuarios', roles: ['Administrador'] }
  ] },
  { label: 'Administración', roles: ['Administrador', 'Finanzas'], items: [
    { id: 'auditoria', icon: 'scroll', label: 'Log de auditoría' },
    { id: 'exportacion', icon: 'database', label: 'Exportación' }
  ] },`,
);

lines[TEMPLATE_LINE] = JSON.stringify(template).replace(/<\//g, "<\\/");
fs.writeFileSync(filePath, lines.join("\n"));
console.log("OK. Precio unitario real + menú Mantenedores:", filePath);
