import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/api/require-user";
import { mapPostgresError } from "@/lib/api/errors";
import { crearNotificacionDiferencia } from "@/lib/api/notificaciones";

// POST /api/recepciones — Registrar recepción con o sin reparos
// (sección 5.8): cierra el estado de un despacho o traspaso ya
// enviado. El traslado físico del stock ya ocurrió al crear el
// movimiento; esto confirma su llegada y, si hay reparos, avisa por
// Realtime (sección 6.2, reutilizado también por Farmacia en 6.3).
const recepcionSchema = z.object({
  id_movimiento: z.string().uuid(),
  con_reparos: z.boolean().optional(),
  observacion: z.string().optional(),
});

export async function POST(request: Request) {
  const { supabase, user, unauthorized } = await requireUser();
  if (unauthorized) return unauthorized;

  const json = await request.json().catch(() => null);
  const parsed = recepcionSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const body = parsed.data;

  const { data: movimiento, error: fetchError } = await supabase
    .from("movimiento")
    .select("tipo, estado, id_bodega_destino, id_bodega_origen")
    .eq("id_movimiento", body.id_movimiento)
    .single();
  if (fetchError || !movimiento) {
    return NextResponse.json({ error: "Movimiento no encontrado" }, { status: 404 });
  }
  if (!["despacho", "traspaso"].includes(movimiento.tipo)) {
    return NextResponse.json(
      { error: "Solo se pueden confirmar recepciones de despachos o traspasos" },
      { status: 400 },
    );
  }
  if (!["enviado", "en_transito"].includes(movimiento.estado)) {
    return NextResponse.json(
      { error: "Este movimiento ya fue recepcionado" },
      { status: 400 },
    );
  }

  const estado = body.con_reparos ? "recepcionado_con_reparos" : "recepcionado_sin_reparos";

  const { data, error } = await supabase
    .from("movimiento")
    .update({ estado, observacion: body.observacion })
    .eq("id_movimiento", body.id_movimiento)
    .select()
    .single();
  if (error) {
    const mapped = mapPostgresError(error);
    return NextResponse.json({ error: mapped.message }, { status: mapped.status });
  }

  if (body.con_reparos) {
    await crearNotificacionDiferencia(supabase, {
      idMovimiento: body.id_movimiento,
      idBodega: movimiento.id_bodega_destino ?? movimiento.id_bodega_origen,
      idUsuario: user.id,
      mensaje: `Recepción con reparos: ${body.observacion ?? "sin detalle"}`,
    });
  }

  return NextResponse.json({ data });
}
