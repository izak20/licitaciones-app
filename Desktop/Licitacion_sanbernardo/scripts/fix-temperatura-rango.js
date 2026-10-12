// El usuario preguntó cuál es el límite de temperatura que dispara
// una alerta — no existía ninguno visible, y el backend usaba un
// 2-8°C fijo para TODAS las bodegas (confirmado en el propio
// comentario del trigger SQL: "ajustar rango real por bodega",
// pendiente desde siempre). Se agregó bodega.temp_minima/temp_maxima
// (migración 009, nulo = sigue usando el 2-8°C global) y el trigger
// ya las respeta — esto conecta el frontend:
// 1) La pestaña "Agregar bodega" ahora puede configurar un rango
//    propio al crear una bodega (si se deja vacío, usa el default).
// 2) El modal "Registrar temperatura" ya no dice un 2-8°C fijo de
//    mentira — muestra el rango REAL de la bodega elegida (se
//    actualiza solo al cambiar la bodega en el selector).
// 3) La tabla de Control de temperatura ahora trae una columna
//    "Rango" mostrando el límite real de cada bodega, fila por fila.
//
// De paso, un ajuste chico pedido también: la columna "Artículos" de
// Toma de inventario decía "0 de 16" sin más contexto, lo que hacía
// parecer que no había artículos — ahora, cuando el conteo todavía no
// parte (0 contados), aclara "(sin iniciar)".
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
    throw new Error("No se encontró el texto exacto (temperatura rango):\n" + desde.slice(0, 400));
  }
  template = template.replace(desde, () => hasta);
}

// 1. sel() acepta un onChange opcional (nuevo parámetro al final, no
//    rompe ningún llamado existente que no lo use).
reemplazar(
  `    const sel = (label, options, span, hint2) => ({ label, isSelect: true, options, span: span || 1, hint2: hint2 || '' });`,
  `    const sel = (label, options, span, hint2, onChange) => ({ label, isSelect: true, options, span: span || 1, hint2: hint2 || '', onChange });`,
);

// 2. Markup: el <select> del modal ya puede avisar cuando cambia.
reemplazar(
  `<sc-if value="{{ f.isSelect }}" hint-placeholder-val="{{ false }}">
<sc-raw-select style="width:100%;height:34px;padding:0 9px;font-size:12.5px;border:1px solid var(--border-2);border-radius:4px;background:var(--surface);color:var(--fg-1)">
<sc-for list="{{ f.options }}" as="o" hint-placeholder-count="2"><option>{{ o }}</option></sc-for>
</sc-raw-select>
</sc-if>`,
  `<sc-if value="{{ f.isSelect }}" hint-placeholder-val="{{ false }}">
<sc-raw-select sc-camel-on-change="{{ f.onChange }}" style="width:100%;height:34px;padding:0 9px;font-size:12.5px;border:1px solid var(--border-2);border-radius:4px;background:var(--surface);color:var(--fg-1)">
<sc-for list="{{ f.options }}" as="o" hint-placeholder-count="2"><option>{{ o }}</option></sc-for>
</sc-raw-select>
</sc-if>`,
);

// 3. Modal "Agregar bodega": campos para configurar un rango propio.
reemplazar(
  `      bodega: {
        eyebrow: 'INTERFAZ 5 · MODAL SOBRE BODEGAS', title: 'Agregar bodega',
        width: '460px', cta: 'Agregar', ctaBg: 'var(--brand-blue)',
        fields: [
          inp('Nombre de la bodega', '', 2, 'ej: Bodega refrigerada 3'),
          sel('Tipo', ['centro_distribucion', 'bodega', 'sub_bodega'], 1),
          sel('Bodega padre (opcional)', ['(ninguna)'].concat(this.opcionesBodegas()), 1)
        ]
      },`,
  `      bodega: {
        eyebrow: 'INTERFAZ 5 · MODAL SOBRE BODEGAS', title: 'Agregar bodega',
        width: '460px', cta: 'Agregar', ctaBg: 'var(--brand-blue)',
        fields: [
          inp('Nombre de la bodega', '', 2, 'ej: Bodega refrigerada 3'),
          sel('Tipo', ['centro_distribucion', 'bodega', 'sub_bodega'], 1),
          sel('Bodega padre (opcional)', ['(ninguna)'].concat(this.opcionesBodegas()), 1),
          inp('Temp. mínima (°C, opcional)', '', 1, 'vacío = usa 2 °C'),
          { label: 'Temp. máxima (°C, opcional)', isInput: true, value: campoValor('Temp. máxima (°C, opcional)', ''), onInput: onCampo('Temp. máxima (°C, opcional)'), placeholder: 'vacío = usa 8 °C', span: 1, hint2: 'Si se dejan vacíos, esta bodega usa el rango general (2 °C a 8 °C).' }
        ]
      },`,
);

// 4. guardarBodega: manda el rango elegido (si se completó).
reemplazar(
  `    if (nombre === 'guardarBodega') {
      const padreNombre = leerModal('Bodega padre (opcional)');
      const padre = (this.state.refBodegas || []).find(b => b.nombre === padreNombre);
      return {
        nombre: leerModal('Nombre de la bodega'),
        tipo: leerModal('Tipo'),
        id_bodega_padre: padre ? padre.id_bodega : null
      };
    }`,
  `    if (nombre === 'guardarBodega') {
      const padreNombre = leerModal('Bodega padre (opcional)');
      const padre = (this.state.refBodegas || []).find(b => b.nombre === padreNombre);
      const tMinTexto = leerModal('Temp. mínima (°C, opcional)');
      const tMaxTexto = leerModal('Temp. máxima (°C, opcional)');
      return {
        nombre: leerModal('Nombre de la bodega'),
        tipo: leerModal('Tipo'),
        id_bodega_padre: padre ? padre.id_bodega : null,
        temp_minima: tMinTexto ? this.numero(tMinTexto) : null,
        temp_maxima: tMaxTexto ? this.numero(tMaxTexto) : null
      };
    }`,
);

