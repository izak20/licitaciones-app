// Paso 11: listados de Artículos y Proveedores (Maestros) con datos reales.
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
    throw new Error("No se encontró el texto exacto (maestros):\n" + desde.slice(0, 300));
  }
  template = template.replace(desde, hasta);
}

reemplazar(
  `      columns: cols('Código', 'Artículo', 'Distintivos', ['Stock total', 'right'], ['Lotes', 'right'], 'Estado'),
      rows: [
        ['ART-001042', 'Paracetamol 500 mg comprimido', 'Medicamentos / Analgésicos', [], '48.200', '6', ['VIGENTE', 'ok']],
        ['ART-001067', 'Amoxicilina 500 mg cápsula', 'Medicamentos / Antibióticos', [], '19.400', '4', ['VIGENTE', 'ok']],
        ['ART-001301', 'Fentanilo 0,05 mg/ml ampolla', 'Medicamentos / Controlados', [['CONTROLADO', 'warn', 'shield']], '640', '2', ['VIGENTE', 'ok']],
        ['ART-001188', 'Insulina NPH 100 UI/ml', 'Medicamentos / Cadena de frío', [['CADENA DE FRÍO', 'info', 'snow']], '1.120', '3', ['POR VENCER', 'warn']],
        ['ART-002011', 'Vacuna influenza trivalente', 'Vacunas / Cadena de frío', [['CADENA DE FRÍO', 'info', 'snow']], '4.800', '2', ['VIGENTE', 'ok']],
        ['ART-001455', 'Morfina 10 mg/ml ampolla', 'Medicamentos / Controlados', [['CONTROLADO', 'warn', 'shield'], ['CADENA DE FRÍO', 'info', 'snow']], '280', '2', ['VIGENTE', 'ok']],
        ['ART-003120', 'Suero fisiológico 500 ml', 'Insumos / Soluciones', [], '12.600', '5', ['VIGENTE', 'ok']],
        ['ART-003877', 'Guantes de nitrilo talla M', 'Insumos / Protección', [], '96.000', '3', ['VIGENTE', 'ok']],
        ['ART-001512', 'Metformina 850 mg comprimido', 'Medicamentos / Antidiabéticos', [], '31.800', '4', ['VENCIDO', 'bad']]
      ].map(r => ({
        cells: [mono(r[0]), stack(r[1], r[2]), flags(r[3]), mono(r[4], 'right'), mono(r[5], 'right'), badge(r[6][0], r[6][1])],
        actions: [
          { icon: ic('info', 14), title: 'Detalle (interfaz 11)', go: () => this.setState({ drawer: true, dd: null }) },
          { icon: ic('pencil', 14), title: 'Editar ficha (interfaz 10)', go: this.go('ficha') }
        ]
      })),
      footer: 'Mostrando 9 de 1.284 artículos · el ícono ⓘ abre el detalle, el lápiz abre la ficha'
    };`,
  `      columns: cols('Código', 'Artículo', 'Distintivos', 'Estado'),
      rows: this.cargarLista('articulos_list', '/api/articulos').map(a => {
        const distintivos = [];
        if (a.es_controlado) distintivos.push(['CONTROLADO', 'warn', 'shield']);
        if (a.requiere_cadena_frio) distintivos.push(['CADENA DE FRÍO', 'info', 'snow']);
        return {
          cells: [mono(a.codigo_interno), stack(a.nombre, [a.grupo, a.familia].filter(Boolean).join(' / ')), flags(distintivos), badge(a.activo ? 'VIGENTE' : 'INACTIVO', a.activo ? 'ok' : 'neutral')],
          actions: [{ icon: ic('pencil', 14), title: 'Editar ficha', go: this.go('ficha') }]
        };
      }),
      footer: 'Mostrando ' + (this.state.listas.articulos_list || []).length + ' artículos reales'
    };`,
);

reemplazar(
  `      columns: cols('RUT', 'Razón social', 'Ejecutivo', 'Teléfono', 'Correo', 'Resolución sanitaria'),
      rows: [
        ['96.575.810-0', 'Laboratorio Chile S.A.', 'Andrea Lizana', '+56 2 2510 4000', 'alizana@lab-chile.cl', ['ADJUNTO', 'ok']],
        ['96.532.330-9', 'Laboratorios Saval S.A.', 'Felipe Ortúzar', '+56 2 2707 8000', 'fortuzar@saval.cl', ['ADJUNTO', 'ok']],
        ['79.885.730-6', 'Laboratorio Sanderson S.A.', 'Marisol Cornejo', '+56 2 2440 9100', 'mcornejo@sanderson.cl', ['ADJUNTO', 'ok']],
        ['59.147.490-K', 'Novo Nordisk Chile', 'Tomás Elgueta', '+56 2 2233 7700', 'telgueta@novonordisk.cl', ['POR VENCER', 'warn']],
        ['85.031.400-7', 'Fresenius Kabi Chile', 'Carla Santander', '+56 2 2620 8800', 'csantander@fresenius.cl', ['ADJUNTO', 'ok']],
        ['77.412.019-3', 'Distribuidora Andes Ltda.', 'Iván Peralta', '+56 2 2899 1240', 'iperalta@dandes.cl', ['SIN ADJUNTO', 'bad']],
        ['61.606.000-2', 'Instituto de Salud Pública', 'Mesa institucional', '+56 2 2575 5100', 'contacto@ispch.cl', ['ADJUNTO', 'ok']]
      ].map(r => ({
        cells: [mono(r[0]), txt(r[1]), txt(r[2]), mono(r[3]), txt(r[4]), badge(r[5][0], r[5][1])],
        actions: [
          { icon: ic('pencil', 14), title: 'Editar ficha (interfaz 13)', go: this.open('proveedor') },
          { icon: ic('download', 14), title: 'Exportar lista de precios (interfaz 14)', fn: 'exportarListaPrecios', payload: { rut: r[0] } }
        ]
      })),
      footer: 'Mostrando 7 de 34 proveedores · el ícono ↓ exporta la lista de precios (interfaz 14)'
    };`,
  `      columns: cols('RUT', 'Razón social', 'Ejecutivo', 'Teléfono', 'Correo', 'Resolución sanitaria'),
      rows: this.cargarLista('proveedores_list', '/api/proveedores').map(p => ({
        cells: [mono(p.rut), txt(p.razon_social), txt(p.nombre_ejecutivo || '—'), mono(p.telefono || '—'), txt(p.email || '—'), badge(p.documento_adjunto_url ? 'ADJUNTO' : 'SIN ADJUNTO', p.documento_adjunto_url ? 'ok' : 'bad')],
        actions: [
          { icon: ic('pencil', 14), title: 'Editar ficha', go: () => { this.setState({ ultimoProveedorId: p.id_proveedor }); this.open('proveedor')(); } },
          { icon: ic('download', 14), title: 'Exportar lista de precios', go: () => this.run('exportarListaPrecios', { id: p.id_proveedor })() }
        ]
      })),
      footer: 'Mostrando ' + (this.state.listas.proveedores_list || []).length + ' proveedores reales'
    };`,
);

lines[TEMPLATE_LINE] = JSON.stringify(template).replace(/<\//g, "<\\/");
fs.writeFileSync(filePath, lines.join("\n"));
console.log("OK. Paso 11 (Maestros: artículos/proveedores) aplicado:", filePath);
