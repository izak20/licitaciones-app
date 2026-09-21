// Paso 9: abastecimiento() con datos reales (GET .../ordenes y
// GET .../faltantes).
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
    throw new Error("No se encontró el texto exacto (abastecimiento):\n" + desde.slice(0, 300));
  }
  template = template.replace(desde, hasta);
}

const DESDE = `  abastecimiento() {
    const t = this.state.tab;
    const base = {
      isList: true, eyebrow: 'DROGUERÍA · INTERFAZ 18', title: 'Abastecimiento',
      req: 'Anexo N°4 · bloque Abastecimientos (7 ítems)',
      secondary: [{ label: 'Exportar', icon: ic('download', 13), fn: 'exportarAbastecimiento' }],
      tabs: [{ label: 'Órdenes generadas', count: 18, i: 0 }, { label: 'Faltantes', count: 38, i: 1 }]
    };
    if (t === 1) return Object.assign(base, {
      primary: null,
      searchPlaceholder: 'Buscar por artículo',
      filters: [{ label: 'Bodega', value: 'Todas', icon: ic('warehouse', 13) }, { label: 'Criticidad', value: 'Todas', icon: ic('filter', 13) }],
      banner: { bg: B.warn[0], border: B.warn[2], fg: B.warn[1], icon: ic('alert', 15), text: '38 artículos están bajo su stock mínimo. Puedes generar una orden por artículo o una orden consolidada automática por consumo.' },
      columns: cols('Artículo', 'Bodega', ['Stock actual', 'right'], ['Stock mínimo', 'right'], ['Déficit', 'right'], 'Criticidad'),
      rows: [
        ['Amoxicilina 500 mg cápsula', 'Medicamentos / Antibióticos', 'Bodega general', '1.400', '6.000', '−4.600', ['CRÍTICO', 'bad']],
        ['Insulina NPH 100 UI/ml', 'Medicamentos / Cadena de frío', 'Bodega refrigerada 1', '310', '900', '−590', ['CRÍTICO', 'bad']],
        ['Paracetamol 500 mg comprimido', 'Medicamentos / Analgésicos', 'Bodega general', '6.200', '8.000', '−1.800', ['MEDIO', 'warn']],
        ['Suero fisiológico 500 ml', 'Insumos / Soluciones', 'Bodega insumos', '1.900', '2.500', '−600', ['MEDIO', 'warn']],
        ['Guantes de nitrilo talla M', 'Insumos / Protección', 'Bodega insumos', '14.000', '16.000', '−2.000', ['BAJO', 'neutral']],
        ['Vacuna influenza trivalente', 'Vacunas / Cadena de frío', 'Bodega refrigerada 2', '2.100', '2.400', '−300', ['BAJO', 'neutral']]
      ].map(r => ({
        cells: [stack(r[0], r[1]), txt(r[2]), mono(r[3], 'right'), mono(r[4], 'right'), mono(r[5], 'right', B.bad[1]), badge(r[6][0], r[6][1])],
        actions: [{ isLabeled: true, title: 'Generar orden', go: this.open('orden') }]
      })),
      footer: 'Mostrando 6 de 38 artículos bajo stock mínimo'
    });
    return Object.assign(base, {
      primary: { label: 'Nueva orden', modal: 'orden' },
      searchPlaceholder: 'Buscar por N° de orden o proveedor',
      filters: [{ label: 'Período', value: 'Sep 2026', icon: ic('calendar', 13) }, { label: 'Estado', value: 'Todos', icon: ic('filter', 13) }],
      columns: cols('N° orden', 'Fecha', 'Proveedor', 'Origen', ['Ítems', 'right'], ['Monto', 'right'], 'Estado'),
      rows: [
        ['OA-0918', '14 sep 2026', 'Laboratorio Chile S.A.', 'Automática por consumo', '24', '$8,4M', ['ENVIADO', 'neutral']],
        ['OA-0917', '13 sep 2026', 'Laboratorios Saval S.A.', 'Manual por solicitud', '6', '$1,2M', ['EN TRÁNSITO', 'warn']],
        ['OA-0915', '12 sep 2026', 'Novo Nordisk Chile', 'Manual por solicitud', '2', '$3,9M', ['EN TRÁNSITO', 'warn']],
        ['OA-0912', '11 sep 2026', 'Laboratorio Chile S.A.', 'Automática por consumo', '24', '$7,8M', ['RECEPCIONADO', 'ok']],
        ['OA-0909', '09 sep 2026', 'Distribuidora Andes Ltda.', 'Automática por consumo', '11', '$2,1M', ['RECEPCIONADO', 'ok']],
        ['OA-0904', '05 sep 2026', 'Fresenius Kabi Chile', 'Manual por solicitud', '4', '$0,9M', ['RECEPCIONADO', 'ok']]
      ].map(r => ({
        cells: [mono(r[0]), txt(r[1]), txt(r[2]), txt(r[3]), mono(r[4], 'right'), mono(r[5], 'right'), badge(r[6][0], r[6][1])],
        actions: [{ icon: ic('eye', 14), title: 'Ver seguimiento', go: this.open('orden') }, { icon: ic('printer', 14), title: 'Imprimir', fn: 'imprimirOrden' }]
      })),
      footer: 'Mostrando 6 de 18 órdenes de abastecimiento'
    });
  }`;

