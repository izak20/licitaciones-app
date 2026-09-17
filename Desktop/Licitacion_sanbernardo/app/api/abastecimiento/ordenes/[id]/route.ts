import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/api/require-user";
import { mapPostgresError } from "@/lib/api/errors";

// PATCH /api/abastecimiento/ordenes/[id] — Editar líneas de la orden
// (sección 5.7): agrega líneas nuevas o actualiza las existentes
// (por id_linea) en la misma llamada.
const editarLineasSchema = z.object({
  lineas: z.array(
    z.object({
      id_linea: z.string().uuid().optional(),
      id_articulo: z.string().uuid(),
      cantidad_solicitada: z.number().positive(),
      cantidad_aprobada: z.number().nonnegative().optional(),
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
  const parsed = editarLineasSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const resultados = [];
  for (const linea of parsed.data.lineas) {
    if (linea.id_linea) {
      const { data, error } = await supabase
        .from("orden_abastecimiento_linea")
        .update({
          id_articulo: linea.id_articulo,
          cantidad_solicitada: linea.cantidad_solicitada,
          cantidad_aprobada: linea.cantidad_aprobada,
          observacion: linea.observacion,
        })
        .eq("id_linea", linea.id_linea)
        .eq("id_orden", id)
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
    } else {
      const { data, error } = await supabase
        .from("orden_abastecimiento_linea")
        .insert({
          id_orden: id,
          id_articulo: linea.id_articulo,
          cantidad_solicitada: linea.cantidad_solicitada,
          cantidad_aprobada: linea.cantidad_aprobada ?? null,
          observacion: linea.observacion ?? null,
        })
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
  }

  return NextResponse.json({ data: resultados });
}
