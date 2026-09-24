import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/api/require-user";
import { mapPostgresError } from "@/lib/api/errors";

// POST /api/inventario/tomas — Iniciar toma de inventario (sección 5.6).
// Al crear la toma se snapshotea el stock actual (lote.cantidad_disponible)
// de la bodega en toma_inventario_linea, para comparar contra el conteo
// físico que se carga después vía PATCH .../lineas.
const tomaSchema = z.object({
  id_bodega: z.string().uuid(),
  alcance: z.enum(["total", "grupo", "familia", "manual"]).optional(),
  responsable: z.string().optional(),
  segundo_verificador: z.string().optional(),
  conteo_a_ciegas: z.boolean().optional(),
});

export async function POST(request: Request) {
  const { supabase, user, unauthorized } = await requireUser();
  if (unauthorized) return unauthorized;

  const json = await request.json().catch(() => null);
  const parsed = tomaSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { data: toma, error: tomaError } = await supabase
    .from("toma_inventario")
    .insert({
      id_bodega: parsed.data.id_bodega,
      alcance: parsed.data.alcance ?? "total",
      responsable: parsed.data.responsable,
      segundo_verificador: parsed.data.segundo_verificador,
      conteo_a_ciegas: parsed.data.conteo_a_ciegas ?? false,
      id_usuario: user.id,
    })
    .select()
    .single();

  if (tomaError) {
    const mapped = mapPostgresError(tomaError);
    return NextResponse.json({ error: mapped.message }, { status: mapped.status });
  }

  const { data: lotes, error: lotesError } = await supabase
    .from("lote")
    .select("id_lote, cantidad_disponible")
    .eq("id_bodega", parsed.data.id_bodega);

  if (lotesError) {
    const mapped = mapPostgresError(lotesError);
    return NextResponse.json(
      { error: mapped.message, toma },
      { status: mapped.status },
    );
  }

  if (lotes?.length) {
    const lineas = lotes.map((l) => ({
      id_toma: toma.id_toma,
      id_lote: l.id_lote,
      cantidad_sistema: l.cantidad_disponible,
    }));
    const { error: lineasError } = await supabase
      .from("toma_inventario_linea")
      .insert(lineas);
    if (lineasError) {
      const mapped = mapPostgresError(lineasError);
      return NextResponse.json(
        { error: mapped.message, toma },
        { status: mapped.status },
      );
    }
  }

  return NextResponse.json(
    { data: { toma, lineas_creadas: lotes?.length ?? 0 } },
    { status: 201 },
  );
}

// GET /api/inventario/tomas?bodega= — Listado de tomas de inventario
// (sección 5.6), para el listado del frontend.
export async function GET(request: Request) {
  const { supabase, unauthorized } = await requireUser();
  if (unauthorized) return unauthorized;

  const { searchParams } = new URL(request.url);
  const bodega = searchParams.get("bodega");

  let query = supabase
    .from("toma_inventario")
    .select("*, bodega:id_bodega(nombre)")
    .order("fecha_inicio", { ascending: false });

  if (bodega) query = query.eq("id_bodega", bodega);

  const { data, error } = await query;
  if (error) {
    const mapped = mapPostgresError(error);
    return NextResponse.json({ error: mapped.message }, { status: mapped.status });
  }

  // Cuántos artículos tiene cada toma y cuántos ya se contaron — para
  // que se pueda ver de un vistazo cuánto avanzó cada responsable
  // (varias personas pueden estar contando el mismo día, cada una en
  // su propia toma).
  const idsTomas = (data ?? []).map((t) => t.id_toma);
  const { data: lineas } = idsTomas.length
    ? await supabase.from("toma_inventario_linea").select("id_toma, cantidad_contada").in("id_toma", idsTomas)
    : { data: [] as { id_toma: string; cantidad_contada: number | null }[] };

  const conteoPorToma = new Map<string, { total: number; contados: number }>();
  for (const l of lineas ?? []) {
    const actual = conteoPorToma.get(l.id_toma) ?? { total: 0, contados: 0 };
    actual.total += 1;
    if (l.cantidad_contada !== null) actual.contados += 1;
    conteoPorToma.set(l.id_toma, actual);
  }

  return NextResponse.json({
    data: (data ?? []).map((t) => ({
      ...t,
      total_articulos: conteoPorToma.get(t.id_toma)?.total ?? 0,
      articulos_contados: conteoPorToma.get(t.id_toma)?.contados ?? 0,
    })),
  });
}
