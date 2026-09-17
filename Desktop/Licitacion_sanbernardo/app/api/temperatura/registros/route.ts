import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/api/require-user";
import { mapPostgresError } from "@/lib/api/errors";

// POST /api/temperatura/registros — Registrar lectura de temperatura
// (sección 5.5). El trigger fn_check_temperatura (sección 2.2) marca
// fuera_de_rango automáticamente; acá solo se inserta el registro.
const registroSchema = z.object({
  id_bodega: z.string().uuid(),
  temperatura: z.number(),
});

export async function POST(request: Request) {
  const { supabase, user, unauthorized } = await requireUser();
  if (unauthorized) return unauthorized;

  const json = await request.json().catch(() => null);
  const parsed = registroSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("registro_temperatura")
    .insert({
      id_bodega: parsed.data.id_bodega,
      temperatura: parsed.data.temperatura,
      id_usuario: user.id,
    })
    .select()
    .single();

  if (error) {
    const mapped = mapPostgresError(error);
    return NextResponse.json({ error: mapped.message }, { status: mapped.status });
  }

  return NextResponse.json({ data }, { status: 201 });
}
