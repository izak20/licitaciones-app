// La nota reactiva (que debía cambiar según la bodega elegida en el
// selector) no funciona: se probó en vivo y confirmó que ni "change"
// ni "input" disparan nada en un <select> dentro de este motor de
// plantillas — es una limitación real del compilador, no algo que se
// pueda forzar desde el frontend. En vez de dejar algo a medias, se
// rediseña para que sea correcto SIEMPRE sin depender de ningún
// evento: el aviso lista el rango real de TODAS las bodegas de una
// vez (los datos ya están cargados en refBodegas, no hace falta
// esperar ninguna interacción).
//
// También se revierte el intento de on-input en el <select> (quedaba
// un atributo que no hace nada — mejor sacarlo que dejar algo que
// aparenta funcionar y no funciona) y el parámetro onChange de sel(),
// ya que no tiene ningún uso real ahora.
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
    throw new Error("No se encontró el texto exacto (temperatura nota estática):\n" + desde.slice(0, 400));
  }
  template = template.replace(desde, () => hasta);
}

// 1. Revertir el <select> al estado simple (sin el atributo que no
//    funciona).
reemplazar(
  `<sc-raw-select sc-camel-on-input="{{ f.onChange }}" style="width:100%;height:34px;padding:0 9px;font-size:12.5px;border:1px solid var(--border-2);border-radius:4px;background:var(--surface);color:var(--fg-1)">`,
  `<sc-raw-select style="width:100%;height:34px;padding:0 9px;font-size:12.5px;border:1px solid var(--border-2);border-radius:4px;background:var(--surface);color:var(--fg-1)">`,
);

// 2. Revertir sel() a su forma original (el onChange no tiene ya
//    ningún uso real).
reemplazar(
  `    const sel = (label, options, span, hint2, onChange) => ({ label, isSelect: true, options, span: span || 1, hint2: hint2 || '', onChange });`,
  `    const sel = (label, options, span, hint2) => ({ label, isSelect: true, options, span: span || 1, hint2: hint2 || '' });`,
);

// 3. El modal "Registrar temperatura": el aviso ahora lista el rango
//    real de todas las bodegas de una vez, sin depender de ningún
//    evento del selector.
reemplazar(
  `      temperatura: {
        eyebrow: 'INTERFAZ 16 · MODAL SOBRE CONTROL DE TEMPERATURA', title: 'Registrar temperatura',
        width: '520px', cta: 'Registrar', ctaBg: 'var(--brand-blue)',
        fields: (() => {
          const ubicacionElegida = campoValor('Ubicación', this.opcionesBodegas()[0] || '');
          const bodegaElegida = (this.state.refBodegas || []).find(b => b.nombre === ubicacionElegida);
          const tMin = (bodegaElegida && bodegaElegida.temp_minima != null) ? bodegaElegida.temp_minima : 2;
          const tMax = (bodegaElegida && bodegaElegida.temp_maxima != null) ? bodegaElegida.temp_maxima : 8;
          return [
            sel('Ubicación', this.opcionesBodegas(), 2, '', onCampo('Ubicación')),
            { label: 'Fecha', isInput: true, inputType: 'date', value: '2026-09-15', span: 1 },
            inp('Hora', '10:00'),
            inp('Temperatura (°C)', '4,8'),
            sel('Instrumento', ['Termómetro digital TD-04', 'Termómetro digital TD-07', 'Data logger DL-11'], 1),
            note('El rango permitido para ' + (ubicacionElegida || 'esta ubicación') + ' es ' + tMin + ' °C a ' + tMax + ' °C. Si el valor queda fuera de rango, el sistema lo marca automáticamente como alerta.', 'info', 'info'),
            { label: 'Acción correctiva', isArea: true, span: 2, value: '', placeholder: 'Obligatorio sólo si la lectura queda fuera de rango' }
          ];
        })()
      },`,
  `      temperatura: {
        eyebrow: 'INTERFAZ 16 · MODAL SOBRE CONTROL DE TEMPERATURA', title: 'Registrar temperatura',
        width: '520px', cta: 'Registrar', ctaBg: 'var(--brand-blue)',
        fields: (() => {
          const rangosTexto = (this.state.refBodegas || []).map(b => {
            const tMin = b.temp_minima != null ? b.temp_minima : 2;
            const tMax = b.temp_maxima != null ? b.temp_maxima : 8;
            return b.nombre + ': ' + tMin + ' a ' + tMax + ' °C';
          }).join(' · ');
          return [
            sel('Ubicación', this.opcionesBodegas(), 2),
            { label: 'Fecha', isInput: true, inputType: 'date', value: '2026-09-15', span: 1 },
            inp('Hora', '10:00'),
            inp('Temperatura (°C)', '4,8'),
            sel('Instrumento', ['Termómetro digital TD-04', 'Termómetro digital TD-07', 'Data logger DL-11'], 1),
            note('Rango permitido por bodega — ' + (rangosTexto || '2 °C a 8 °C') + '. Si el valor queda fuera de rango, el sistema lo marca automáticamente como alerta.', 'info', 'info'),
            { label: 'Acción correctiva', isArea: true, span: 2, value: '', placeholder: 'Obligatorio sólo si la lectura queda fuera de rango' }
          ];
        })()
      },`,
);

lines[TEMPLATE_LINE] = JSON.stringify(template).replace(/<\//g, "<\\/");
fs.writeFileSync(filePath, lines.join("\n"));
console.log("OK. Aviso de rango de temperatura rediseñado (lista todas las bodegas, sin depender de eventos del selector):", filePath);
