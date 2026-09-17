// One-off script: los <input> del modal y de la ficha de artículo son
// controlados por React (value="{{ f.value }}") sin onInput, así que
// cada tecleo se revertía de inmediato. Los <select>/<textarea> ya
// eran no controlados (sin "value=" o con defaultValue) y no
// necesitan este fix. Se agrega sc-camel-on-input al <input> del
// template, y se hace que inp()/los campos de texto de la ficha lean
// y actualicen this.state.form.
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
    throw new Error("No se encontró el texto exacto:\n" + desde);
  }
  template = template.replace(desde, hasta);
}

// 1. Template del modal: agregar sc-camel-on-input al <input>.
reemplazar(
  `<input type="{{ f.inputType }}" value="{{ f.value }}" placeholder="{{ f.placeholder }}" style="width:100%;height:34px;padding:0 10px;font-size:12.5px;border:1px solid var(--border-2);border-radius:4px;background:var(--surface);color:var(--fg-1);outline:none">`,
  `<input type="{{ f.inputType }}" value="{{ f.value }}" placeholder="{{ f.placeholder }}" sc-camel-on-input="{{ f.onInput }}" style="width:100%;height:34px;padding:0 10px;font-size:12.5px;border:1px solid var(--border-2);border-radius:4px;background:var(--surface);color:var(--fg-1);outline:none">`,
);

// 2. Template de la ficha: mismo fix para su <input>.
reemplazar(
  `<input value="{{ f.value }}" style="width:100%;height:34px;padding:0 10px;font-size:12.5px;border:1px solid var(--border-2);border-radius:4px;background:var(--surface);color:var(--fg-1);outline:none">`,
  `<input value="{{ f.value }}" sc-camel-on-input="{{ f.onInput }}" style="width:100%;height:34px;padding:0 10px;font-size:12.5px;border:1px solid var(--border-2);border-radius:4px;background:var(--surface);color:var(--fg-1);outline:none">`,
);

// 3. inp() (usado por proveedor/recepción/despacho/traspaso): ahora
// lee/escribe this.state.form en vez de mostrar siempre el valor de
// mockup. Mejora genérica y de bajo riesgo — antes ningún <input> de
// ningún modal era editable.
reemplazar(
  `    const inp = (label, value, span, placeholder) => ({ label, isInput: true, value: value || '', placeholder: placeholder || '', span: span || 1, inputType: 'text' });`,
  `    const campoValor = (label, def) => (this.state.form && this.state.form[label] !== undefined) ? this.state.form[label] : (def || '');
    const onCampo = (label) => (e) => this.setState(s => ({ form: Object.assign({}, s.form, { [label]: e.target.value }) }));
    const inp = (label, value, span, placeholder) => ({ label, isInput: true, value: campoValor(label, value), placeholder: placeholder || '', span: span || 1, inputType: 'text', onInput: onCampo(label) });`,
);

// 4. Campos de texto de la ficha de artículo (Código, Nombre del
// artículo) — únicos isInput que usa guardarArticulo.
reemplazar(
  `            { label: 'Código', isInput: true, value: 'ART-001042', span: 1 },
            { label: 'Código de barras', isInput: true, value: '7801234567890', span: 1 },
            { label: 'Nombre del artículo', isInput: true, value: 'Paracetamol 500 mg comprimido', span: 2 },`,
  `            { label: 'Código', isInput: true, value: (this.state.form && this.state.form['Código'] !== undefined) ? this.state.form['Código'] : 'ART-001042', onInput: (e) => this.setState(s => ({ form: Object.assign({}, s.form, { 'Código': e.target.value }) })), span: 1 },
            { label: 'Código de barras', isInput: true, value: '7801234567890', span: 1 },
            { label: 'Nombre del artículo', isInput: true, value: (this.state.form && this.state.form['Nombre del artículo'] !== undefined) ? this.state.form['Nombre del artículo'] : 'Paracetamol 500 mg comprimido', onInput: (e) => this.setState(s => ({ form: Object.assign({}, s.form, { 'Nombre del artículo': e.target.value }) })), span: 2 },`,
);

// 5. recolectarPayload ya lee por DOM para inputs/selects/textareas —
// sigue funcionando igual (el value del DOM ahora SÍ refleja lo tecleado).
// No se requiere cambio ahí.

// 6. Limpiar this.state.form al cerrar un modal/volver de la ficha,
// para que el próximo formulario abra sin arrastrar valores de otro.
reemplazar(
  `  close = () => this.setState({ modal: null, drawer: false, dd: null });`,
  `  close = () => this.setState({ modal: null, drawer: false, dd: null, form: {} });`,
);
reemplazar(
  `  go = (page) => () => this.setState({ page, tab: 0, dd: null, modal: null, drawer: false, navOpen: false, estadoOverride: null });`,
  `  go = (page) => () => this.setState({ page, tab: 0, dd: null, modal: null, drawer: false, navOpen: false, estadoOverride: null, form: {} });`,
);

lines[TEMPLATE_LINE] = JSON.stringify(template).replace(/<\//g, "<\\/");
fs.writeFileSync(filePath, lines.join("\n"));
console.log("OK. Inputs cableados:", filePath);
