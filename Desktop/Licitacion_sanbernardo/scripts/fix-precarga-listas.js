// El usuario reportó que cada sección solo carga sus datos la primera
// vez que la visita (cargarLista pide el fetch recién cuando esa
// página se renderiza), dejando un hueco incómodo de "¿cargó o no?"
// al navegar. Se agrega una precarga real: apenas se confirma el rol
// del usuario (después de /api/auth/me), se disparan en paralelo
// todas las listas que ESE rol puede llegar a ver, usando el mismo
// cargarLista de siempre — como ya guarda en caché por clave, cuando
// el usuario de verdad entra a cada pantalla los datos ya están ahí.
// Se filtra por rol (en vez de precargar todo para todos) para no
// generar llamadas de más a endpoints que ese rol nunca va a visitar.
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
    throw new Error("No se encontró el texto exacto (precarga de listas):\n" + desde.slice(0, 400));
  }
  template = template.replace(desde, () => hasta);
}

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
      this.setState({ nombreUsuario: nombre, iniciales, role });
      this.precargarListas(role);
    }).catch(() => {});
  };

  // Dispara, apenas se conoce el rol real, todas las listas que ese
  // rol puede ver desde el menú — así cada sección ya tiene sus datos
  // en caché cuando el usuario navega a ella por primera vez.
  precargarListas = (role) => {
    const bId = this.bodegaSeleccionadaId();
    const bClave = bId || 'todas';
    const bSuf = bId ? ('&bodega=' + bId) : '';
    const bPrefijo = bId ? ('?bodega=' + bId) : '';
    const desde = this.state.analisisDesde;
    const hasta = this.state.analisisHasta;

    this.cargarLista('articulos_list', '/api/articulos');
    this.cargarLista('proveedores_list', '/api/proveedores');

    if (role === 'Administrador' || role === 'Droguería' || role === 'Finanzas') {
      this.cargarLista('alertas', '/api/alertas');
      this.cargarLista('analiticas_resumen', '/api/analiticas/resumen');
      this.cargarLista('mapa_calor', '/api/reportes/mapa-calor');
      this.cargarLista('despachos_consulta', '/api/despachos');
      this.cargarLista('mov_recepcion_' + bClave, '/api/movimientos?tipo=recepcion' + bSuf);
      this.cargarLista('mov_despacho_' + bClave, '/api/movimientos?tipo=despacho' + bSuf);
      this.cargarLista('mov_traspaso_' + bClave, '/api/movimientos?tipo=traspaso' + bSuf);
      this.cargarLista('mov_devolucion_' + bClave, '/api/movimientos?tipo=devolucion' + bSuf);
      this.cargarLista('abastecimiento_faltantes_' + bClave, '/api/abastecimiento/faltantes' + bPrefijo);
      this.cargarLista('abastecimiento_ordenes_' + bClave, '/api/abastecimiento/ordenes' + bPrefijo);
      this.cargarLista('analisis_detalle_d_' + desde + '_' + hasta, '/api/analisis-consumo/detalle?agrupar=familia&desde=' + desde + '&hasta=' + hasta);
    }
    if (role === 'Administrador' || role === 'Droguería') {
      this.cargarLista('temperatura_' + bClave, '/api/temperatura/registros' + bPrefijo);
      this.cargarLista('inventario_vencidos_' + bClave, '/api/inventario/lotes-vencidos' + bPrefijo);
      this.cargarLista('inventario_tomas_' + bClave, '/api/inventario/tomas' + bPrefijo);
    }
    if (role === 'Administrador' || role === 'Finanzas') {
      this.cargarLista('centros_admin', '/api/centros-costo');
      this.cargarLista('auditoria', '/api/log-auditoria');
      this.cargarLista('exportaciones', '/api/exportaciones');
    }
    if (role === 'Administrador') {
      this.cargarLista('dashboard_resumen', '/api/dashboard/resumen');
      this.cargarLista('usuarios', '/api/usuarios');
      this.cargarLista('bodegas_admin', '/api/bodegas');
    }
    if (role === 'Administrador' || role === 'Cliente Interno') {
      this.cargarLista('farm_donacion_' + bClave, '/api/movimientos?tipo=donacion' + bSuf);
      this.cargarLista('farm_traspaso_' + bClave, '/api/movimientos?tipo=traspaso' + bSuf);
      this.cargarLista('farm_despacho_' + bClave, '/api/movimientos?tipo=despacho' + bSuf);
      this.cargarLista('farm_vale_' + bClave, '/api/movimientos?tipo=vale_consumo' + bSuf);
      this.cargarLista('recepciones_od', '/api/despachos');
      this.cargarLista('inventario_vencidos_' + bClave, '/api/inventario/lotes-vencidos' + bPrefijo);
      this.cargarLista('inventario_tomas_' + bClave, '/api/inventario/tomas' + bPrefijo);
      this.cargarLista('analisis_detalle_f_' + desde + '_' + hasta, '/api/analisis-consumo/detalle?agrupar=familia&desde=' + desde + '&hasta=' + hasta);
    }
  };`,
);

lines[TEMPLATE_LINE] = JSON.stringify(template).replace(/<\//g, "<\\/");
fs.writeFileSync(filePath, lines.join("\n"));
console.log("OK. Precarga de listas por rol al confirmar sesión:", filePath);
