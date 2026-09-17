import { NextResponse } from "next/server";
import { requireUser } from "@/lib/api/require-user";
import { mapPostgresError } from "@/lib/api/errors";

// GET /api/inventario/lotes-vencidos?bodega= — Listado de lotes vencidos
// (sección 5.6). Se deriva de lote.fecha_vencimiento, sin tabla propia.
export async function GET(request: Request) {
  const { supabase, unauthorized } = await requireUser();
  if (unauthorized) return unauthorized;

  const { searchParams } = new URL(request.url);
  const bodega = searchParams.get("bodega");
  const hoy = new Date().toISOString().slice(0, 10);

  let query = supabase
    .from("lote")
    .select(
      "id_lote, numero_lote, fecha_vencimiento, cantidad_disponible, id_bodega, articulo:id_articulo(nombre), bodega:id_bodega(nombre)",
    )
    .lt("fecha_vencimiento", hoy)
    .gt("cantidad_disponible", 0)
    .order("fecha_vencimiento");

  if (bodega) query = query.eq("id_bodega", bodega);

  const { data, error } = await query;
  if (error) {
    const mapped = mapPostgresError(error);
    return NextResponse.json({ error: mapped.message }, { status: mapped.status });
  }

  return NextResponse.json({ data });
}
