import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/api/require-user";
import { mapPostgresError } from "@/lib/api/errors";
import { crearNotificacionDiferencia } from "@/lib/api/notificaciones";

// POST /api/despachos/[id]/diferencias — Registra diferencias en un
// despacho y dispara notificación Realtime (sección 5.8 y 6.2).
const diferenciasSchema = z.object({
  observacion: z.string().min(1, "La observación de la diferencia es obligatoria"),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { supabase, user, unauthorized } = await requireUser();
  if (unauthorized) return unauthorized;

  const json = await request.json().catch(() => null);
  const parsed = diferenciasSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { data: movimiento, error: fetchError } = await supabase
    .from("movimiento")
    .select("tipo, id_bodega_destino, id_bodega_origen")
    .eq("id_movimiento", id)
    .single();
  if (fetchError || !movimiento) {
    return NextResponse.json({ error: "Movimiento no encontrado" }, { status: 404 });
  }
  if (movimiento.tipo !== "despacho") {
    return NextResponse.json(
      { error: "El movimiento indicado no es un despacho" },
      { status: 400 },
    );
  }

  const { data, error } = await supabase
    .from("movimiento")
    .update({ estado: "recepcionado_con_reparos", observacion: parsed.data.observacion })
    .eq("id_movimiento", id)
    .select()
    .single();
  if (error) {
    const mapped = mapPostgresError(error);
    return NextResponse.json({ error: mapped.message }, { status: mapped.status });
  }

  await crearNotificacionDiferencia(supabase, {
    idMovimiento: id,
    idBodega: movimiento.id_bodega_destino ?? movimiento.id_bodega_origen,
    idUsuario: user.id,
    mensaje: `Despacho con diferencias: ${parsed.data.observacion}`,
  });

  return NextResponse.json({ data });
}
