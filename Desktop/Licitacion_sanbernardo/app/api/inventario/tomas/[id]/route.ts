import { NextResponse } from "next/server";
import { requireUser } from "@/lib/api/require-user";
import { mapPostgresError } from "@/lib/api/errors";

// GET /api/inventario/tomas/[id] — Detalle de una toma con sus líneas
// (sección 5.6), para la vista "Ajustar conteo" del frontend.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { supabase, unauthorized } = await requireUser();
  if (unauthorized) return unauthorized;

  const { data: toma, error: tomaError } = await supabase
    .from("toma_inventario")
    .select("*, bodega:id_bodega(nombre)")
    .eq("id_toma", id)
    .single();
  if (tomaError) {
    const mapped = mapPostgresError(tomaError);
    return NextResponse.json({ error: mapped.message }, { status: mapped.status });
  }

  const { data: lineas, error: lineasError } = await supabase
    .from("toma_inventario_linea")
    .select(
      "id_linea, cantidad_sistema, cantidad_contada, diferencia, observacion, lote:id_lote(numero_lote, articulo:id_articulo(nombre, codigo_interno))",
    )
    .eq("id_toma", id);
  if (lineasError) {
    const mapped = mapPostgresError(lineasError);
    return NextResponse.json({ error: mapped.message }, { status: mapped.status });
  }

  return NextResponse.json({ data: { ...toma, lineas } });
}
