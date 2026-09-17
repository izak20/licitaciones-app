import type { SupabaseClient } from "@supabase/supabase-js";

export const AGRUPACIONES = ["grupo", "familia", "subfamilia", "producto"] as const;
export type Agrupacion = (typeof AGRUPACIONES)[number];

// Análisis de consumo (sección 5.9): agrega los movimientos de salida
// (despacho y vale_consumo, sección 6.2/6.3) por grupo/familia/
// subfamilia/producto del artículo.
export async function obtenerAnalisisConsumo(
  supabase: SupabaseClient,
  params: { agrupar: Agrupacion; bodega?: string | null; desde?: string | null; hasta?: string | null },
) {
  let query = supabase
    .from("movimiento")
    .select(
      "cantidad, fecha_movimiento, lote:id_lote(articulo:id_articulo(codigo_interno, nombre, grupo, familia, subfamilia))",
    )
    .in("tipo", ["despacho", "vale_consumo"]);

  if (params.bodega) query = query.eq("id_bodega_origen", params.bodega);
  if (params.desde) query = query.gte("fecha_movimiento", params.desde);
  if (params.hasta) query = query.lte("fecha_movimiento", params.hasta);

  const { data, error } = await query;
  if (error) return { error };

  type ArticuloRef = {
    codigo_interno: string;
    nombre: string;
    grupo: string | null;
    familia: string | null;
    subfamilia: string | null;
  };

  const claveDe = (articulo: ArticuloRef) => {
    switch (params.agrupar) {
      case "grupo":
        return articulo.grupo ?? "(sin grupo)";
      case "familia":
        return articulo.familia ?? "(sin familia)";
      case "subfamilia":
        return articulo.subfamilia ?? "(sin subfamilia)";
      case "producto":
      default:
        return `${articulo.codigo_interno} — ${articulo.nombre}`;
    }
  };

  const acumulado = new Map<string, { clave: string; cantidad_total: number; movimientos: number }>();

  for (const m of data ?? []) {
    const lote = Array.isArray(m.lote) ? m.lote[0] : m.lote;
    const articulo = lote?.articulo
      ? ((Array.isArray(lote.articulo) ? lote.articulo[0] : lote.articulo) as ArticuloRef)
      : null;
    if (!articulo) continue;
    const clave = claveDe(articulo);
    const actual = acumulado.get(clave) ?? { clave, cantidad_total: 0, movimientos: 0 };
    actual.cantidad_total += Number(m.cantidad);
    actual.movimientos += 1;
    acumulado.set(clave, actual);
  }

  return {
    data: Array.from(acumulado.values()).sort((a, b) => b.cantidad_total - a.cantidad_total),
  };
}
