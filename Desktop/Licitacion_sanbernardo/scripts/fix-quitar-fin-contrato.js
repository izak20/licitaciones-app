// El usuario pidió quitar el recuadro "Fin de contrato" (solicitar
// eliminación segura de datos) de la pantalla de Exportación: es algo
// que se tramita internamente (reunión, correo, etc.), no un botón
// directo en la plataforma.
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
    throw new Error("No se encontró el texto exacto (quitar fin de contrato):\n" + desde.slice(0, 400));
  }
  template = template.replace(desde, () => hasta);
}

reemplazar(
  `<div style="background:var(--danger-bg);border:1px solid var(--danger-border);border-radius:8px;padding:20px">
<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;color:var(--danger)">
<span style="display:flex">{{ iconAlert }}</span>
<span style="font-size:14px;font-weight:600">Fin de contrato</span>
</div>
<p style="font-size:12.5px;line-height:1.55;color:var(--fg-2);margin:0 0 16px;max-width:600px">Al término del contrato, Panalbit entrega la exportación completa en formatos abiertos y procede a la eliminación segura de todos los datos, emitiendo el certificado correspondiente. La acción requiere doble confirmación y queda registrada en el log de auditoría.</p>
<button sc-camel-on-click="{{ openEliminar }}" style="display:inline-flex;align-items:center;gap:7px;height:34px;padding:0 14px;font-size:12.5px;font-weight:600;color:#fff;background:var(--danger);border:none;border-radius:6px;cursor:pointer">
<span style="display:flex">{{ iconTrash }}</span>Solicitar eliminación segura de datos
</button>
</div>
</div>
</sc-if>`,
  `</div>
</sc-if>`,
);

lines[TEMPLATE_LINE] = JSON.stringify(template).replace(/<\//g, "<\\/");
fs.writeFileSync(filePath, lines.join("\n"));
console.log("OK. Recuadro 'Fin de contrato' eliminado de Exportación:", filePath);
