import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/api/require-user";
import { mapPostgresError } from "@/lib/api/errors";

// POST /api/inventario/retiros — Retirar productos vencidos (sección
// 5.6, 6.4): descuenta el stock al confirmar y queda registrado como
// ajuste en movimiento (el trigger de auditoría lo deja en el log).
const retiroSchema = z.object({
  id_lote: z.string().uuid(),
  cantidad: z.number().positive(),
  motivo: z.string().optional(),
});

export async function POST(request: Request) {
  const { supabase, user, unauthorized } = await requireUser();
  if (unauthorized) return unauthorized;

  const json = await request.json().catch(() => null);
  const parsed = retiroSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { data: lote, error: loteError } = await supabase
    .from("lote")
    .select("cantidad_disponible, id_bodega")
    .eq("id_lote", parsed.data.id_lote)
    .single();
  if (loteError || !lote) {
    return NextResponse.json({ error: "Lote no encontrado" }, { status: 404 });
  }
  if (lote.cantidad_disponible < parsed.data.cantidad) {
    return NextResponse.json(
      { error: "La cantidad a retirar supera el stock disponible del lote" },
      { status: 400 },
    );
  }

  const { error: updateError } = await supabase
    .from("lote")
    .update({ cantidad_disponible: lote.cantidad_disponible - parsed.data.cantidad })
    .eq("id_lote", parsed.data.id_lote);
  if (updateError) {
    const mapped = mapPostgresError(updateError);
    return NextResponse.json({ error: mapped.message }, { status: mapped.status });
  }

  const { data: movimiento, error: movError } = await supabase
    .from("movimiento")
    .insert({
      tipo: "ajuste",
      id_lote: parsed.data.id_lote,
      id_bodega_origen: lote.id_bodega,
      cantidad: parsed.data.cantidad,
      observacion: parsed.data.motivo ?? "Retiro de producto vencido",
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
