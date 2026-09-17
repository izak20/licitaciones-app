import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/api/require-user";
import { mapPostgresError } from "@/lib/api/errors";

// POST /api/abastecimiento/ordenes — Generar orden de abastecimiento
// (sección 5.7). Automática por consumo o por stock mínimo: las líneas
// las arma fn_generar_orden_automatica (sección 6.2). Por solicitud:
// quien la pide entrega las líneas directamente.
const ordenSchema = z.discriminatedUnion("modo", [
  z.object({
    modo: z.enum(["automatica_consumo", "automatica_stock_minimo"]),
    id_bodega: z.string().uuid(),
  }),
  z.object({
    modo: z.literal("solicitud"),
    id_bodega: z.string().uuid(),
    lineas: z
      .array(
        z.object({
          id_articulo: z.string().uuid(),
          cantidad: z.number().positive(),
          observacion: z.string().optional(),
        }),
      )
      .min(1),
  }),
]);

export async function POST(request: Request) {
  const { supabase, user, unauthorized } = await requireUser();
  if (unauthorized) return unauthorized;

  const json = await request.json().catch(() => null);
  const parsed = ordenSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const body = parsed.data;

  let idOrden: string;

  if (body.modo === "solicitud") {
    const { data: folio, error: folioError } = await supabase.rpc(
      "fn_siguiente_folio_orden",
    );
    if (folioError || !folio) {
      return NextResponse.json(
        { error: "No se pudo generar el folio de la orden" },
        { status: 500 },
      );
    }

    const { data: orden, error: ordenError } = await supabase
      .from("orden_abastecimiento")
      .insert({
        folio,
        origen: "solicitud",
        id_bodega_solicitante: body.id_bodega,
        id_usuario: user.id,
      })
      .select()
      .single();
    if (ordenError) {
      const mapped = mapPostgresError(ordenError);
      return NextResponse.json({ error: mapped.message }, { status: mapped.status });
    }
    idOrden = orden.id_orden;

    const { error: lineasError } = await supabase
      .from("orden_abastecimiento_linea")
      .insert(
        body.lineas.map((l) => ({
          id_orden: idOrden,
          id_articulo: l.id_articulo,
          cantidad_solicitada: l.cantidad,
          observacion: l.observacion ?? null,
        })),
      );
    if (lineasError) {
      const mapped = mapPostgresError(lineasError);
      return NextResponse.json({ error: mapped.message }, { status: mapped.status });
    }
  } else {
    const { data, error } = await supabase.rpc("fn_generar_orden_automatica", {
      p_modo: body.modo,
      p_id_bodega: body.id_bodega,
    });
    if (error || !data) {
      const mapped = mapPostgresError(error ?? { message: "No se pudo generar la orden" });
      return NextResponse.json({ error: mapped.message }, { status: mapped.status });
    }
    idOrden = data as string;
  }

  const { data: ordenCompleta, error: fetchError } = await supabase
    .from("orden_abastecimiento")
    .select("*, lineas:orden_abastecimiento_linea(*, articulo:id_articulo(nombre, codigo_interno))")
    .eq("id_orden", idOrden)
    .single();
  if (fetchError) {
    const mapped = mapPostgresError(fetchError);
    return NextResponse.json({ error: mapped.message }, { status: mapped.status });
  }

  return NextResponse.json({ data: ordenCompleta }, { status: 201 });
}