const HASTA = `  abastecimiento() {
    const t = this.state.tab;
    const base = {
      isList: true, eyebrow: 'DROGUERÍA · INTERFAZ 18', title: 'Abastecimiento',
      req: 'Anexo N°4 · bloque Abastecimientos (7 ítems)',
      secondary: [{ label: 'Exportar', icon: ic('download', 13), fn: 'exportarAbastecimiento' }],
      tabs: [{ label: 'Órdenes generadas', count: (this.state.listas.abastecimiento_ordenes || []).length, i: 0 }, { label: 'Faltantes', count: (this.state.listas.abastecimiento_faltantes || []).length, i: 1 }]
    };
    if (t === 1) {
      const faltantes = this.cargarLista('abastecimiento_faltantes', '/api/abastecimiento/faltantes');
      return Object.assign(base, {
        primary: null,
        searchPlaceholder: 'Buscar por artículo',
        filters: [],
        columns: cols('Artículo', 'Bodega', ['Stock actual', 'right'], ['Stock mínimo', 'right'], ['Déficit', 'right']),
        rows: faltantes.map(f => {
          const articulo = this.desanidar(f.articulo);
          const bodega = this.desanidar(f.bodega);
          return {
            cells: [txt(articulo ? articulo.nombre : '—'), txt(bodega ? bodega.nombre : '—'), mono(f.stock_actual, 'right'), mono(f.stock_minimo, 'right'), mono(f.stock_actual - f.stock_minimo, 'right', B.bad[1])],
            actions: [{ isLabeled: true, title: 'Generar orden', go: () => this.run('generarOrdenAbastecimiento', { modo: 'automatica_stock_minimo', id_bodega: f.id_bodega })() }]
          };
        }),
        footer: 'Mostrando ' + faltantes.length + ' artículos reales bajo stock mínimo'
      });
    }
    const ordenes = this.cargarLista('abastecimiento_ordenes', '/api/abastecimiento/ordenes');
    return Object.assign(base, {
      primary: { label: 'Nueva orden', modal: 'orden' },
      searchPlaceholder: 'Buscar por N° de orden',
      filters: [],
      columns: cols('N° orden', 'Fecha', 'Bodega', 'Origen', ['Ítems', 'right'], 'Estado'),
      rows: ordenes.map(o => {
        const bodega = this.desanidar(o.bodega_solicitante);
        return {
          cells: [mono(o.folio), txt(this.fechaCorta(o.fecha_creacion)), txt(bodega ? bodega.nombre : '—'), txt(o.origen), mono((o.lineas || []).length, 'right'), badge(o.estado, o.estado === 'cerrada' ? 'ok' : 'neutral')],
          actions: []
        };
      }),
      footer: 'Mostrando ' + ordenes.length + ' órdenes de abastecimiento reales'
    });
  }`;

reemplazar(DESDE, HASTA);

lines[TEMPLATE_LINE] = JSON.stringify(template).replace(/<\//g, "<\\/");
fs.writeFileSync(filePath, lines.join("\n"));
console.log("OK. Paso 9 (abastecimiento) aplicado:", filePath);
