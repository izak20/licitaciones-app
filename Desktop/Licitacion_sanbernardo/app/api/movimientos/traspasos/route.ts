import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/api/require-user";
import { mapPostgresError } from "@/lib/api/errors";

// POST /api/movimientos/traspasos — Traspaso entre bodegas. Actualiza
// lote.id_bodega (repartiendo cantidad, no la fila completa) en la
// misma transacción que inserta el movimiento (sección 6.2, regla N°16),
// vía la función fn_crear_traspaso para que sea atómico.
const traspasoSchema = z.object({
  id_bodega_origen: z.string().uuid(),
  id_bodega_destino: z.string().uuid(),
  id_lote: z.string().uuid(),
  cantidad: z.number().positive(),
  observacion: z.string().optional(),
});

export async function POST(request: Request) {
  const { supabase, unauthorized } = await requireUser();
  if (unauthorized) return unauthorized;

  const json = await request.json().catch(() => null);
  const parsed = traspasoSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const body = parsed.data;

  const { data, error } = await supabase.rpc("fn_crear_traspaso", {
    p_id_bodega_origen: body.id_bodega_origen,
    p_id_bodega_destino: body.id_bodega_destino,
    p_id_lote: body.id_lote,
    p_cantidad: body.cantidad,
    p_observacion: body.observacion ?? null,
  });

  if (error) {
    const mapped = mapPostgresError(error);
    return NextResponse.json(
      { error: error.message || mapped.message },
      { status: mapped.status },
    );
  }

  return NextResponse.json({ data }, { status: 201 });
}
