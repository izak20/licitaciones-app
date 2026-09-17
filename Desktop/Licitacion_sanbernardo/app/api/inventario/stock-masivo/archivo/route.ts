import ExcelJS from "exceljs";
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/api/require-user";
import { mapPostgresError } from "@/lib/api/errors";

// POST /api/inventario/stock-masivo/archivo — Configurar stock máx/mín
// masivamente desde un archivo Excel (sección 5.6). Formato esperado
// (fila 1 = encabezado): codigo_interno | bodega | stock_minimo |
// stock_maximo | stock_critico
export async function POST(request: Request) {
  const { supabase, unauthorized } = await requireUser();
  if (unauthorized) return unauthorized;

  const formData = await request.formData().catch(() => null);
  const file = formData?.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: "Falta el archivo (campo 'file' en el form-data)" },
      { status: 400 },
    );
  }

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(await file.arrayBuffer());
  const sheet = workbook.worksheets[0];
  if (!sheet) {
    return NextResponse.json({ error: "El archivo no tiene hojas" }, { status: 400 });
  }

  const filas: {
    codigo_interno: string;
    bodega: string;
    stock_minimo: number;
    stock_maximo: number;
    stock_critico: number;
  }[] = [];

  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return; // encabezado
    const [, codigo_interno, bodega, stock_minimo, stock_maximo, stock_critico] =
      row.values as unknown[];
    if (!codigo_interno) return;
    filas.push({
      codigo_interno: String(codigo_interno),
      bodega: String(bodega),
      stock_minimo: Number(stock_minimo) || 0,
      stock_maximo: Number(stock_maximo) || 0,
      stock_critico: Number(stock_critico) || 0,
    });
  });

  if (!filas.length) {
    return NextResponse.json(
      { error: "El archivo no tiene filas de datos (después del encabezado)" },
      { status: 400 },
    );
  }

  const { data: articulos } = await supabase
    .from("articulo")
    .select("id_articulo, codigo_interno");
  const { data: bodegas } = await supabase.from("bodega").select("id_bodega, nombre");

  const mapaArticulos = new Map(
    (articulos ?? []).map((a) => [a.codigo_interno, a.id_articulo]),
  );
  const mapaBodegas = new Map((bodegas ?? []).map((b) => [b.nombre, b.id_bodega]));

  const filasValidas = [];
  const errores: string[] = [];
  for (const [i, fila] of filas.entries()) {
    const idArticulo = mapaArticulos.get(fila.codigo_interno);
    const idBodega = mapaBodegas.get(fila.bodega);
    if (!idArticulo) {
      errores.push(`Fila ${i + 2}: código interno '${fila.codigo_interno}' no existe`);
      continue;
    }
    if (!idBodega) {
      errores.push(`Fila ${i + 2}: bodega '${fila.bodega}' no existe`);
      continue;
    }
    filasValidas.push({
      id_articulo: idArticulo,
      id_bodega: idBodega,
      stock_minimo: fila.stock_minimo,
      stock_maximo: fila.stock_maximo,
      stock_critico: fila.stock_critico,
    });
  }

  if (!filasValidas.length) {
    return NextResponse.json({ error: "Ninguna fila es válida", detalle: errores }, {
      status: 400,
    });
  }

  const { data, error } = await supabase
    .from("stock_parametro")
    .upsert(filasValidas, { onConflict: "id_articulo,id_bodega" })
    .select();

  if (error) {
    const mapped = mapPostgresError(error);
    return NextResponse.json({ error: mapped.message }, { status: mapped.status });
  }

  return NextResponse.json({
    data: { aplicadas: data?.length ?? 0, omitidas: errores },
  });
}
