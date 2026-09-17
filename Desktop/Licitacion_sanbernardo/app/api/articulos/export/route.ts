import ExcelJS from "exceljs";
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/api/require-user";
import { mapPostgresError } from "@/lib/api/errors";

// GET /api/articulos/export — Exportar cartola de artículos a Excel
export async function GET() {
  const { supabase, unauthorized } = await requireUser();
  if (unauthorized) return unauthorized;

  const { data, error } = await supabase
    .from("articulo")
    .select(
      "codigo_interno, nombre, grupo, familia, subfamilia, unidad_medida, es_controlado, requiere_cadena_frio, requiere_lote, registro_sanitario, ubicacion, activo",
    )
    .order("nombre");

  if (error) {
    const mapped = mapPostgresError(error);
    return NextResponse.json({ error: mapped.message }, { status: mapped.status });
  }

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Artículos");
  sheet.columns = [
    { header: "Código interno", key: "codigo_interno", width: 18 },
    { header: "Nombre", key: "nombre", width: 32 },
    { header: "Grupo", key: "grupo", width: 16 },
    { header: "Familia", key: "familia", width: 16 },
    { header: "Subfamilia", key: "subfamilia", width: 16 },
    { header: "Unidad de medida", key: "unidad_medida", width: 16 },
    { header: "Controlado (Ley 20.000)", key: "es_controlado", width: 22 },
    { header: "Cadena de frío", key: "requiere_cadena_frio", width: 16 },
    { header: "Requiere lote", key: "requiere_lote", width: 16 },
    { header: "Registro sanitario", key: "registro_sanitario", width: 20 },
    { header: "Ubicación", key: "ubicacion", width: 16 },
    { header: "Activo", key: "activo", width: 10 },
  ];
  sheet.addRows(data ?? []);
  sheet.getRow(1).font = { bold: true };

  const buffer = await workbook.xlsx.writeBuffer();

  return new NextResponse(buffer as unknown as BodyInit, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="cartola-articulos.xlsx"',
    },
  });
}
