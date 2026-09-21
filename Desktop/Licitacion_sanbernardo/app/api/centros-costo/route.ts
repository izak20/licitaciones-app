import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/api/require-user";
import { mapPostgresError } from "@/lib/api/errors";

// GET /api/centros-costo — Listado liviano para selectores del frontend.
export async function GET() {
  const { supabase, unauthorized } = await requireUser();
  if (unauthorized) return unauthorized;

  const { data, error } = await supabase
    .from("centro_costo")
    .select("id_centro_costo, codigo, nombre, id_bodega, activo, bodega:id_bodega(nombre)")
    .eq("activo", true)
    .order("codigo");

  if (error) {
    const mapped = mapPostgresError(error);
    return NextResponse.json({ error: mapped.message }, { status: mapped.status });
  }

  return NextResponse.json({ data });
}

// POST /api/centros-costo — Crear centro de costo (sección 5.2).
const centroCostoSchema = z.object({
  codigo: z.string().min(1),
  nombre: z.string().min(1),
  id_bodega: z.string().uuid(),
});

export async function POST(request: Request) {
  const { supabase, unauthorized } = await requireUser();
  if (unauthorized) return unauthorized;

  const json = await request.json().catch(() => null);
  const parsed = centroCostoSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("centro_costo")
    .insert(parsed.data)
    .select()
    .single();

  if (error) {
    const mapped = mapPostgresError(error);
    return NextResponse.json({ error: mapped.message }, { status: mapped.status });
  }

  return NextResponse.json({ data }, { status: 201 });
}
