// El usuario confirmó que el fix anterior (guardar en
// componentDidUpdate) no funcionó en la práctica — seguía volviendo a
// Movimientos al refrescar. Causa probable: este motor de plantillas
// es un componente de clase compilado desde un template declarativo,
// no React "puro" corriendo tal cual se asume en una app React común
// — no hay garantía de que invoque componentDidUpdate en cada cambio
// de estado, y claramente no lo estaba haciendo (o no de forma
// confiable). Además, "page" se setea en varios lugares del código
// (go(), atajos del dashboard, los destinos de las notificaciones),
// no solo navegando con go(), así que depender de interceptar cada
// setState individual es frágil.
//
// Se reemplaza por un mecanismo que no depende de ningún hook del
// framework: escuchar 'beforeunload' y 'pagehide' (eventos nativos
// del navegador que SIEMPRE se disparan antes de un refresh, cierre
// de pestaña o navegación fuera de la página) y ahí recién leer
// this.state.page/tab y guardarlo. Esto es independiente de qué
// lifecycle hooks soporte el framework interno.
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
    throw new Error("No se encontró el texto exacto (recordar página v2):\n" + desde.slice(0, 400));
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
  `  guardarPaginaActual = () => {
    try {
      window.localStorage.setItem('paginaActual', JSON.stringify({ page: this.state.page, tab: this.state.tab }));
    } catch (e) {}
  };

  componentDidMount() {
    if ((this.props.startScreen || 'Aplicación') === 'Login') this.setState({ screen: 'login' });
    window.addEventListener('resize', this.measure);
    window.addEventListener('beforeunload', this.guardarPaginaActual);
    window.addEventListener('pagehide', this.guardarPaginaActual);
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
  }`,
);

lines[TEMPLATE_LINE] = JSON.stringify(template).replace(/<\//g, "<\\/");
fs.writeFileSync(filePath, lines.join("\n"));
console.log("OK. Ahora se guarda la página/pestaña al salir de la página (beforeunload/pagehide), no en un hook de update:", filePath);