// 5. Modal "Registrar temperatura": el aviso del rango ahora es real
//    (según la bodega elegida en el selector) y ya no promete una
//    acción que el formulario no guarda de verdad.
reemplazar(
  `      temperatura: {
        eyebrow: 'INTERFAZ 16 · MODAL SOBRE CONTROL DE TEMPERATURA', title: 'Registrar temperatura',
        width: '520px', cta: 'Registrar', ctaBg: 'var(--brand-blue)',
        fields: [
          sel('Ubicación', this.opcionesBodegas(), 2),
          { label: 'Fecha', isInput: true, inputType: 'date', value: '2026-09-15', span: 1 },
          inp('Hora', '10:00'),
          inp('Temperatura (°C)', '4,8'),
          sel('Instrumento', ['Termómetro digital TD-04', 'Termómetro digital TD-07', 'Data logger DL-11'], 1),
          note('El rango permitido para esta ubicación es 2 °C a 8 °C. Si el valor queda fuera de rango, el sistema emite aviso automático y exige registrar la acción correctiva.', 'info', 'info'),
          { label: 'Acción correctiva', isArea: true, span: 2, value: '', placeholder: 'Obligatorio sólo si la lectura queda fuera de rango' }
        ]
      },`,
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
);

// 6. Control de temperatura: nueva columna "Rango" (límite real de
//    cada bodega, fila por fila).
reemplazar(
  `      columns: cols('Fecha', 'Hora', 'Bodega', ['Temperatura', 'right'], 'Estado'),
      rows: registros.map(m => {
        const bodega = this.desanidar(m.bodega);
        const fh = String(m.fecha_registro || '');
        return {
          cells: [txt(fh.slice(0, 10)), mono(fh.slice(11, 16)), txt(bodega ? bodega.nombre : '—'), mono(m.temperatura + ' °C', 'right', m.fuera_de_rango ? B.bad[1] : 'var(--fg-1)'), badge(m.fuera_de_rango ? 'FUERA DE RANGO' : 'EN RANGO', m.fuera_de_rango ? 'bad' : 'ok')],
          actions: []
        };
      }),`,
  `      columns: cols('Fecha', 'Hora', 'Bodega', ['Rango', 'left', 'extra'], ['Temperatura', 'right'], 'Estado'),
      rows: registros.map(m => {
        const bodega = this.desanidar(m.bodega);
        const fh = String(m.fecha_registro || '');
        const tMin = (bodega && bodega.temp_minima != null) ? bodega.temp_minima : 2;
        const tMax = (bodega && bodega.temp_maxima != null) ? bodega.temp_maxima : 8;
        return {
          cells: [txt(fh.slice(0, 10)), mono(fh.slice(11, 16)), txt(bodega ? bodega.nombre : '—'), txt(tMin + ' a ' + tMax + ' °C'), mono(m.temperatura + ' °C', 'right', m.fuera_de_rango ? B.bad[1] : 'var(--fg-1)'), badge(m.fuera_de_rango ? 'FUERA DE RANGO' : 'EN RANGO', m.fuera_de_rango ? 'bad' : 'ok')],
          actions: []
        };
      }),`,
);

// 7. Aclara "0 de 16" cuando el conteo todavía no empieza.
reemplazar(
  `          cells: [txt(bodega ? bodega.nombre : '—'), txt(tm.alcance), txt(tm.responsable || '—'), mono(contados + ' de ' + total, 'right', contados === total && total > 0 ? B.ok[1] : 'var(--fg-1)'), badge(tm.estado, tm.estado === 'cerrada' ? 'ok' : 'warn'), txt(this.fechaCorta(tm.fecha_inicio)), txt(tm.segundo_verificador || '—'), badge(tm.conteo_a_ciegas ? 'SÍ' : 'NO', tm.conteo_a_ciegas ? 'info' : 'neutral')],
          actions: [],
          go: () => this.setState({ modal: 'detalleToma', detalleTomaId: tm.id_toma, detalleTomaTitulo: (bodega ? bodega.nombre : '—') + ' · ' + tm.alcance }),
          cursorPointer: 'pointer'`,
  `          cells: [txt(bodega ? bodega.nombre : '—'), txt(tm.alcance), txt(tm.responsable || '—'), mono(contados + ' de ' + total + (contados === 0 && total > 0 ? ' (sin iniciar)' : ''), 'right', contados === total && total > 0 ? B.ok[1] : 'var(--fg-1)'), badge(tm.estado, tm.estado === 'cerrada' ? 'ok' : 'warn'), txt(this.fechaCorta(tm.fecha_inicio)), txt(tm.segundo_verificador || '—'), badge(tm.conteo_a_ciegas ? 'SÍ' : 'NO', tm.conteo_a_ciegas ? 'info' : 'neutral')],
          actions: [],
          go: () => this.setState({ modal: 'detalleToma', detalleTomaId: tm.id_toma, detalleTomaTitulo: (bodega ? bodega.nombre : '—') + ' · ' + tm.alcance }),
          cursorPointer: 'pointer'`,
);

lines[TEMPLATE_LINE] = JSON.stringify(template).replace(/<\//g, "<\\/");
fs.writeFileSync(filePath, lines.join("\n"));
console.log("OK. Rango de temperatura real por bodega + aclaración de 'sin iniciar':", filePath);
