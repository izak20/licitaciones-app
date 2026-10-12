// Paso B: conecta movimientos() y movFarmacia() al nuevo filtro de
// Familia, encadenado después del de Estado (se calcula sobre lo que
// ya dejó el filtro de Estado, así los filtros se van acotando entre
// sí en vez de competir).
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

function reemplazarUna(contenedor, desde, hasta, contexto) {
  if (!contenedor.includes(desde)) {
    throw new Error("No se encontró el texto exacto (" + contexto + "):\n" + desde.slice(0, 300));
  }
  return contenedor.replace(desde, () => hasta);
}

// ===================== movimientos() (Droguería) =====================
let mov = fs.readFileSync("/tmp/old-movimientos2.txt", "utf8");

mov = reemplazarUna(
  mov,
  `    const { filtro: filtroEstado, filasFiltradas } = this.filtroEstadoControl(filas);`,
  `    const estadoCtl = this.filtroEstadoControl(filas);
    const familiaCtl = this.filtroFamiliaControl(estadoCtl.filasFiltradas);
    const filasFiltradas = familiaCtl ? familiaCtl.filasFiltradas : estadoCtl.filasFiltradas;
    const filtrosActivos = familiaCtl ? [estadoCtl.filtro, familiaCtl.filtro] : [estadoCtl.filtro];`,
  "movimientos: encadenar filtro de familia",
);
mov = mov.split(`        filters: [filtroEstado],`).join(`        filters: filtrosActivos,`);

if (!template.includes(fs.readFileSync("/tmp/old-movimientos2.txt", "utf8"))) {
  throw new Error("No se encontró el texto original completo de movimientos() en el template.");
}
template = template.replace(fs.readFileSync("/tmp/old-movimientos2.txt", "utf8"), () => mov);

// ===================== movFarmacia() =====================
let farm = fs.readFileSync("/tmp/old-movFarmacia2.txt", "utf8");

farm = reemplazarUna(
  farm,
  `    const { filtro: filtroEstado, filasFiltradas } = this.filtroEstadoControl(filas);`,
  `    const estadoCtl = this.filtroEstadoControl(filas);
    const familiaCtl = this.filtroFamiliaControl(estadoCtl.filasFiltradas);
    const filasFiltradas = familiaCtl ? familiaCtl.filasFiltradas : estadoCtl.filasFiltradas;
    const filtrosActivos = familiaCtl ? [estadoCtl.filtro, familiaCtl.filtro] : [estadoCtl.filtro];`,
  "movFarmacia: encadenar filtro de familia",
);
farm = farm.split(`        filters: [filtroEstado],`).join(`        filters: filtrosActivos,`);

if (!template.includes(fs.readFileSync("/tmp/old-movFarmacia2.txt", "utf8"))) {
  throw new Error("No se encontró el texto original completo de movFarmacia() en el template.");
}
template = template.replace(fs.readFileSync("/tmp/old-movFarmacia2.txt", "utf8"), () => farm);

lines[TEMPLATE_LINE] = JSON.stringify(template).replace(/<\//g, "<\\/");
fs.writeFileSync(filePath, lines.join("\n"));
console.log("OK. Paso B: filtro de Familia conectado en movimientos() y movFarmacia():", filePath);
