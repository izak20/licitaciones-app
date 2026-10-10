// El Panel de Inicio (vista Administrador) mostraba KPIs de ejemplo
// fijos ("1.284 artículos activos", "3.412 movimientos del mes", "47
// usuarios conectados"...) sin ninguna consulta real detrás. Se
// conectan a /api/dashboard/resumen (nuevo) y la lista de actividad
// reciente pasa a usar el log de auditoría real en vez de nombres de
// ejemplo inventados.
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
    throw new Error("No se encontró el texto exacto (dashboard admin real):\n" + desde.slice(0, 400));
  }
  template = template.replace(desde, () => hasta);
}

reemplazar(
  `    return Object.assign(base, {
      kpis: [
        { label: 'Artículos activos', value: '1.284', sub: '96 controlados · 41 cadena de frío', accent: '#115B99' },
        { label: 'Movimientos del mes', value: '3.412', sub: 'recepción, despacho, traspaso', accent: '#FAA16B' },
        { label: 'Recepciones con reparos', value: '3', sub: 'requieren gestión', accent: '#C0362C' },
        { label: 'Usuarios conectados', value: '47', sub: 'de 62 habilitados', accent: '#1F8A5B' }
      ],
      shortcuts: [
        { icon: ic('users', 18), label: 'Usuarios y perfiles', sub: 'Interfaz 3', go: this.go('usuarios') },
        { icon: ic('warehouse', 18), label: 'Bodegas y sub-bodegas', sub: 'Interfaz 5', go: this.go('bodegas') },
        { icon: ic('swap', 18), label: 'Movimientos', sub: 'Interfaz 15', go: this.go('movimientos') },
        { icon: ic('scroll', 18), label: 'Log de auditoría', sub: 'Interfaz 7', go: this.go('auditoria') }
      ].concat(accesosInteligencia),
      listTitle: 'Últimos movimientos del sistema',
      items: [
        { title: 'm.orellana creó el artículo ART-001301', sub: 'Fentanilo 0,05 mg/ml ampolla', meta: '09:41', dot: '#115B99' },
        { title: 'p.reyes registró recepción de Laboratorio Chile', sub: '24 ítems · lote L-2291', meta: '09:12', dot: '#1F8A5B' },
        { title: 'j.alsina informó recepción con reparos', sub: 'Guía DES-04780', meta: '08:55', dot: '#C0362C' },
        { title: 'c.munoz editó el perfil de v.tapia', sub: 'Cliente Interno → Droguería', meta: 'Ayer', dot: '#C77400' },
        { title: 'Exportación completa generada', sub: 'CSV UTF-8 · 84 MB', meta: 'Ayer', dot: '#8494A6' }
      ]
    });
  }`,
  `    const resumen = this.cargarLista('dashboard_resumen', '/api/dashboard/resumen') || {};
    const ACCION_LABEL = { INSERT: 'creó', UPDATE: 'actualizó', DELETE: 'eliminó' };
    return Object.assign(base, {
      kpis: [
        { label: 'Artículos activos', value: String(resumen.articulos_activos ?? '—'), sub: (resumen.articulos_controlados ?? 0) + ' controlados · ' + (resumen.articulos_cadena_frio ?? 0) + ' cadena de frío', accent: '#115B99' },
        { label: 'Movimientos del mes', value: String(resumen.movimientos_mes ?? '—'), sub: 'recepción, despacho, traspaso', accent: '#FAA16B' },
        { label: 'Recepciones con reparos', value: String(resumen.recepciones_con_reparos ?? '—'), sub: 'requieren gestión', accent: '#C0362C' },
        { label: 'Usuarios activos', value: String(resumen.usuarios_activos ?? '—'), sub: 'de ' + (resumen.usuarios_total ?? '—') + ' habilitados', accent: '#1F8A5B' }
      ],
      shortcuts: [
        { icon: ic('users', 18), label: 'Usuarios y perfiles', sub: 'Interfaz 3', go: this.go('usuarios') },
        { icon: ic('warehouse', 18), label: 'Bodegas y sub-bodegas', sub: 'Interfaz 5', go: this.go('bodegas') },
        { icon: ic('swap', 18), label: 'Movimientos', sub: 'Interfaz 15', go: this.go('movimientos') },
        { icon: ic('scroll', 18), label: 'Log de auditoría', sub: 'Interfaz 7', go: this.go('auditoria') }
      ].concat(accesosInteligencia),
      listTitle: 'Últimos movimientos del sistema',
      items: (resumen.actividad_reciente || []).map(a => ({
        title: (a.usuario || 'Sistema') + ' ' + (ACCION_LABEL[a.accion] || String(a.accion || '').toLowerCase()) + ' un registro de ' + String(a.entidad || '').replace(/_/g, ' '),
        sub: '',
        meta: String(a.fecha_hora || '').slice(0, 16).replace('T', ' '),
        dot: '#115B99'
      }))
    });
  }`,
);

lines[TEMPLATE_LINE] = JSON.stringify(template).replace(/<\//g, "<\\/");
fs.writeFileSync(filePath, lines.join("\n"));
console.log("OK. Panel de Inicio (Administrador): KPIs y actividad real:", filePath);
