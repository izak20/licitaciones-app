import { NextResponse } from "next/server";
import { requireUser } from "@/lib/api/require-user";
import { mapPostgresError } from "@/lib/api/errors";

// GET /api/despachos?fecha=&folio=&tipo= — Consulta por fecha, folio o
// tipo (sección 5.8). Incluye despachos y traspasos: ambos son
// movimientos "enviados" que un destino debe confirmar.
export async function GET(request: Request) {
  const { supabase, unauthorized } = await requireUser();
  if (unauthorized) return unauthorized;

  const { searchParams } = new URL(request.url);
  const fecha = searchParams.get("fecha");
  const folio = searchParams.get("folio");
  const tipo = searchParams.get("tipo");

  let query = supabase
    .from("movimiento")
    .select(
      "*, lote:id_lote(numero_lote, fecha_vencimiento, articulo:id_articulo(nombre, codigo_interno)), bodega_origen:id_bodega_origen(nombre), bodega_destino:id_bodega_destino(nombre), centro_costo:id_centro_costo(nombre)",
    )
    .in("tipo", tipo ? [tipo] : ["despacho", "traspaso"])
    .order("fecha_movimiento", { ascending: false });

  if (folio) query = query.eq("folio", folio);
  if (fecha) {
    const inicio = `${fecha}T00:00:00`;
    const fin = `${fecha}T23:59:59`;
    query = query.gte("fecha_movimiento", inicio).lte("fecha_movimiento", fin);
  }

  const { data, error } = await query;
  if (error) {
    const mapped = mapPostgresError(error);
    return NextResponse.json({ error: mapped.message }, { status: mapped.status });
  }

  return NextResponse.json({ data });
}
