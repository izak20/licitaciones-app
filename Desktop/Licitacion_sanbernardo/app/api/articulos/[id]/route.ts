import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/api/require-user";
import { mapPostgresError } from "@/lib/api/errors";

// PATCH /api/articulos/[id] — Editar artículo (código interno bloqueado
// tras creación: especificación general N°8)
const articuloUpdateSchema = z.object({
  codigo_interno: z.string().optional(),
  nombre: z.string().min(1).optional(),
  grupo: z.string().optional(),
  familia: z.string().optional(),
  subfamilia: z.string().optional(),
  unidad_medida: z.string().optional(),
  es_controlado: z.boolean().optional(),
  requiere_cadena_frio: z.boolean().optional(),
  requiere_lote: z.boolean().optional(),
  condicion_almacenamiento: z.string().optional(),
  registro_sanitario: z.string().optional(),
  ubicacion: z.string().optional(),
  activo: z.boolean().optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { supabase, unauthorized } = await requireUser();
  if (unauthorized) return unauthorized;

  const json = await request.json().catch(() => null);
  const parsed = articuloUpdateSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { data: existente, error: fetchError } = await supabase
    .from("articulo")
    .select("codigo_interno")
    .eq("id_articulo", id)
    .single();
  if (fetchError || !existente) {
    return NextResponse.json({ error: "Artículo no encontrado" }, { status: 404 });
  }

  if (
    parsed.data.codigo_interno !== undefined &&
    parsed.data.codigo_interno !== existente.codigo_interno
  ) {
    return NextResponse.json(
      { error: "El código interno no se puede modificar después de creado el artículo" },
      { status: 400 },
    );
  }

  const { codigo_interno: _codigoInterno, ...cambios } = parsed.data;

  const { data, error } = await supabase
    .from("articulo")
    .update(cambios)
    .eq("id_articulo", id)
    .select()
    .single();

  if (error) {
    const mapped = mapPostgresError(error);
    return NextResponse.json({ error: mapped.message }, { status: mapped.status });
  }

  return NextResponse.json({ data });
}
