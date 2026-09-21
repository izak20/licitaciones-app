import { NextResponse } from "next/server";
import { requireUser } from "@/lib/api/require-user";
import { mapPostgresError } from "@/lib/api/errors";

// GET /api/perfiles — Listado de los 4 perfiles (sección 5.2), para
// poblar el selector real del modal "Nuevo usuario".
export async function GET() {
  const { supabase, unauthorized } = await requireUser();
  if (unauthorized) return unauthorized;

  const { data, error } = await supabase
    .from("perfil")
    .select("id_perfil, nombre")
    .eq("activo", true)
    .order("nombre");

  if (error) {
    const mapped = mapPostgresError(error);
    return NextResponse.json({ error: mapped.message }, { status: mapped.status });
  }

  return NextResponse.json({ data });
}
