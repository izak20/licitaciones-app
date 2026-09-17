import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/api/require-user";
import { mapPostgresError } from "@/lib/api/errors";

// POST /api/farmacia/despachos-internos — Despacho a cuentas internas
// (sección 5.10): consumo interno de un centro de salud contra un
// centro de costo propio, no hacia otra bodega.
const despachoInternoSchema = z.object({
  id_bodega: z.string().uuid(),
  id_centro_costo: z.string().uuid(),
  id_lote: z.string().uuid(),
  cantidad: z.number().positive(),
  observacion: z.string().optional(),
});

export async function POST(request: Request) {
  const { supabase, user, unauthorized } = await requireUser();
  if (unauthorized) return unauthorized;

  const json = await request.json().catch(() => null);
  const parsed = despachoInternoSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const body = parsed.data;

  const { data: lote, error: loteError } = await supabase
    .from("lote")
    .select("cantidad_disponible")
    .eq("id_lote", body.id_lote)
    .eq("id_bodega", body.id_bodega)
    .single();
  if (loteError || !lote) {
    return NextResponse.json(
      { error: "Lote no encontrado en la bodega indicada" },
      { status: 404 },
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
      tipo: "despacho",
      id_lote: body.id_lote,
      id_bodega_origen: body.id_bodega,
      id_centro_costo: body.id_centro_costo,
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
