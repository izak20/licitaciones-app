// El usuario reportó que la precarga por rol (agregada recién) hizo
// que la carga empeorara: al disparar ~20 peticiones en paralelo apenas
// se confirma la sesión, compiten por la misma conexión con la
// petición de la PÁGINA que el usuario está mirando en ese momento, y
// esa es la que termina más lenta (se confirmó en los logs: tiempos
// que subieron de ~300ms a ~1000-1800ms bajo la ráfaga). Además, si
// alguna de esas peticiones fallaba por la contención, cargarLista
// guardaba [] como resultado "definitivo" y nunca reintentaba ni
// aunque el usuario visitara esa pantalla después — eso explica el
// "tampoco cargan cuando abro la sección".
//
// Dos correcciones:
// 1) La precarga se reparte en tandas pequeñas, escalonadas en el
//    tiempo (no todas a la vez), dándole prioridad real a lo que el
//    usuario ya está viendo.
// 2) Si una lista falla al cargar, se olvida (vuelve a quedar
//    "undefined" en vez de quedar fija en []), así la próxima vez que
//    se pida esa clave — sea por la precarga o por visitar la
//    pantalla — se reintenta de verdad en vez de mostrar vacío para
//    siempre.
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
    throw new Error("No se encontró el texto exacto (precarga escalonada):\n" + desde.slice(0, 400));
  }
  template = template.replace(desde, () => hasta);
}

// 1. Un fallo ya no se guarda como [] para siempre: se reintentará la
//    próxima vez que se pida esa clave.
reemplazar(
  `        .catch(() => {
          this.setState((s) => ({ listas: Object.assign({}, s.listas, { [clave]: [] }) }));
        });`,
  `        .catch(() => {
          this.setState((s) => {
            const listas = Object.assign({}, s.listas);
            delete listas[clave];
            return { listas };
          });
        });`,
);

// 2. La precarga se reparte en tandas chicas y escalonadas, en vez de
//    disparar todo de golpe.
reemplazar(
  `  precargarListas = (role) => {
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
  `  precargarListas = (role) => {
    const bId = this.bodegaSeleccionadaId();
    const bClave = bId || 'todas';
    const bSuf = bId ? ('&bodega=' + bId) : '';
    const bPrefijo = bId ? ('?bodega=' + bId) : '';
    const desde = this.state.analisisDesde;
    const hasta = this.state.analisisHasta;
    const tandas = [];

    tandas.push(() => {
      this.cargarLista('articulos_list', '/api/articulos');
      this.cargarLista('proveedores_list', '/api/proveedores');
    });

    if (role === 'Administrador' || role === 'Droguería' || role === 'Finanzas') {
      tandas.push(() => {
        this.cargarLista('alertas', '/api/alertas');
        this.cargarLista('mapa_calor', '/api/reportes/mapa-calor');
        this.cargarLista('analiticas_resumen', '/api/analiticas/resumen');
      });
      tandas.push(() => {
        this.cargarLista('mov_recepcion_' + bClave, '/api/movimientos?tipo=recepcion' + bSuf);
        this.cargarLista('mov_despacho_' + bClave, '/api/movimientos?tipo=despacho' + bSuf);
        this.cargarLista('mov_traspaso_' + bClave, '/api/movimientos?tipo=traspaso' + bSuf);
        this.cargarLista('mov_devolucion_' + bClave, '/api/movimientos?tipo=devolucion' + bSuf);
      });
      tandas.push(() => {
        this.cargarLista('despachos_consulta', '/api/despachos');
        this.cargarLista('abastecimiento_faltantes_' + bClave, '/api/abastecimiento/faltantes' + bPrefijo);
        this.cargarLista('abastecimiento_ordenes_' + bClave, '/api/abastecimiento/ordenes' + bPrefijo);
        this.cargarLista('analisis_detalle_d_' + desde + '_' + hasta, '/api/analisis-consumo/detalle?agrupar=familia&desde=' + desde + '&hasta=' + hasta);
      });
    }
    if (role === 'Administrador' || role === 'Droguería') {
      tandas.push(() => {
        this.cargarLista('temperatura_' + bClave, '/api/temperatura/registros' + bPrefijo);
        this.cargarLista('inventario_vencidos_' + bClave, '/api/inventario/lotes-vencidos' + bPrefijo);
        this.cargarLista('inventario_tomas_' + bClave, '/api/inventario/tomas' + bPrefijo);
      });
    }
    if (role === 'Administrador' || role === 'Finanzas') {
      tandas.push(() => {
        this.cargarLista('centros_admin', '/api/centros-costo');
        this.cargarLista('auditoria', '/api/log-auditoria');
        this.cargarLista('exportaciones', '/api/exportaciones');
      });
    }
    if (role === 'Administrador') {
      tandas.push(() => {
        this.cargarLista('dashboard_resumen', '/api/dashboard/resumen');
        this.cargarLista('usuarios', '/api/usuarios');
        this.cargarLista('bodegas_admin', '/api/bodegas');
      });
    }
    if (role === 'Administrador' || role === 'Cliente Interno') {
      tandas.push(() => {
        this.cargarLista('farm_donacion_' + bClave, '/api/movimientos?tipo=donacion' + bSuf);
        this.cargarLista('farm_traspaso_' + bClave, '/api/movimientos?tipo=traspaso' + bSuf);
        this.cargarLista('farm_despacho_' + bClave, '/api/movimientos?tipo=despacho' + bSuf);
        this.cargarLista('farm_vale_' + bClave, '/api/movimientos?tipo=vale_consumo' + bSuf);
      });
      tandas.push(() => {
        this.cargarLista('recepciones_od', '/api/despachos');
        this.cargarLista('inventario_vencidos_' + bClave, '/api/inventario/lotes-vencidos' + bPrefijo);
        this.cargarLista('inventario_tomas_' + bClave, '/api/inventario/tomas' + bPrefijo);
        this.cargarLista('analisis_detalle_f_' + desde + '_' + hasta, '/api/analisis-consumo/detalle?agrupar=familia&desde=' + desde + '&hasta=' + hasta);
      });
    }

    // Le da 1.5s de ventaja a lo que el usuario ya está mirando, y
    // reparte el resto en tandas de 3-4 peticiones separadas por 700ms
    // en vez de dispararlas todas a la vez.
    tandas.forEach((fn, i) => setTimeout(fn, 1500 + i * 700));
  };`,
);

lines[TEMPLATE_LINE] = JSON.stringify(template).replace(/<\//g, "<\\/");
fs.writeFileSync(filePath, lines.join("\n"));
console.log("OK. Precarga escalonada y con reintento real en fallos:", filePath);
