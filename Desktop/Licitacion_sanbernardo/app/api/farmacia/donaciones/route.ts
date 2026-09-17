import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/api/require-user";
import { mapPostgresError } from "@/lib/api/errors";

// POST /api/farmacia/donaciones — Registro de donación (sección 5.10):
// ingreso de stock igual que una recepción (sección 6.3 reutiliza el
// mismo flujo), pero sin proveedor — se deja el donante en observación.
const donacionSchema = z.object({
  id_bodega: z.string().uuid(),
  id_articulo: z.string().uuid(),
  cantidad: z.number().positive(),
  numero_lote: z.string().optional(),
  fecha_vencimiento: z.string().optional(),
  donante: z.string().optional(),
  observacion: z.string().optional(),
});

export async function POST(request: Request) {
  const { supabase, user, unauthorized } = await requireUser();
  if (unauthorized) return unauthorized;

  const json = await request.json().catch(() => null);
  const parsed = donacionSchema.safeParse(json);
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
      { error: "Este artículo requiere número de lote y fecha de vencimiento" },
      { status: 400 },
    );
  }

  const { data: lote, error: loteError } = await supabase
    .from("lote")
    .insert({
      id_articulo: body.id_articulo,
      numero_lote: body.numero_lote ?? "SIN-LOTE",
      fecha_vencimiento: body.fecha_vencimiento ?? "9999-12-31",
      id_bodega: body.id_bodega,
      cantidad_disponible: body.cantidad,
    })
    .select()
    .single();
  if (loteError) {
    const mapped = mapPostgresError(loteError);
    return NextResponse.json({ error: mapped.message }, { status: mapped.status });
  }

  const observacion = body.donante
    ? `Donante: ${body.donante}${body.observacion ? " — " + body.observacion : ""}`
    : body.observacion ?? null;

  const { data: movimiento, error: movError } = await supabase
    .from("movimiento")
    .insert({
      tipo: "donacion",
      id_lote: lote.id_lote,
      id_bodega_destino: body.id_bodega,
      cantidad: body.cantidad,
      estado: "recepcionado_sin_reparos",
      observacion,
      id_usuario: user.id,
    })
    .select()
    .single();
  if (movError) {
    const mapped = mapPostgresError(movError);
    return NextResponse.json({ error: mapped.message, lote }, { status: mapped.status });
  }

  return NextResponse.json({ data: { lote, movimiento } }, { status: 201 });
}
