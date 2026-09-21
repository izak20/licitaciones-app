import { NextResponse } from "next/server";
import { requireUser } from "@/lib/api/require-user";
import { generarPlantilla } from "@/lib/api/carga-masiva";

// GET /api/proveedores/masivo/plantilla — Plantilla Excel para carga
// masiva de proveedores.
export async function GET() {
  const { unauthorized } = await requireUser();
  if (unauthorized) return unauthorized;

  const buffer = await generarPlantilla(
    "Proveedores",
    [
      { header: "rut", key: "rut", ejemplo: "96.575.810-0", ancho: 16 },
      { header: "razon_social", key: "razon_social", ejemplo: "Laboratorio Chile S.A.", ancho: 30 },
      { header: "direccion", key: "direccion", ejemplo: "Av. Marathon 1315, Macul", ancho: 30 },
      { header: "telefono", key: "telefono", ejemplo: "+56 2 2510 4000" },
      { header: "email", key: "email", ejemplo: "contacto@ejemplo.cl" },
      { header: "nombre_ejecutivo", key: "nombre_ejecutivo", ejemplo: "Andrea Lizana" },
      { header: "telefono_ejecutivo", key: "telefono_ejecutivo", ejemplo: "+56 9 8412 7730" },
    ],
    ["rut y razon_social son obligatorios; el resto queda vacío si no aplica."],
  );

  return new NextResponse(buffer as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="plantilla-proveedores.xlsx"',
    },
  });
}
