import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/api/require-user";
import { mapPostgresError } from "@/lib/api/errors";

// PATCH /api/inventario/tomas/[id]/lineas — Cargar resultado del conteo
// físico (sección 5.6). Actualiza cantidad_contada por línea; la
// diferencia contra el sistema se calcula sola (columna generada).
const lineasSchema = z.object({
  lineas: z.array(
    z.object({
      id_linea: z.string().uuid(),
      cantidad_contada: z.number(),
      observacion: z.string().optional(),
    }),
  ),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { supabase, unauthorized } = await requireUser();
  if (unauthorized) return unauthorized;

  const json = await request.json().catch(() => null);
  const parsed = lineasSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const resultados = [];
  for (const linea of parsed.data.lineas) {
    const { data, error } = await supabase
      .from("toma_inventario_linea")
      .update({
        cantidad_contada: linea.cantidad_contada,
        observacion: linea.observacion,
      })
      .eq("id_linea", linea.id_linea)
      .eq("id_toma", id)
      .select()
      .single();
    if (error) {
      const mapped = mapPostgresError(error);
      return NextResponse.json(
        { error: mapped.message, actualizadas: resultados },
        { status: mapped.status },
      );
    }
    resultados.push(data);
  }

  return NextResponse.json({ data: resultados });
}
