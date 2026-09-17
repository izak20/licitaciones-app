import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/api/require-user";
import { mapPostgresError } from "@/lib/api/errors";

// POST /api/proveedores — Crear proveedor (sección 5.3)
const proveedorSchema = z.object({
  rut: z.string().min(1),
  razon_social: z.string().min(1),
  direccion: z.string().optional(),
  telefono: z.string().optional(),
  email: z.union([z.string().email(), z.literal("")]).optional(),
  nombre_ejecutivo: z.string().optional(),
  telefono_ejecutivo: z.string().optional(),
});

// GET /api/proveedores — Listado liviano para selectores del frontend.
export async function GET() {
  const { supabase, unauthorized } = await requireUser();
  if (unauthorized) return unauthorized;

  const { data, error } = await supabase
    .from("proveedor")
    .select("id_proveedor, rut, razon_social")
    .eq("activo", true)
    .order("razon_social");

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
  const parsed = proveedorSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("proveedor")
    .insert(parsed.data)
    .select()
    .single();

  if (error) {
    const mapped = mapPostgresError(error);
    return NextResponse.json({ error: mapped.message }, { status: mapped.status });
  }

  return NextResponse.json({ data }, { status: 201 });
}
