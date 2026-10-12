// Cambios estéticos pedidos: 1) logo del login más grande y claro
// (se reemplaza por el isotipo real con texto que mandó el usuario,
// antes era solo el escudo de 30px sin texto), 2) fondo con la foto
// real del edificio municipal, difuminada, detrás del panel oscuro
// del login (antes era solo un degradado liso), 3) una explicación de
// qué significa "PMS" (Pharmacy Management System), tanto en el login
// como en el encabezado del panel principal.
//
// El fondo difuminado: la imagen va absolutamente posicionada detrás
// de todo (levemente más grande que el contenedor + filter:blur, para
// que el blur no deje ver bordes transparentes), y el degradado de
// marca que ya existía pasa a ser una capa semitransparente ENCIMA de
// la foto (en vez del fondo plano de antes) — así se nota que es el
// edificio pero sigue leyéndose el texto blanco encima, como pidió
// ("difuminado... para que se entienda qué es y se vea profesional").
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

const viejo = fs.readFileSync("/tmp/login-panel-old.txt", "utf8");
const nuevo = `<div style="position:relative;overflow:hidden;background:var(--brand-slate);color:#fff;padding:{{ loginPanelPad }};display:flex;flex-direction:column;justify-content:space-between;gap:36px">
<img src="/fondo-municipalidad.jpeg" alt="" style="position:absolute;inset:-16px;width:calc(100% + 32px);height:calc(100% + 32px);object-fit:cover;filter:blur(7px);z-index:0">
<div style="position:absolute;inset:0;background:linear-gradient(158deg,rgba(45,62,79,0.90) 0%,rgba(63,84,104,0.86) 62%,rgba(10,59,101,0.92) 100%);z-index:1"></div>
<div style="display:flex;align-items:center;gap:14px;position:relative;z-index:2">
<img src="/logo-sanbernardo.jpg" alt="Ilustre Municipalidad de San Bernardo" style="height:46px;width:auto;object-fit:contain;background:#fff;border-radius:8px;padding:7px 11px">
<span style="width:1px;height:34px;background:rgba(255,255,255,0.22)"></span>
<div>
<div style="font-size:15px;font-weight:700;letter-spacing:-0.01em">PMS <span style="font-weight:400;opacity:0.7">· Panalbit</span></div>
<div style="font-size:11px;color:rgba(255,255,255,0.65);margin-top:1px">Pharmacy Management System</div>
</div>
</div>
<div style="position:relative;max-width:460px;z-index:2">
<div style="display:flex;align-items:center;gap:9px;margin-bottom:16px">
<span style="width:22px;height:2px;background:var(--brand-orange)"></span>
<span style="font-size:10.5px;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;color:var(--brand-orange)">Droguería Comunal · Bulnes N°577</span>
</div>
<h1 style="font-size:{{ loginTitleSize }};line-height:1.12;font-weight:700;letter-spacing:-0.03em;margin:0 0 16px;text-wrap:pretty">Gestión de bodegas y abastecimiento farmacéutico</h1>
<p style="font-size:14px;line-height:1.65;color:rgba(255,255,255,0.68);margin:0;max-width:410px;text-wrap:pretty">Trazabilidad por lote y fecha de vencimiento para la red de 21 centros de salud de la comuna.</p>
<div style="display:{{ loginFeatDisplay }};flex-direction:column;gap:11px;margin-top:28px">
<sc-for list="{{ loginFeatures }}" as="f" hint-placeholder-count="3">
<div style="display:flex;align-items:center;gap:11px">
<span style="display:flex;align-items:center;justify-content:center;width:26px;height:26px;border-radius:6px;background:rgba(255,255,255,0.08);color:var(--brand-orange);flex-shrink:0">{{ f.icon }}</span>
<span style="font-size:13px;color:rgba(255,255,255,0.82)">{{ f.label }}</span>
</div>
</sc-for>
</div>
</div>
<div style="display:{{ loginStatsDisplay }};gap:32px;position:relative;padding-top:24px;border-top:1px solid rgba(255,255,255,0.12);z-index:2">
<sc-for list="{{ loginStats }}" as="s" hint-placeholder-count="3">
<div>
<div style="font-family:var(--font-mono);font-size:21px;font-weight:600;letter-spacing:-0.02em;line-height:1">{{ s.value }}</div>
<div style="font-size:10.5px;letter-spacing:0.06em;text-transform:uppercase;color:rgba(255,255,255,0.45);margin-top:6px">{{ s.label }}</div>
</div>
</sc-for>
</div>
</div>`;

if (!template.includes(viejo)) {
  throw new Error("No se encontró el bloque exacto del panel izquierdo del login.");
}
template = template.replace(viejo, () => nuevo);

// Encabezado del panel principal (sidebar): se agrega la explicación
// de qué significa PMS, debajo del nombre de la plataforma.
const encabezadoViejo = `<img src="/logo.jpeg" alt="" style="width:26px;height:26px;border-radius:5px;object-fit:contain">
<div style="min-width:0">
<div style="font-size:13px;font-weight:600;letter-spacing:-0.01em;line-height:1.2">PMS-Panalbit</div>
<div style="font-size:10px;color:var(--fg-3);line-height:1.2">San Bernardo</div>
</div>`;
const encabezadoNuevo = `<img src="/logo.jpeg" alt="" style="width:26px;height:26px;border-radius:5px;object-fit:contain;flex-shrink:0">
<div style="min-width:0">
<div style="font-size:13px;font-weight:600;letter-spacing:-0.01em;line-height:1.2">PMS-Panalbit</div>
<div style="font-size:9px;color:var(--fg-4);line-height:1.3">Pharmacy Management System</div>
<div style="font-size:10px;color:var(--fg-3);line-height:1.2">San Bernardo</div>
</div>`;
if (!template.includes(encabezadoViejo)) {
  throw new Error("No se encontró el bloque exacto del encabezado del sidebar.");
}
template = template.replace(encabezadoViejo, () => encabezadoNuevo);

lines[TEMPLATE_LINE] = JSON.stringify(template).replace(/<\//g, "<\\/");
fs.writeFileSync(filePath, lines.join("\n"));
console.log("OK. Branding: logo grande + fondo difuminado en login, explicación de PMS en login y sidebar:", filePath);
