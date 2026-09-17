import { NextResponse } from "next/server";
import { requireUser } from "@/lib/api/require-user";
import { mapPostgresError } from "@/lib/api/errors";

// GET /api/lotes?bodega=<id_bodega> — Lotes con stock disponible, para
// poblar el selector de "lote de origen" en despacho y traspaso (no es
// una ruta de la sección 5; es soporte mínimo para el frontend). Sin
// "bodega" devuelve el stock disponible en todas las bodegas.
export async function GET(request: Request) {
  const { supabase, unauthorized } = await requireUser();
  if (unauthorized) return unauthorized;

  const { searchParams } = new URL(request.url);
  const idBodega = searchParams.get("bodega");

  let query = supabase
    .from("lote")
    .select(
      "id_lote, numero_lote, fecha_vencimiento, cantidad_disponible, id_bodega, bodega:id_bodega(nombre), articulo:id_articulo(id_articulo, nombre)",
    )
    .gt("cantidad_disponible", 0)
    .order("fecha_vencimiento");

  if (idBodega) query = query.eq("id_bodega", idBodega);

  const { data, error } = await query;

  if (error) {
    const mapped = mapPostgresError(error);
    return NextResponse.json({ error: mapped.message }, { status: mapped.status });
  }

  return NextResponse.json({ data });
}
