import { NextResponse } from "next/server";
import { requireUser } from "@/lib/api/require-user";

// GET /api/analiticas/resumen — Consumo real de los últimos 6 meses
// (tipos 'despacho' y 'vale_consumo'): tendencia mes a mes, top 5
// artículos y top 5 bodegas por cantidad consumida, y el mes actual vs
// el anterior. Reemplaza los números de ejemplo fijos que traía la
// portada; si no hay movimientos en el período, cada serie vuelve
// vacía en vez de mostrar un valor inventado.
function desanidar<T>(v: T | T[] | null | undefined): T | null {
  if (Array.isArray(v)) return v[0] ?? null;
  return v ?? null;
}

export async function GET() {
  const { supabase, unauthorized } = await requireUser();
  if (unauthorized) return unauthorized;

  const ahora = new Date();
  const desde = new Date(ahora.getFullYear(), ahora.getMonth() - 5, 1).toISOString();

  const { data: movimientos, error } = await supabase
    .from("movimiento")
    .select(
      "cantidad, fecha_movimiento, id_bodega_origen, lote:id_lote(articulo:id_articulo(nombre)), bodega_origen:id_bodega_origen(nombre)",
    )
    .in("tipo", ["despacho", "vale_consumo"])
    .gte("fecha_movimiento", desde);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const porMes = new Map<string, number>();
  const porArticulo = new Map<string, number>();
  const porBodega = new Map<string, number>();

  for (const m of movimientos ?? []) {
    const cantidad = Number(m.cantidad);
    const mes = String(m.fecha_movimiento).slice(0, 7);
    porMes.set(mes, (porMes.get(mes) ?? 0) + cantidad);

    const lote = desanidar(m.lote);
    const articulo = lote ? desanidar(lote.articulo) : null;
    if (articulo?.nombre) {
      porArticulo.set(articulo.nombre, (porArticulo.get(articulo.nombre) ?? 0) + cantidad);
    }

    const bodega = desanidar(m.bodega_origen);
    if (bodega?.nombre) {
      porBodega.set(bodega.nombre, (porBodega.get(bodega.nombre) ?? 0) + cantidad);
    }
  }

  const tendenciaMensual = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(ahora.getFullYear(), ahora.getMonth() - i, 1);
    const mes = d.toISOString().slice(0, 7);
    tendenciaMensual.push({ mes, cantidad: porMes.get(mes) ?? 0 });
  }

  const topArticulos = Array.from(porArticulo.entries())
    .map(([nombre, cantidad]) => ({ nombre, cantidad }))
    .sort((a, b) => b.cantidad - a.cantidad)
    .slice(0, 5);

  const topBodegas = Array.from(porBodega.entries())
    .map(([nombre, cantidad]) => ({ nombre, cantidad }))
    .sort((a, b) => b.cantidad - a.cantidad)
    .slice(0, 5);

  const mesActualKey = ahora.toISOString().slice(0, 7);
  const mesAnteriorKey = new Date(ahora.getFullYear(), ahora.getMonth() - 1, 1).toISOString().slice(0, 7);

  return NextResponse.json({
    data: {
      tendencia_mensual: tendenciaMensual,
      top_articulos: topArticulos,
      top_bodegas: topBodegas,
      mes_actual: { mes: mesActualKey, cantidad: porMes.get(mesActualKey) ?? 0 },
      mes_anterior: { mes: mesAnteriorKey, cantidad: porMes.get(mesAnteriorKey) ?? 0 },
    },
  });
}
