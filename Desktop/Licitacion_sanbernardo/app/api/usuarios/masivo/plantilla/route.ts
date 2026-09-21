import { NextResponse } from "next/server";
import { requireUser } from "@/lib/api/require-user";
import { generarPlantilla } from "@/lib/api/carga-masiva";

// GET /api/usuarios/masivo/plantilla — Plantilla Excel para carga
// masiva de usuarios.
export async function GET() {
  const { unauthorized } = await requireUser();
  if (unauthorized) return unauthorized;

  const buffer = await generarPlantilla(
    "Usuarios",
    [
      { header: "nombre_completo", key: "nombre_completo", ejemplo: "Verónica Tapia", ancho: 24 },
      { header: "email", key: "email", ejemplo: "v.tapia@ejemplo.cl", ancho: 26 },
      { header: "password", key: "password", ejemplo: "clave123456", ancho: 16 },
      { header: "perfil", key: "perfil", ejemplo: "Cliente Interno", ancho: 18 },
      { header: "bodega", key: "bodega", ejemplo: "", ancho: 22 },
    ],
    [
      "Todas las columnas son obligatorias salvo bodega (solo aplica a Cliente Interno).",
      "perfil debe ser uno de los 4 exactos: Administrador, Usuario Droguería, Usuario Finanzas, Cliente Interno.",
      "password: mínimo 6 caracteres.",
    ],
  );

  return new NextResponse(buffer as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="plantilla-usuarios.xlsx"',
    },
  });
}
