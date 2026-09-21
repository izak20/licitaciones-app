// Paso 3: temperatura() con datos reales (GET /api/temperatura/registros).
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
    throw new Error("No se encontró el texto exacto (temperatura):\n" + desde.slice(0, 300));
  }
  template = template.replace(desde, hasta);
}

const DESDE = `      columns: cols('Fecha', 'Hora', 'Ubicación', ['Temperatura', 'right'], 'Usuario', 'Estado'),
      rows: [
        ['14 sep 2026', '22:00', 'Bodega refrigerada 1', '4,2 °C', 'p.reyes', ['EN RANGO', 'ok']],
        ['14 sep 2026', '20:00', 'Bodega refrigerada 1', '4,6 °C', 'p.reyes', ['EN RANGO', 'ok']],
        ['14 sep 2026', '18:00', 'Bodega refrigerada 1', '5,2 °C', 'c.munoz', ['EN RANGO', 'ok']],
        ['14 sep 2026', '16:00', 'Bodega refrigerada 1', '6,8 °C', 'c.munoz', ['EN RANGO', 'ok']],
        ['14 sep 2026', '14:00', 'Bodega refrigerada 1', '9,2 °C', 'c.munoz', ['FUERA DE RANGO', 'bad']],
        ['14 sep 2026', '12:00', 'Bodega refrigerada 1', '7,4 °C', 'p.reyes', ['EN RANGO', 'ok']],
        ['14 sep 2026', '10:00', 'Bodega refrigerada 1', '6,2 °C', 'p.reyes', ['EN RANGO', 'ok']],
        ['14 sep 2026', '08:00', 'Bodega refrigerada 1', '5,1 °C', 'p.reyes', ['EN RANGO', 'ok']]
      ].map(r => ({
        cells: [txt(r[0]), mono(r[1]), txt(r[2]), mono(r[3], 'right', r[5][1] === 'bad' ? B.bad[1] : 'var(--fg-1)'), mono(r[4]), badge(r[5][0], r[5][1])],
        actions: [{ icon: ic('eye', 14), title: 'Ver registro', go: this.open('temperatura') }]
      })),
      footer: 'Mostrando 8 de 372 registros · 1 excursión de temperatura en el período'
    };
  }

  movFarmacia() {`;

const HASTA = `      columns: cols('Fecha', 'Hora', 'Bodega', ['Temperatura', 'right'], 'Estado'),
      rows: this.cargarLista('temperatura', '/api/temperatura/registros').map(m => {
        const bodega = this.desanidar(m.bodega);
        const fh = String(m.fecha_registro || '');
        return {
          cells: [txt(fh.slice(0, 10)), mono(fh.slice(11, 16)), txt(bodega ? bodega.nombre : '—'), mono(m.temperatura + ' °C', 'right', m.fuera_de_rango ? B.bad[1] : 'var(--fg-1)'), badge(m.fuera_de_rango ? 'FUERA DE RANGO' : 'EN RANGO', m.fuera_de_rango ? 'bad' : 'ok')],
          actions: []
        };
      }),
      footer: 'Mostrando ' + (this.state.listas.temperatura || []).length + ' registros reales'
    };
  }

  movFarmacia() {`;

reemplazar(DESDE, HASTA);

lines[TEMPLATE_LINE] = JSON.stringify(template).replace(/<\//g, "<\\/");
fs.writeFileSync(filePath, lines.join("\n"));
console.log("OK. Paso 3 (temperatura) aplicado:", filePath);
