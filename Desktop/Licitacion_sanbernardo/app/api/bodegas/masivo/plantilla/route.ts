import { NextResponse } from "next/server";
import { requireUser } from "@/lib/api/require-user";
import { generarPlantilla } from "@/lib/api/carga-masiva";

// GET /api/bodegas/masivo/plantilla — Plantilla Excel para carga
// masiva de bodegas y sub-bodegas.
export async function GET() {
  const { unauthorized } = await requireUser();
  if (unauthorized) return unauthorized;

  const buffer = await generarPlantilla(
    "Bodegas",
    [
      { header: "nombre", key: "nombre", ejemplo: "Bodega refrigerada 3", ancho: 26 },
      { header: "tipo", key: "tipo", ejemplo: "bodega", ancho: 18 },
      { header: "bodega_padre", key: "bodega_padre", ejemplo: "Droguería Comunal", ancho: 24 },
      { header: "direccion", key: "direccion", ejemplo: "" },
      { header: "requiere_cadena_frio", key: "requiere_cadena_frio", ejemplo: "Si" },
    ],
    [
      "nombre y tipo son obligatorios. tipo: centro_distribucion, bodega o sub_bodega.",
      "bodega_padre es el nombre exacto de una bodega ya existente (o de una fila anterior en el mismo archivo); déjalo vacío si no aplica.",
      "requiere_cadena_frio: Si o No.",
    ],
  );

  return new NextResponse(buffer as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="plantilla-bodegas.xlsx"',
    },
  });
}
