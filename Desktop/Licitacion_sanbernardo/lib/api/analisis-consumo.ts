import type { SupabaseClient } from "@supabase/supabase-js";

export const AGRUPACIONES = ["grupo", "familia", "subfamilia", "producto"] as const;
export type Agrupacion = (typeof AGRUPACIONES)[number];

// Análisis de consumo (sección 5.9): agrega los movimientos de salida
// (despacho y vale_consumo, sección 6.2/6.3) por grupo/familia/
// subfamilia/producto del artículo.
function desanidar<T>(v: T | T[] | null | undefined): T | null {
  if (Array.isArray(v)) return v[0] ?? null;
  return v ?? null;
}

export async function obtenerAnalisisConsumo(
  supabase: SupabaseClient,
  params: { agrupar: Agrupacion; bodega?: string | null; desde?: string | null; hasta?: string | null },
) {
  let query = supabase
    .from("movimiento")
    .select(
      "cantidad, fecha_movimiento, id_bodega_origen, bodega_origen:id_bodega_origen(nombre), lote:id_lote(articulo:id_articulo(codigo_interno, nombre, grupo, familia, subfamilia))",
    )
    .in("tipo", ["despacho", "vale_consumo"]);

  if (params.bodega) query = query.eq("id_bodega_origen", params.bodega);
  if (params.desde) query = query.gte("fecha_movimiento", params.desde);
  if (params.hasta) query = query.lte("fecha_movimiento", params.hasta + "T23:59:59.999");

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

  // Además del total por clave (grupo/familia/...), se guarda el
  // desglose real que compone ese total: por bodega (para el gráfico
  // con una serie de color por bodega) y por bodega+producto (para el
  // detalle real al cliquear una barra o una fila — antes el botón
  // "Desglosar por producto" solo mostraba un aviso de "cargado" sin
  // mostrar ningún dato real).
  const acumulado = new Map<string, { clave: string; cantidad_total: number; movimientos: number }>();
  const bodegasPorClave = new Map<string, Map<string, { id_bodega: string; nombre: string; cantidad: number }>>();
  const detallePorClave = new Map<string, Map<string, { bodega: string; producto: string; cantidad: number }>>();

  for (const m of data ?? []) {
    const lote = desanidar(m.lote);
    const articulo = lote ? desanidar(lote.articulo) : null;
    if (!articulo) continue;
    const cantidad = Number(m.cantidad);
    const clave = claveDe(articulo as ArticuloRef);

    const actual = acumulado.get(clave) ?? { clave, cantidad_total: 0, movimientos: 0 };
    actual.cantidad_total += cantidad;
    actual.movimientos += 1;
    acumulado.set(clave, actual);

    const idBodega = m.id_bodega_origen ?? "sin-bodega";
    const bodegaRef = desanidar(m.bodega_origen);
    const nombreBodega = bodegaRef?.nombre ?? "Sin bodega";

    const mapaBodegas = bodegasPorClave.get(clave) ?? new Map();
    const entradaBodega = mapaBodegas.get(idBodega) ?? { id_bodega: idBodega, nombre: nombreBodega, cantidad: 0 };
    entradaBodega.cantidad += cantidad;
    mapaBodegas.set(idBodega, entradaBodega);
    bodegasPorClave.set(clave, mapaBodegas);

    const producto = `${(articulo as ArticuloRef).codigo_interno} — ${(articulo as ArticuloRef).nombre}`;
    const mapaDetalle = detallePorClave.get(clave) ?? new Map();
    const claveDetalle = idBodega + "|" + producto;
    const entradaDetalle = mapaDetalle.get(claveDetalle) ?? { bodega: nombreBodega, producto, cantidad: 0 };
    entradaDetalle.cantidad += cantidad;
    mapaDetalle.set(claveDetalle, entradaDetalle);
    detallePorClave.set(clave, mapaDetalle);
  }

  return {
    data: Array.from(acumulado.values())
      .sort((a, b) => b.cantidad_total - a.cantidad_total)
      .map((r) => ({
        ...r,
        bodegas: Array.from((bodegasPorClave.get(r.clave) ?? new Map()).values()).sort(
          (a, b) => b.cantidad - a.cantidad,
        ),
        detalle: Array.from((detallePorClave.get(r.clave) ?? new Map()).values()).sort(
          (a, b) => b.cantidad - a.cantidad,
        ),
      })),
  };
}
