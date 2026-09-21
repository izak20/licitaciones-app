import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/api/require-user";
import { mapPostgresError } from "@/lib/api/errors";

// POST /api/movimientos/devoluciones — Devolución a proveedor (sección
// 5.4). Descuenta el lote y registra el movimiento; el proveedor ya
// queda identificado a través de lote.id_proveedor.
const devolucionSchema = z.object({
  id_lote: z.string().uuid(),
  cantidad: z.number().positive(),
  observacion: z.string().optional(),
});

export async function POST(request: Request) {
  const { supabase, user, unauthorized } = await requireUser();
  if (unauthorized) return unauthorized;

  const json = await request.json().catch(() => null);
  const parsed = devolucionSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const body = parsed.data;

  const { data: lote, error: loteError } = await supabase
    .from("lote")
    .select("cantidad_disponible, id_bodega, id_proveedor")
    .eq("id_lote", body.id_lote)
    .single();
  if (loteError || !lote) {
    return NextResponse.json({ error: "Lote no encontrado" }, { status: 404 });
  }
  if (!lote.id_proveedor) {
    return NextResponse.json(
      { error: "Este lote no tiene proveedor asociado, no se puede devolver" },
      { status: 400 },
    );
  }
  if (lote.cantidad_disponible < body.cantidad) {
    return NextResponse.json({ error: "Stock insuficiente en el lote" }, { status: 400 });
  }

  const { error: updateError } = await supabase
    .from("lote")
    .update({ cantidad_disponible: lote.cantidad_disponible - body.cantidad })
    .eq("id_lote", body.id_lote);
  if (updateError) {
    const mapped = mapPostgresError(updateError);
    return NextResponse.json({ error: mapped.message }, { status: mapped.status });
  }

  const { data: movimiento, error: movError } = await supabase
    .from("movimiento")
    .insert({
      tipo: "devolucion",
      id_lote: body.id_lote,
      id_bodega_origen: lote.id_bodega,
      cantidad: body.cantidad,
      estado: "recepcionado_sin_reparos",
      observacion: body.observacion ?? null,
      id_usuario: user.id,
    })
    .select()
    .single();
  if (movError) {
    const mapped = mapPostgresError(movError);
    return NextResponse.json({ error: mapped.message }, { status: mapped.status });
  }

  return NextResponse.json({ data: movimiento }, { status: 201 });
}
