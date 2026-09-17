import { NextResponse } from "next/server";
import { requireUser } from "@/lib/api/require-user";
import { AGRUPACIONES, obtenerAnalisisConsumo, type Agrupacion } from "@/lib/api/analisis-consumo";

// GET /api/analisis-consumo/detalle?agrupar=grupo|familia|subfamilia|producto&bodega=&desde=&hasta=
// Análisis de consumo por grupo/familia/subfamilia/producto (sección 5.9).
export async function GET(request: Request) {
  const { supabase, unauthorized } = await requireUser();
  if (unauthorized) return unauthorized;

  const { searchParams } = new URL(request.url);
  const agrupar = (searchParams.get("agrupar") ?? "producto") as Agrupacion;
  if (!AGRUPACIONES.includes(agrupar)) {
    return NextResponse.json(
      { error: `agrupar debe ser uno de: ${AGRUPACIONES.join(", ")}` },
      { status: 400 },
    );
  }

  const { data, error } = await obtenerAnalisisConsumo(supabase, {
    agrupar,
    bodega: searchParams.get("bodega"),
    desde: searchParams.get("desde"),
    hasta: searchParams.get("hasta"),
  });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ data });
}
