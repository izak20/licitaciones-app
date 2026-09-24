import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/api/require-user";
import { mapPostgresError } from "@/lib/api/errors";

// POST /api/articulos — Crear artículo (sección 5.3)
const articuloCreateSchema = z.object({
  codigo_interno: z.string().min(1),
  nombre: z.string().min(1),
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
  codigos_barra: z.array(z.string().min(1)).optional(),
});

// GET /api/articulos — Listado liviano para selectores del frontend
// (no es una ruta de la sección 5.3; es soporte mínimo para poblar
// los <select> de artículo con datos reales en vez de texto de mockup).
export async function GET() {
  const { supabase, unauthorized } = await requireUser();
  if (unauthorized) return unauthorized;

  const { data, error } = await supabase
    .from("articulo")
    .select(
      "id_articulo, codigo_interno, nombre, requiere_lote, grupo, familia, es_controlado, requiere_cadena_frio, activo, unidad_medida, ubicacion",
    )
    .eq("activo", true)
    .order("nombre");

  if (error) {
    const mapped = mapPostgresError(error);
    return NextResponse.json({ error: mapped.message }, { status: mapped.status });
  }

  return NextResponse.json({ data });
}

export async function POST(request: Request) {
  const { supabase, unauthorized } = await requireUser();
  if (unauthorized) return unauthorized;

  const json = await request.json().catch(() => null);
  const parsed = articuloCreateSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { codigos_barra, ...articulo } = parsed.data;

  const { data, error } = await supabase
    .from("articulo")
    .insert(articulo)
    .select()
    .single();

  if (error) {
    const mapped = mapPostgresError(error);
    return NextResponse.json({ error: mapped.message }, { status: mapped.status });
  }

  if (codigos_barra?.length) {
    const rows = codigos_barra.map((codigo) => ({
      id_articulo: data.id_articulo,
      codigo,
    }));
    const { error: cbError } = await supabase.from("codigo_barra").insert(rows);
    if (cbError) {
      const mapped = mapPostgresError(cbError);
      return NextResponse.json(
        { error: mapped.message, articulo: data },
        { status: mapped.status },
      );
    }
  }

  return NextResponse.json({ data }, { status: 201 });
}
