import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/api/require-user";
import { mapPostgresError } from "@/lib/api/errors";

// GET /api/bodegas — Listado liviano para selectores del frontend
// (no es una ruta de la sección 5; es soporte mínimo para poblar los
// <select> de bodega con datos reales en vez de texto de mockup).
export async function GET() {
  const { supabase, unauthorized } = await requireUser();
  if (unauthorized) return unauthorized;

  const { data, error } = await supabase
    .from("bodega")
    .select("id_bodega, nombre, tipo, id_bodega_padre, direccion, requiere_cadena_frio, activa")
    .eq("activa", true)
    .order("nombre");

  if (error) {
    const mapped = mapPostgresError(error);
    return NextResponse.json({ error: mapped.message }, { status: mapped.status });
  }

  return NextResponse.json({ data });
}

// POST /api/bodegas — Crear bodega o sub-bodega (sección 5.2).
const bodegaSchema = z.object({
  nombre: z.string().min(1),
  tipo: z.enum(["centro_distribucion", "bodega", "sub_bodega"]),
  id_bodega_padre: z.string().uuid().optional().nullable(),
  direccion: z.string().optional(),
  requiere_cadena_frio: z.boolean().optional(),
});

export async function POST(request: Request) {
  const { supabase, unauthorized } = await requireUser();
  if (unauthorized) return unauthorized;

  const json = await request.json().catch(() => null);
  const parsed = bodegaSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("bodega")
    .insert(parsed.data)
    .select()
    .single();

  if (error) {
    const mapped = mapPostgresError(error);
    return NextResponse.json({ error: mapped.message }, { status: mapped.status });
  }

  return NextResponse.json({ data }, { status: 201 });
}
