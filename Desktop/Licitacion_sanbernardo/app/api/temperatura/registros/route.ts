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

// GET /api/temperatura/registros?bodega=&desde=&hasta= — Histórico de
// lecturas (sección 5.5), para el listado del frontend.
export async function GET(request: Request) {
  const { supabase, unauthorized } = await requireUser();
  if (unauthorized) return unauthorized;

  const { searchParams } = new URL(request.url);
  const bodega = searchParams.get("bodega");
  const desde = searchParams.get("desde");
  const hasta = searchParams.get("hasta");

  let query = supabase
    .from("registro_temperatura")
    .select("id_registro, temperatura, fuera_de_rango, fecha_registro, bodega:id_bodega(nombre)")
    .order("fecha_registro", { ascending: false })
    .limit(200);

  if (bodega) query = query.eq("id_bodega", bodega);
  if (desde) query = query.gte("fecha_registro", desde);
  if (hasta) query = query.lte("fecha_registro", hasta);

  const { data, error } = await query;
  if (error) {
    const mapped = mapPostgresError(error);
    return NextResponse.json({ error: mapped.message }, { status: mapped.status });
  }

  return NextResponse.json({ data });
}
