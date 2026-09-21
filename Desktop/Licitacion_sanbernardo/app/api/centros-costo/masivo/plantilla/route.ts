import { NextResponse } from "next/server";
import { requireUser } from "@/lib/api/require-user";
import { generarPlantilla } from "@/lib/api/carga-masiva";

// GET /api/centros-costo/masivo/plantilla — Plantilla Excel para carga
// masiva de centros de costo.
export async function GET() {
  const { unauthorized } = await requireUser();
  if (unauthorized) return unauthorized;

  const buffer = await generarPlantilla(
    "Centros de costo",
    [
      { header: "codigo", key: "codigo", ejemplo: "CC-006", ancho: 14 },
      { header: "nombre", key: "nombre", ejemplo: "Programa Cardiovascular", ancho: 30 },
      { header: "bodega", key: "bodega", ejemplo: "Droguería Comunal", ancho: 24 },
    ],
    ["Las 3 columnas son obligatorias. bodega debe ser el nombre exacto de una bodega ya existente."],
  );

  return new NextResponse(buffer as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="plantilla-centros-costo.xlsx"',
    },
  });
}
