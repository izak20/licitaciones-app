import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/api/require-user";
import { mapPostgresError } from "@/lib/api/errors";

// PATCH /api/articulos/[id]/vias — Configurar vías de administración
// (reemplaza el conjunto completo por el enviado)
const viasSchema = z.object({
  vias: z.array(
    z.enum([
      "Oral",
      "Intravenosa",
      "Intramuscular",
      "Subcutánea",
      "Inhalatoria",
      "Rectal",
    ]),
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
  const parsed = viasSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { error: deleteError } = await supabase
    .from("via_administracion")
    .delete()
    .eq("id_articulo", id);
  if (deleteError) {
    const mapped = mapPostgresError(deleteError);
    return NextResponse.json({ error: mapped.message }, { status: mapped.status });
  }

  if (parsed.data.vias.length) {
    const rows = parsed.data.vias.map((via) => ({ id_articulo: id, via }));
    const { error: insertError } = await supabase
      .from("via_administracion")
      .insert(rows);
    if (insertError) {
      const mapped = mapPostgresError(insertError);
      return NextResponse.json({ error: mapped.message }, { status: mapped.status });
    }
  }

  return NextResponse.json({ data: parsed.data.vias });
}
