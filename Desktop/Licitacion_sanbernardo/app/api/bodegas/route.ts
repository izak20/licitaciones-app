import { NextResponse } from "next/server";
import { requireUser } from "@/lib/api/require-user";
import { mapPostgresError } from "@/lib/api/errors";

// GET /api/bodegas — Listado liviano para selectores del frontend
// (no es una ruta de la sección 5; es soporte mínimo para poblar los
// <select> de bodega con datos reales en vez de texto de mockup).
export async function GET() {
  const { supabase, unauthorized } = await requireUser();
  if (unauthorized) return unauthorized;

  const { data, error } = await supabase
    .from("bodega")
    .select("id_bodega, nombre, tipo")
    .eq("activa", true)
    .order("nombre");

  if (error) {
    const mapped = mapPostgresError(error);
    return NextResponse.json({ error: mapped.message }, { status: mapped.status });
  }

  return NextResponse.json({ data });
}
