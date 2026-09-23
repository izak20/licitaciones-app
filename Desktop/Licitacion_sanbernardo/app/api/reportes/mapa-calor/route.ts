import { NextResponse } from "next/server";
import { requireUser } from "@/lib/api/require-user";
import { stockPorArticuloBodega } from "@/lib/api/inventario";

// GET /api/reportes/mapa-calor — Combina, por bodega, dos señales
// reales: gasto (cantidad despachada/consumida × lote.precio_unitario,
// últimos 90 días) y quiebres (artículos bajo su stock mínimo). RLS ya
// deja que Cliente Interno solo vea su propia bodega en `bodega`,
// `movimiento` y `stock_parametro`, así que no hace falta filtrar acá.
const PERIODO_DIAS = 90;

export async function GET() {
  const { supabase, unauthorized } = await requireUser();
  if (unauthorized) return unauthorized;

  const desdeIso = new Date(Date.now() - PERIODO_DIAS * 86400000).toISOString();

  const [{ data: bodegas }, { data: movimientosGasto }, { data: parametros }, stockPorClave] =
    await Promise.all([
      supabase.from("bodega").select("id_bodega, nombre").eq("activa", true),
      supabase
        .from("movimiento")
        .select("cantidad, id_bodega_origen, lote:id_lote(precio_unitario)")
        .in("tipo", ["despacho", "vale_consumo"])
        .gte("fecha_movimiento", desdeIso),
      supabase.from("stock_parametro").select("id_articulo, id_bodega, stock_minimo"),
      stockPorArticuloBodega(supabase),
    ]);

  const gastoPorBodega = new Map<string, number>();
  const sinPrecioPorBodega = new Map<string, number>();
  for (const m of movimientosGasto ?? []) {
    const idBodega = m.id_bodega_origen;
    if (!idBodega) continue;
    const lote = Array.isArray(m.lote) ? m.lote[0] : m.lote;
    const precio = lote?.precio_unitario;
    if (precio === null || precio === undefined) {
      sinPrecioPorBodega.set(idBodega, (sinPrecioPorBodega.get(idBodega) ?? 0) + 1);
      continue;
    }
    const gasto = Number(m.cantidad) * Number(precio);
    gastoPorBodega.set(idBodega, (gastoPorBodega.get(idBodega) ?? 0) + gasto);
  }

  const quiebresPorBodega = new Map<string, number>();
  for (const p of parametros ?? []) {
    const clave = p.id_articulo + "|" + p.id_bodega;
    const stockActual = stockPorClave.get(clave) ?? 0;
    if (stockActual <= Number(p.stock_minimo)) {
      quiebresPorBodega.set(p.id_bodega, (quiebresPorBodega.get(p.id_bodega) ?? 0) + 1);
    }
  }

  const data = (bodegas ?? []).map((b) => ({
    id_bodega: b.id_bodega,
    nombre: b.nombre,
    gasto: Math.round((gastoPorBodega.get(b.id_bodega) ?? 0) * 100) / 100,
    movimientos_sin_precio: sinPrecioPorBodega.get(b.id_bodega) ?? 0,
    quiebres: quiebresPorBodega.get(b.id_bodega) ?? 0,
  }));

  return NextResponse.json({ data, periodo_dias: PERIODO_DIAS });
}
