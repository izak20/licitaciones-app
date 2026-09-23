import type { SupabaseClient } from "@supabase/supabase-js";

// Stock real disponible por (artículo, bodega), sumando todos los
// lotes vigentes. Lo usan /api/alertas y /api/reportes/mapa-calor para
// no duplicar el mismo cálculo de "bajo stock mínimo/crítico".
export async function stockPorArticuloBodega(
  supabase: SupabaseClient,
): Promise<Map<string, number>> {
  const { data } = await supabase.from("lote").select("id_articulo, id_bodega, cantidad_disponible");
  const mapa = new Map<string, number>();
  for (const l of data ?? []) {
    const clave = l.id_articulo + "|" + l.id_bodega;
    mapa.set(clave, (mapa.get(clave) ?? 0) + Number(l.cantidad_disponible));
  }
  return mapa;
}
