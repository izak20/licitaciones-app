import { NextResponse } from "next/server";
import { requireUser } from "@/lib/api/require-user";
import { stockPorArticuloBodega } from "@/lib/api/inventario";

// GET /api/reportes/mapa-calor — Matriz real bodega × grupo de
// artículo, con dos señales: gasto (cantidad despachada/consumida ×
// lote.precio_unitario, últimos 90 días) y quiebres (artículos bajo su
// stock mínimo). RLS ya deja que Cliente Interno solo vea su propia
// bodega en `bodega`, `movimiento` y `stock_parametro`, así que no
// hace falta filtrar acá.
const PERIODO_DIAS = 90;
const SIN_GRUPO = "Sin grupo";

function desanidar<T>(v: T | T[] | null | undefined): T | null {
  if (Array.isArray(v)) return v[0] ?? null;
  return v ?? null;
}

export async function GET() {
  const { supabase, unauthorized } = await requireUser();
  if (unauthorized) return unauthorized;

  const desdeIso = new Date(Date.now() - PERIODO_DIAS * 86400000).toISOString();

  const [{ data: bodegas }, { data: movimientosGasto }, { data: parametros }, stockPorClave] =
    await Promise.all([
      supabase.from("bodega").select("id_bodega, nombre").eq("activa", true),
      supabase
        .from("movimiento")
        .select("cantidad, id_bodega_origen, lote:id_lote(precio_unitario, articulo:id_articulo(grupo))")
        .in("tipo", ["despacho", "vale_consumo"])
        .gte("fecha_movimiento", desdeIso),
      supabase
        .from("stock_parametro")
        .select("id_articulo, id_bodega, stock_minimo, articulo:id_articulo(grupo)"),
      stockPorArticuloBodega(supabase),
    ]);

  const grupos = new Set<string>();
  const gastoPorClave = new Map<string, number>();
  const sinPrecioPorBodega = new Map<string, number>();
  for (const m of movimientosGasto ?? []) {
    const idBodega = m.id_bodega_origen;
    if (!idBodega) continue;
    const lote = desanidar(m.lote);
    const articulo = lote ? desanidar(lote.articulo) : null;
    const grupo = articulo?.grupo || SIN_GRUPO;
    grupos.add(grupo);
    const precio = lote?.precio_unitario;
    if (precio === null || precio === undefined) {
      sinPrecioPorBodega.set(idBodega, (sinPrecioPorBodega.get(idBodega) ?? 0) + 1);
      continue;
    }
    const clave = idBodega + "|" + grupo;
    const gasto = Number(m.cantidad) * Number(precio);
    gastoPorClave.set(clave, (gastoPorClave.get(clave) ?? 0) + gasto);
  }

  const quiebresPorClave = new Map<string, number>();
  for (const p of parametros ?? []) {
    const articulo = desanidar(p.articulo);
    const grupo = articulo?.grupo || SIN_GRUPO;
    grupos.add(grupo);
    const claveStock = p.id_articulo + "|" + p.id_bodega;
    const stockActual = stockPorClave.get(claveStock) ?? 0;
    if (stockActual <= Number(p.stock_minimo)) {
      const clave = p.id_bodega + "|" + grupo;
      quiebresPorClave.set(clave, (quiebresPorClave.get(clave) ?? 0) + 1);
    }
  }

  const gruposOrdenados = Array.from(grupos).sort();
  const celdas = (bodegas ?? []).flatMap((b) =>
    gruposOrdenados.map((grupo) => {
      const clave = b.id_bodega + "|" + grupo;
      return {
        id_bodega: b.id_bodega,
        grupo,
        gasto: Math.round((gastoPorClave.get(clave) ?? 0) * 100) / 100,
        quiebres: quiebresPorClave.get(clave) ?? 0,
      };
    }),
  );

  return NextResponse.json({
    data: {
      bodegas: (bodegas ?? []).map((b) => ({ id_bodega: b.id_bodega, nombre: b.nombre })),
      grupos: gruposOrdenados,
      celdas,
      movimientos_sin_precio: Array.from(sinPrecioPorBodega.values()).reduce((a, b) => a + b, 0),
    },
    periodo_dias: PERIODO_DIAS,
  });
}
