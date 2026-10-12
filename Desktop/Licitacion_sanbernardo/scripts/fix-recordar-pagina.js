// El usuario reportó que al refrescar la página siempre vuelve a
// Movimientos, sin importar dónde estaba parado. Causa: el estado
// inicial trae "page: 'movimientos'" fijo (state = {...}), y un
// refresh del navegador reinicia React desde cero — no hay nada que
// recuerde en qué pantalla estaba. Se guarda la página y la pestaña
// actuales en localStorage (mismo mecanismo ya usado para recordar
// las columnas elegidas de cada tabla) cada vez que cambian, y se
// restauran al montar la app — validando que la página guardada
// todavía exista en el menú, para no quedar en una pantalla inválida
// si alguna vez se elimina un ítem del NAV.
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
    throw new Error("No se encontró el texto exacto (recordar página):\n" + desde.slice(0, 400));
  }
  template = template.replace(desde, () => hasta);
}

reemplazar(
  `  componentDidMount() {
    if ((this.props.startScreen || 'Aplicación') === 'Login') this.setState({ screen: 'login' });
    window.addEventListener('resize', this.measure);
    this.measure();
    this.cargarReferencias();
    this.cargarUsuarioActual();
    try {
      const guardado = window.localStorage.getItem('columnasPagina');
      if (guardado) this.setState({ columnasPagina: JSON.parse(guardado) });
    } catch (e) {}
  }`,
  `  componentDidMount() {
    if ((this.props.startScreen || 'Aplicación') === 'Login') this.setState({ screen: 'login' });
    window.addEventListener('resize', this.measure);
    this.measure();
    this.cargarReferencias();
    this.cargarUsuarioActual();
    try {
      const guardado = window.localStorage.getItem('columnasPagina');
      if (guardado) this.setState({ columnasPagina: JSON.parse(guardado) });
    } catch (e) {}
    try {
      const guardadaPagina = window.localStorage.getItem('paginaActual');
      if (guardadaPagina) {
        const parsed = JSON.parse(guardadaPagina);
        const idsValidos = NAV.flatMap(grupo => grupo.items.map(i => i.id));
        if (parsed && idsValidos.indexOf(parsed.page) !== -1) {
          this.setState({ page: parsed.page, tab: parsed.tab || 0 });
        }
      }
    } catch (e) {}
  }

  componentDidUpdate(prevProps, prevState) {
    if (prevState.page !== this.state.page || prevState.tab !== this.state.tab) {
      try {
        window.localStorage.setItem('paginaActual', JSON.stringify({ page: this.state.page, tab: this.state.tab }));
      } catch (e) {}
    }
  }`,
);

lines[TEMPLATE_LINE] = JSON.stringify(template).replace(/<\//g, "<\\/");
fs.writeFileSync(filePath, lines.join("\n"));
console.log("OK. La página y pestaña actuales se recuerdan al refrescar:", filePath);
