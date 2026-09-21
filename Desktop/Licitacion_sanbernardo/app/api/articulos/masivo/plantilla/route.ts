import { NextResponse } from "next/server";
import { requireUser } from "@/lib/api/require-user";
import { generarPlantilla } from "@/lib/api/carga-masiva";

// GET /api/articulos/masivo/plantilla — Plantilla Excel para carga
// masiva de artículos.
export async function GET() {
  const { unauthorized } = await requireUser();
  if (unauthorized) return unauthorized;

  const buffer = await generarPlantilla(
    "Artículos",
    [
      { header: "codigo_interno", key: "codigo_interno", ejemplo: "ART-001042", ancho: 18 },
      { header: "nombre", key: "nombre", ejemplo: "Paracetamol 500 mg comprimido", ancho: 32 },
      { header: "grupo", key: "grupo", ejemplo: "Medicamentos" },
      { header: "familia", key: "familia", ejemplo: "Analgésicos" },
      { header: "subfamilia", key: "subfamilia", ejemplo: "Comprimidos" },
      { header: "unidad_medida", key: "unidad_medida", ejemplo: "Comprimido" },
      { header: "es_controlado", key: "es_controlado", ejemplo: "No" },
      { header: "requiere_cadena_frio", key: "requiere_cadena_frio", ejemplo: "No" },
      { header: "requiere_lote", key: "requiere_lote", ejemplo: "Si" },
      { header: "condicion_almacenamiento", key: "condicion_almacenamiento", ejemplo: "" },
      { header: "registro_sanitario", key: "registro_sanitario", ejemplo: "" },
    ],
    [
      "codigo_interno y nombre son obligatorios; el resto queda vacío si no aplica.",
      "es_controlado / requiere_cadena_frio / requiere_lote: Si o No.",
    ],
  );

  return new NextResponse(buffer as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="plantilla-articulos.xlsx"',
    },
  });
}
