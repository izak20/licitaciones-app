import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/api/require-user";
import { mapPostgresError } from "@/lib/api/errors";

// POST /api/movimientos/recepciones — Recepción con lote y vencimiento
// obligatorios cuando el artículo lo requiere (sección 5.4 y 6.2).
const recepcionSchema = z.object({
  id_bodega: z.string().uuid(),
  id_articulo: z.string().uuid(),
  cantidad: z.number().positive(),
  numero_lote: z.string().optional(),
  fecha_vencimiento: z.string().optional(),
  id_proveedor: z.string().uuid().optional(),
  id_centro_costo: z.string().uuid().optional(),
  con_reparos: z.boolean().optional(),
  observacion: z.string().optional(),
  precio_unitario: z.number().positive().optional(),
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

  const { data: articulo, error: articuloError } = await supabase
    .from("articulo")
    .select("requiere_lote")
    .eq("id_articulo", body.id_articulo)
    .single();
  if (articuloError || !articulo) {
    return NextResponse.json({ error: "Artículo no encontrado" }, { status: 404 });
  }

  if (articulo.requiere_lote && (!body.numero_lote || !body.fecha_vencimiento)) {
    return NextResponse.json(
      {
        error:
          "Este artículo requiere número de lote y fecha de vencimiento (especificación general N°11-14)",
      },
      { status: 400 },
    );
  }

  // articulo.requiere_lote = false igual necesita una fila en "lote":
  // movimiento.id_lote es NOT NULL en el esquema. Se usa un lote
  // "genérico" con vencimiento lejano para esos casos.
  const { data: lote, error: loteError } = await supabase
    .from("lote")
    .insert({
      id_articulo: body.id_articulo,
      numero_lote: body.numero_lote ?? "SIN-LOTE",
      fecha_vencimiento: body.fecha_vencimiento ?? "9999-12-31",
      id_bodega: body.id_bodega,
      cantidad_disponible: body.cantidad,
      id_proveedor: body.id_proveedor ?? null,
      precio_unitario: body.precio_unitario ?? null,
    })
    .select()
    .single();
  if (loteError) {
    const mapped = mapPostgresError(loteError);
    return NextResponse.json({ error: mapped.message }, { status: mapped.status });
  }

  const { data: movimiento, error: movError } = await supabase
    .from("movimiento")
    .insert({
      tipo: "recepcion",
      id_lote: lote.id_lote,
      id_bodega_destino: body.id_bodega,
      id_centro_costo: body.id_centro_costo ?? null,
      cantidad: body.cantidad,
      estado: body.con_reparos ? "recepcionado_con_reparos" : "recepcionado_sin_reparos",
      observacion: body.observacion ?? null,
      id_usuario: user.id,
    })
    .select()
    .single();
  if (movError) {
    const mapped = mapPostgresError(movError);
    return NextResponse.json(
      { error: mapped.message, lote },
      { status: mapped.status },
    );
  }

  return NextResponse.json({ data: { lote, movimiento } }, { status: 201 });
}
