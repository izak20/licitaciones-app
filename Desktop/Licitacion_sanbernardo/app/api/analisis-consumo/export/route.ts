import ExcelJS from "exceljs";
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/api/require-user";
import { AGRUPACIONES, obtenerAnalisisConsumo, type Agrupacion } from "@/lib/api/analisis-consumo";

// GET /api/analisis-consumo/export?agrupar=&bodega=&desde=&hasta= —
// Exportación del análisis de consumo (sección 5.9).
export async function GET(request: Request) {
  const { supabase, unauthorized } = await requireUser();
  if (unauthorized) return unauthorized;

  const { searchParams } = new URL(request.url);
  const agrupar = (searchParams.get("agrupar") ?? "producto") as Agrupacion;
  if (!AGRUPACIONES.includes(agrupar)) {
    return NextResponse.json(
      { error: `agrupar debe ser uno de: ${AGRUPACIONES.join(", ")}` },
      { status: 400 },
    );
  }

  const { data, error } = await obtenerAnalisisConsumo(supabase, {
    agrupar,
    bodega: searchParams.get("bodega"),
    desde: searchParams.get("desde"),
    hasta: searchParams.get("hasta"),
  });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Análisis de consumo");
  sheet.columns = [
    { header: agrupar[0].toUpperCase() + agrupar.slice(1), key: "clave", width: 36 },
    { header: "Cantidad total consumida", key: "cantidad_total", width: 24 },
    { header: "N° de movimientos", key: "movimientos", width: 18 },
  ];
  sheet.addRows(data ?? []);
  sheet.getRow(1).font = { bold: true };

  const buffer = await workbook.xlsx.writeBuffer();
  return new NextResponse(buffer as unknown as BodyInit, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="analisis-consumo.xlsx"',
    },
  });
}
