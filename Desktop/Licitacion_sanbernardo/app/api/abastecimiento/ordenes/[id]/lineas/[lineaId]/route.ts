import { NextResponse } from "next/server";
import { requireUser } from "@/lib/api/require-user";
import { mapPostgresError } from "@/lib/api/errors";

// DELETE /api/abastecimiento/ordenes/[id]/lineas/[lineaId] — Eliminar
// línea de la orden (sección 5.7).
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; lineaId: string }> },
) {
  const { id, lineaId } = await params;
  const { supabase, unauthorized } = await requireUser();
  if (unauthorized) return unauthorized;

  const { error } = await supabase
    .from("orden_abastecimiento_linea")
    .delete()
    .eq("id_linea", lineaId)
    .eq("id_orden", id);

  if (error) {
    const mapped = mapPostgresError(error);
    return NextResponse.json({ error: mapped.message }, { status: mapped.status });
  }

  return NextResponse.json({ data: { eliminada: true } });
}
