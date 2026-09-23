import { NextResponse } from "next/server";
import { requireUser } from "@/lib/api/require-user";
import { generarPlantilla } from "@/lib/api/carga-masiva";

// GET /api/movimientos/recepciones/masivo/plantilla — Plantilla Excel
// para carga masiva de recepciones (útil para el stock inicial en la
// puesta en marcha).
export async function GET() {
  const { unauthorized } = await requireUser();
  if (unauthorized) return unauthorized;

  const buffer = await generarPlantilla(
    "Recepciones",
    [
      { header: "codigo_interno", key: "codigo_interno", ejemplo: "ART-001042", ancho: 18 },
      { header: "bodega", key: "bodega", ejemplo: "Droguería Comunal", ancho: 22 },
      { header: "numero_lote", key: "numero_lote", ejemplo: "L-22910", ancho: 16 },
      { header: "fecha_vencimiento", key: "fecha_vencimiento", ejemplo: "2028-04-30", ancho: 18 },
      { header: "cantidad", key: "cantidad", ejemplo: 100, ancho: 12 },
      { header: "proveedor_rut", key: "proveedor_rut", ejemplo: "", ancho: 16 },
      { header: "precio_unitario", key: "precio_unitario", ejemplo: 1250, ancho: 16 },
    ],
    [
      "codigo_interno, bodega y cantidad son obligatorios.",
      "numero_lote y fecha_vencimiento son obligatorios si el artículo requiere trazabilidad por lote.",
      "fecha_vencimiento en formato AAAA-MM-DD. proveedor_rut y precio_unitario son opcionales.",
      "precio_unitario permite calcular reportes de gasto real; si se omite, ese lote no valoriza en esos reportes.",
    ],
  );

  return new NextResponse(buffer as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="plantilla-recepciones.xlsx"',
    },
  });
}
