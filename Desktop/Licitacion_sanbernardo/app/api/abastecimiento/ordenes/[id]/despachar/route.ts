import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/api/require-user";
import { mapPostgresError } from "@/lib/api/errors";

// POST /api/abastecimiento/ordenes/[id]/despachar — Despacha una orden
// de abastecimiento generando un traspaso real (con trazabilidad de
// lote) por cada línea, y la deja en estado 'despachada'. Conecta la
// solicitud con el traspaso entre bodegas que ya existía (envío +
// confirmación de recepción vía /movimientos/traspasos), que hasta
// ahora no estaban enlazados aunque el esquema original ya traía las
// columnas para hacerlo (orden_abastecimiento.estado 'despachada',
// movimiento.id_orden_abastecimiento) — ver 010_despachar_orden.sql.
const despacharSchema = z.object({
  lineas: z
    .array(
      z.object({
        id_linea: z.string().uuid(),
        id_lote: z.string().uuid(),
        cantidad: z.number().positive(),
      }),
    )
    .min(1),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { supabase, unauthorized } = await requireUser();
  if (unauthorized) return unauthorized;

  const json = await request.json().catch(() => null);
  const parsed = despacharSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { data: orden, error: ordenError } = await supabase
    .from("orden_abastecimiento")
    .select("id_orden, id_bodega_solicitante, estado")
    .eq("id_orden", id)
    .single();
  if (ordenError || !orden) {
    return NextResponse.json({ error: "Orden no encontrada" }, { status: 404 });
  }
  if (orden.estado !== "generada" && orden.estado !== "aprobada") {
    return NextResponse.json(
      { error: "La orden ya fue despachada o cerrada" },
      { status: 400 },
    );
  }

  for (const linea of parsed.data.lineas) {
    const { data: lote, error: loteError } = await supabase
      .from("lote")
      .select("id_bodega")
      .eq("id_lote", linea.id_lote)
      .single();
    if (loteError || !lote) {
      return NextResponse.json({ error: "Lote no encontrado" }, { status: 404 });
    }

    const { error: traspasoError } = await supabase.rpc("fn_crear_traspaso", {
      p_id_bodega_origen: lote.id_bodega,
      p_id_bodega_destino: orden.id_bodega_solicitante,
      p_id_lote: linea.id_lote,
      p_cantidad: linea.cantidad,
      p_observacion: "Despacho de orden de abastecimiento",
      p_id_orden_abastecimiento: orden.id_orden,
    });
    if (traspasoError) {
      const mapped = mapPostgresError(traspasoError);
      return NextResponse.json(
        { error: traspasoError.message || mapped.message },
        { status: mapped.status },
      );
    }

    const { error: lineaError } = await supabase
      .from("orden_abastecimiento_linea")
      .update({ cantidad_aprobada: linea.cantidad })
      .eq("id_linea", linea.id_linea);
    if (lineaError) {
      const mapped = mapPostgresError(lineaError);
      return NextResponse.json({ error: mapped.message }, { status: mapped.status });
    }
  }

  const { data, error } = await supabase
    .from("orden_abastecimiento")
    .update({ estado: "despachada" })
    .eq("id_orden", id)
    .select()
    .single();
  if (error) {
    const mapped = mapPostgresError(error);
    return NextResponse.json({ error: mapped.message }, { status: mapped.status });
  }

  return NextResponse.json({ data });
}
