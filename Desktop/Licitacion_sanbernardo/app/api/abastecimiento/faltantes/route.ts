import { NextResponse } from "next/server";
import { requireUser } from "@/lib/api/require-user";
import { mapPostgresError } from "@/lib/api/errors";

// GET /api/abastecimiento/faltantes?bodega= — Listado de artículos bajo
// stock mínimo (sección 5.7), comparando stock_parametro contra el
// stock real agregado en v_stock_por_articulo (sección 6.1, regla N°17).
export async function GET(request: Request) {
  const { supabase, unauthorized } = await requireUser();
  if (unauthorized) return unauthorized;

  const { searchParams } = new URL(request.url);
  const bodega = searchParams.get("bodega");

  let parametrosQuery = supabase
    .from("stock_parametro")
    .select(
      "id_articulo, id_bodega, stock_minimo, stock_maximo, articulo:id_articulo(nombre, codigo_interno), bodega:id_bodega(nombre)",
    );
  if (bodega) parametrosQuery = parametrosQuery.eq("id_bodega", bodega);

  const { data: parametros, error: parametrosError } = await parametrosQuery;
  if (parametrosError) {
    const mapped = mapPostgresError(parametrosError);
    return NextResponse.json({ error: mapped.message }, { status: mapped.status });
  }

  let stockQuery = supabase
    .from("v_stock_por_articulo")
    .select("id_articulo, id_bodega, stock_total");
  if (bodega) stockQuery = stockQuery.eq("id_bodega", bodega);

  const { data: stocks, error: stockError } = await stockQuery;
  if (stockError) {
    const mapped = mapPostgresError(stockError);
    return NextResponse.json({ error: mapped.message }, { status: mapped.status });
  }

  const stockPorClave = new Map(
    (stocks ?? []).map((s) => [`${s.id_articulo}-${s.id_bodega}`, s.stock_total as number]),
  );

  const faltantes = (parametros ?? [])
    .map((p) => {
      const stockActual = stockPorClave.get(`${p.id_articulo}-${p.id_bodega}`) ?? 0;
      return { ...p, stock_actual: stockActual };
    })
    .filter((p) => p.stock_actual < p.stock_minimo);

  return NextResponse.json({ data: faltantes });
}
