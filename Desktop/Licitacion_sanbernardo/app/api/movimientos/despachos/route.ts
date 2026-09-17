import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/api/require-user";
import { mapPostgresError } from "@/lib/api/errors";

// POST /api/movimientos/despachos — Genera folio único (secuencia
// Postgres, sección 6.2) y admite lectura de código de barra para
// resolver el lote a despachar (FEFO: el de vencimiento más próximo).
const despachoSchema = z
  .object({
    id_bodega_origen: z.string().uuid(),
    id_centro_costo: z.string().uuid(),
    cantidad: z.number().positive(),
    id_lote: z.string().uuid().optional(),
    codigo_barra: z.string().optional(),
    observacion: z.string().optional(),
  })
  .refine((v) => v.id_lote || v.codigo_barra, {
    message: "Debe indicar id_lote o codigo_barra",
  });

export async function POST(request: Request) {
  const { supabase, user, unauthorized } = await requireUser();
  if (unauthorized) return unauthorized;

  const json = await request.json().catch(() => null);
  const parsed = despachoSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const body = parsed.data;

  let loteId = body.id_lote;

  if (!loteId && body.codigo_barra) {
    const { data: cb } = await supabase
      .from("codigo_barra")
      .select("id_articulo")
      .eq("codigo", body.codigo_barra)
      .maybeSingle();
    if (!cb) {
      return NextResponse.json(
        { error: "Código de barra no reconocido" },
        { status: 404 },
      );
    }
    const { data: loteDisponible } = await supabase
      .from("lote")
      .select("id_lote")
      .eq("id_articulo", cb.id_articulo)
      .eq("id_bodega", body.id_bodega_origen)
      .gt("cantidad_disponible", 0)
      .order("fecha_vencimiento", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (!loteDisponible) {
      return NextResponse.json(
        { error: "No hay stock disponible para ese artículo en la bodega indicada" },
        { status: 400 },
      );
    }
    loteId = loteDisponible.id_lote;
  }

  const { data: loteActual, error: loteFetchError } = await supabase
    .from("lote")
    .select("cantidad_disponible")
    .eq("id_lote", loteId)
    .single();
  if (loteFetchError || !loteActual) {
    return NextResponse.json({ error: "Lote no encontrado" }, { status: 404 });
  }
  if (loteActual.cantidad_disponible < body.cantidad) {
    return NextResponse.json(
      { error: "Stock insuficiente en el lote" },
      { status: 400 },
    );
  }

  const { data: folio, error: folioError } = await supabase.rpc(
    "fn_siguiente_folio_despacho",
  );
  if (folioError || !folio) {
    return NextResponse.json(
      { error: "No se pudo generar el folio de despacho" },
      { status: 500 },
    );
  }

  const { error: updateLoteError } = await supabase
    .from("lote")
    .update({ cantidad_disponible: loteActual.cantidad_disponible - body.cantidad })
    .eq("id_lote", loteId);
  if (updateLoteError) {
    const mapped = mapPostgresError(updateLoteError);
    return NextResponse.json({ error: mapped.message }, { status: mapped.status });
  }

  const { data: movimiento, error: movError } = await supabase
    .from("movimiento")
    .insert({
      tipo: "despacho",
      id_lote: loteId,
      id_bodega_origen: body.id_bodega_origen,
      id_centro_costo: body.id_centro_costo,
      cantidad: body.cantidad,
      folio,
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
