import ExcelJS from "exceljs";

// Helpers compartidos por las rutas de carga masiva (sección 5.3/5.4
// extendida a pedido del usuario: además de stock mín/máx, ahora
// artículos, proveedores, bodegas, centros de costo, usuarios y
// recepciones también se pueden cargar desde un Excel).
export type ColumnaPlantilla = {
  header: string;
  key: string;
  ejemplo?: string | number;
  ancho?: number;
};

export async function generarPlantilla(
  nombreHoja: string,
  columnas: ColumnaPlantilla[],
  notas?: string[],
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(nombreHoja);
  sheet.columns = columnas.map((c) => ({ header: c.header, key: c.key, width: c.ancho ?? 22 }));
  sheet.getRow(1).font = { bold: true };
  if (columnas.some((c) => c.ejemplo !== undefined)) {
    const fila: Record<string, string | number> = {};
    for (const c of columnas) if (c.ejemplo !== undefined) fila[c.key] = c.ejemplo;
    const row = sheet.addRow(fila);
    row.font = { italic: true, color: { argb: "FF888888" } };
  }
  if (notas?.length) {
    const inicio = 3;
    notas.forEach((n, i) => {
      sheet.getCell(inicio + i, 1).value = "Nota: " + n;
    });
  }
  return (await workbook.xlsx.writeBuffer()) as unknown as Buffer;
}

export async function leerFilasExcel(file: File): Promise<Record<string, string>[]> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(await file.arrayBuffer());
  const sheet = workbook.worksheets[0];
  if (!sheet) return [];

  const encabezados: string[] = [];
  sheet.getRow(1).eachCell((cell, colNumber) => {
    encabezados[colNumber] = String(cell.value ?? "").trim();
  });

  const filas: Record<string, string>[] = [];
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const valores = row.values as unknown[];
    const primera = valores[1];
    if (primera === undefined || primera === null || primera === "") return;
    const fila: Record<string, string> = {};
    encabezados.forEach((nombre, i) => {
      if (!nombre) return;
      const valor = valores[i];
      fila[nombre] = valor === undefined || valor === null ? "" : String(valor).trim();
    });
    filas.push(fila);
  });
  return filas;
}

export function esVerdadero(valor: string | undefined): boolean {
  if (!valor) return false;
  return ["si", "sí", "true", "1", "x"].includes(valor.trim().toLowerCase());
}
