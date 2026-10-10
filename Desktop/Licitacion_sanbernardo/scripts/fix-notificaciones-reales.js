// El usuario pidió que al cliquear una notificación del sistema (ícono
// de campana) te lleve de inmediato a donde ocurre esa alerta, "sin
// tener que buscarlo". El clic en sí YA estaba conectado
// (sc-camel-on-click="{{ n.go }}" en la lista de notificaciones), pero
// apuntaba siempre a un destino fijo ('despachos' o 'temperatura')
// porque las 3 notificaciones eran datos de ejemplo inventados
// ("CESFAM Joan Alsina", "Farmacia Dr. Andrade"), no alertas reales.
// Se reemplaza por las alertas reales ya construidas en /api/alertas
// (mismas que usa la página Alertas y el contador del dashboard), cada
// una con un destino específico según su tipo: stock bajo -> pestaña
// Faltantes de Abastecimiento, vencimiento -> pestaña Ajustes de
// Inventario, temperatura -> Control de temperatura, reparos ->
// Consulta de despachos. También se corrige el contador "3" fijo del
// encabezado, el punto rojo de la campana (ahora solo aparece si hay
// alertas reales) y el aviso del pie que decía (incorrectamente) que
// todas las notificaciones llevan a Consulta de despachos.
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
    throw new Error("No se encontró el texto exacto (notificaciones reales):\n" + desde.slice(0, 400));
  }
  template = template.replace(desde, () => hasta);
}

// 1. Datos reales + destino específico por tipo de alerta, en vez del
//    arreglo de 3 notificaciones de ejemplo con destino fijo.
reemplazar(
  `      notifications: [
        { title: 'Recepción con reparos · CESFAM Joan Alsina', body: 'Guía DES-04780 · 2 ítems con diferencia de cantidad', time: 'Hace 18 minutos', icon: ic('alert', 15), color: 'var(--danger)', go: this.go('despachos') },
        { title: 'Recepción con reparos · Farmacia Dr. Andrade', body: 'Guía DES-04766 · 1 ítem con empaque dañado', time: 'Hace 2 horas', icon: ic('alert', 15), color: 'var(--danger)', go: this.go('despachos') },
        { title: 'Cadena de frío sin registro', body: 'Bodega refrigerada 2 · último registro hace 7 horas', time: 'Hace 3 horas', icon: ic('thermo', 15), color: 'var(--warning)', go: this.go('temperatura') }
      ],`,
  `      notifications: (this.cargarLista('alertas', '/api/alertas') || []).slice(0, 6).map(a => {
        const NOTIF_ICON = { stock_bajo: 'cart', vencimiento: 'calendar', temperatura: 'thermo', reparos: 'alert' };
        const NOTIF_COLOR = { alta: 'var(--danger)', media: 'var(--warning)', baja: 'var(--info)' };
        const NOTIF_DESTINO = {
          stock_bajo: () => this.setState({ page: 'abastecimiento', tab: 1, dd: null, modal: null, drawer: false, navOpen: false, estadoOverride: null, form: {}, busquedaTabla: '' }),
          vencimiento: () => this.setState({ page: 'inventario', tab: 1, dd: null, modal: null, drawer: false, navOpen: false, estadoOverride: null, form: {}, busquedaTabla: '' }),
          temperatura: this.go('temperatura'),
          reparos: this.go('despachos')
        };
        return {
          title: a.titulo, body: a.detalle, time: this.fechaCorta(a.fecha),
          icon: ic(NOTIF_ICON[a.tipo] || 'alert', 15), color: NOTIF_COLOR[a.severidad] || 'var(--info)',
          go: NOTIF_DESTINO[a.tipo] || this.go('alertas')
        };
      }),
      notifHayAlertas: (this.cargarLista('alertas', '/api/alertas') || []).length > 0,
      notifSinAlertas: (this.cargarLista('alertas', '/api/alertas') || []).length === 0,
      notifCount: (this.cargarLista('alertas', '/api/alertas') || []).length,`,
);

