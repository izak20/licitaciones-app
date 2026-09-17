import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/api/require-user";
import { mapPostgresError } from "@/lib/api/errors";

// POST /api/movimientos/traspasos/[id]/recepcion — Confirmación de
// recepción del traspaso (con o sin reparos). El traslado físico del
// stock ya ocurrió al crear el traspaso; esto solo cierra el estado.
const recepcionTraspasoSchema = z.object({
  con_reparos: z.boolean().optional(),
  observacion: z.string().optional(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { supabase, unauthorized } = await requireUser();
  if (unauthorized) return unauthorized;

  const json = await request.json().catch(() => ({}));
  const parsed = recepcionTraspasoSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { data: movimiento, error: fetchError } = await supabase
    .from("movimiento")
    .select("tipo")
    .eq("id_movimiento", id)
    .single();
  if (fetchError || !movimiento) {
    return NextResponse.json({ error: "Movimiento no encontrado" }, { status: 404 });
  }
  if (movimiento.tipo !== "traspaso") {
    return NextResponse.json(
      { error: "El movimiento indicado no es un traspaso" },
      { status: 400 },
    );
  }

  const estado = parsed.data.con_reparos
    ? "recepcionado_con_reparos"
    : "recepcionado_sin_reparos";

  const { data, error } = await supabase
    .from("movimiento")
    .update({ estado, observacion: parsed.data.observacion })
    .eq("id_movimiento", id)
    .select()
    .single();

  if (error) {
    const mapped = mapPostgresError(error);
    return NextResponse.json({ error: mapped.message }, { status: mapped.status });
  }

  return NextResponse.json({ data });
}