// 2. El punto rojo del ícono de campana: antes siempre visible, ahora
//    solo si hay alertas reales.
reemplazar(
  `<button sc-camel-on-click="{{ toggleNotif }}" style="width:34px;height:34px;flex-shrink:0;display:flex;align-items:center;justify-content:center;background:var(--surface);border:1px solid var(--border-2);border-radius:6px;cursor:pointer;position:relative;color:var(--fg-2)" style-hover="background:var(--bg-3)">
{{ iconBell }}
<span style="position:absolute;top:5px;right:5px;width:7px;height:7px;border-radius:50%;background:var(--danger);border:2px solid var(--surface)"></span>
</button>`,
  `<button sc-camel-on-click="{{ toggleNotif }}" style="width:34px;height:34px;flex-shrink:0;display:flex;align-items:center;justify-content:center;background:var(--surface);border:1px solid var(--border-2);border-radius:6px;cursor:pointer;position:relative;color:var(--fg-2)" style-hover="background:var(--bg-3)">
{{ iconBell }}
<sc-if value="{{ notifHayAlertas }}" hint-placeholder-val="{{ true }}">
<span style="position:absolute;top:5px;right:5px;width:7px;height:7px;border-radius:50%;background:var(--danger);border:2px solid var(--surface)"></span>
</sc-if>
</button>`,
);

// 3. Contador real en el encabezado del panel (antes "3" fijo).
reemplazar(
  `<span style="font-size:13px;font-weight:600">Notificaciones</span>
<span style="font-family:var(--font-mono);font-size:10px;font-weight:600;padding:1px 6px;border-radius:999px;background:var(--danger-bg);color:var(--danger)">3</span>
</div>`,
  `<span style="font-size:13px;font-weight:600">Notificaciones</span>
<span style="font-family:var(--font-mono);font-size:10px;font-weight:600;padding:1px 6px;border-radius:999px;background:var(--danger-bg);color:var(--danger)">{{ notifCount }}</span>
</div>`,
);

// 4. Estado vacío real (antes no existía: con 0 alertas quedaba un
//    panel en blanco con el pie de página igual) + pie de página
//    corregido (ya no todas van a Consulta de despachos).
reemplazar(
  `<sc-for list="{{ notifications }}" as="n" hint-placeholder-count="3">
<button sc-camel-on-click="{{ n.go }}" style="display:flex;gap:10px;width:100%;padding:11px 13px;border:none;border-bottom:1px solid var(--border-1);background:transparent;cursor:pointer;text-align:left" style-hover="background:var(--bg-3)">
<span style="display:flex;flex-shrink:0;margin-top:1px;color:{{ n.color }}">{{ n.icon }}</span>
<span style="flex:1;min-width:0">
<span style="display:block;font-size:12.5px;font-weight:500;color:var(--fg-1);line-height:1.35">{{ n.title }}</span>
<span style="display:block;font-size:11.5px;color:var(--fg-3);line-height:1.4;margin-top:2px">{{ n.body }}</span>
<span style="display:block;font-size:10.5px;color:var(--fg-4);margin-top:4px">{{ n.time }}</span>
</span>
</button>
</sc-for>
<div style="padding:8px 13px;font-size:11px;color:var(--fg-4);background:var(--bg-2)">Interfaz 28 · cada aviso lleva a Consulta de despachos</div>`,
  `<sc-if value="{{ notifHayAlertas }}" hint-placeholder-val="{{ true }}">
<sc-for list="{{ notifications }}" as="n" hint-placeholder-count="3">
<button sc-camel-on-click="{{ n.go }}" style="display:flex;gap:10px;width:100%;padding:11px 13px;border:none;border-bottom:1px solid var(--border-1);background:transparent;cursor:pointer;text-align:left" style-hover="background:var(--bg-3)">
<span style="display:flex;flex-shrink:0;margin-top:1px;color:{{ n.color }}">{{ n.icon }}</span>
<span style="flex:1;min-width:0">
<span style="display:block;font-size:12.5px;font-weight:500;color:var(--fg-1);line-height:1.35">{{ n.title }}</span>
<span style="display:block;font-size:11.5px;color:var(--fg-3);line-height:1.4;margin-top:2px">{{ n.body }}</span>
<span style="display:block;font-size:10.5px;color:var(--fg-4);margin-top:4px">{{ n.time }}</span>
</span>
</button>
</sc-for>
<div style="padding:8px 13px;font-size:11px;color:var(--fg-4);background:var(--bg-2)">Cada aviso te lleva directo al detalle de esa alerta</div>
</sc-if>
<sc-if value="{{ notifSinAlertas }}" hint-placeholder-val="{{ false }}">
<div style="padding:22px 13px;text-align:center;font-size:12px;color:var(--fg-4)">Sin alertas por ahora</div>
</sc-if>`,
);

lines[TEMPLATE_LINE] = JSON.stringify(template).replace(/<\//g, "<\\/");
fs.writeFileSync(filePath, lines.join("\n"));
console.log("OK. Notificaciones reales: datos de /api/alertas y cada clic va al destino correcto:", filePath);
