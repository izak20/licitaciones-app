import { NextResponse } from "next/server";
import { requireUser } from "@/lib/api/require-user";

// GET /api/analiticas/resumen?desde=&hasta= — Consumo real (tipos
// 'despacho' y 'vale_consumo') en el rango pedido (por defecto, los
// últimos 6 meses): tendencia mes a mes DESGLOSADA POR BODEGA (antes
// era un solo total mensual, sin decir de qué bodega ni de qué
// artículo salía), el detalle real de artículos detrás de cada cruce
// bodega × mes, top 5 artículos y top 5 bodegas por cantidad
// consumida en el rango, y el mes actual vs el anterior.
function desanidar<T>(v: T | T[] | null | undefined): T | null {
  if (Array.isArray(v)) return v[0] ?? null;
  return v ?? null;
}

export async function GET(request: Request) {
  const { supabase, unauthorized } = await requireUser();
  if (unauthorized) return unauthorized;

  const { searchParams } = new URL(request.url);
  const ahora = new Date();
  const desdeParam = searchParams.get("desde");
  const hastaParam = searchParams.get("hasta");

  const desdeDate = desdeParam ? new Date(desdeParam) : new Date(ahora.getFullYear(), ahora.getMonth() - 5, 1);
  const hastaDate = hastaParam ? new Date(hastaParam) : ahora;

  const [{ data: bodegas }, { data: movimientos, error }] = await Promise.all([
    supabase.from("bodega").select("id_bodega, nombre").eq("activa", true),
    supabase
      .from("movimiento")
      .select(
        "cantidad, fecha_movimiento, id_bodega_origen, lote:id_lote(articulo:id_articulo(nombre)), bodega_origen:id_bodega_origen(nombre)",
      )
      .in("tipo", ["despacho", "vale_consumo"])
      .gte("fecha_movimiento", desdeDate.toISOString())
      .lte("fecha_movimiento", hastaDate.toISOString()),
  ]);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  type DetalleConsumo = { articulo: string; cantidad: number };

  const porArticulo = new Map<string, number>();
  const porBodega = new Map<string, number>();
  const cantidadPorClave = new Map<string, number>();
  const detallePorClave = new Map<string, Map<string, number>>();
  const bodegasConMovimiento = new Map<string, string>();

  for (const m of movimientos ?? []) {
    const cantidad = Number(m.cantidad);
    const mes = String(m.fecha_movimiento).slice(0, 7);
    const idBodega = m.id_bodega_origen;
    const bodega = desanidar(m.bodega_origen);
    if (idBodega && bodega?.nombre) bodegasConMovimiento.set(idBodega, bodega.nombre);

    const lote = desanidar(m.lote);
    const articulo = lote ? desanidar(lote.articulo) : null;
    if (articulo?.nombre) {
      porArticulo.set(articulo.nombre, (porArticulo.get(articulo.nombre) ?? 0) + cantidad);
    }
    if (bodega?.nombre) {
      porBodega.set(bodega.nombre, (porBodega.get(bodega.nombre) ?? 0) + cantidad);
    }

    if (!idBodega) continue;
    const clave = idBodega + "|" + mes;
    cantidadPorClave.set(clave, (cantidadPorClave.get(clave) ?? 0) + cantidad);
    if (articulo?.nombre) {
      const detalle = detallePorClave.get(clave) ?? new Map<string, number>();
      detalle.set(articulo.nombre, (detalle.get(articulo.nombre) ?? 0) + cantidad);
      detallePorClave.set(clave, detalle);
    }
  }

  const meses: string[] = [];
  const cursor = new Date(desdeDate.getFullYear(), desdeDate.getMonth(), 1);
  const limite = new Date(hastaDate.getFullYear(), hastaDate.getMonth(), 1);
  while (cursor <= limite) {
    meses.push(cursor.toISOString().slice(0, 7));
    cursor.setMonth(cursor.getMonth() + 1);
  }

  // Solo bodegas activas con al menos un movimiento en el rango, para
  // no llenar el gráfico de series en cero.
  const bodegasConDatos = (bodegas ?? [])
    .filter((b) => bodegasConMovimiento.has(b.id_bodega))
    .map((b) => ({ id_bodega: b.id_bodega, nombre: b.nombre }));

  const celdas = bodegasConDatos.flatMap((b) =>
    meses.map((mes) => {
      const clave = b.id_bodega + "|" + mes;
      const detalleMap = detallePorClave.get(clave);
      const detalle: DetalleConsumo[] = detalleMap
        ? Array.from(detalleMap.entries())
            .map(([articulo, cantidad]) => ({ articulo, cantidad }))
            .sort((a, b2) => b2.cantidad - a.cantidad)
        : [];
      return {
        id_bodega: b.id_bodega,
        mes,
        cantidad: cantidadPorClave.get(clave) ?? 0,
        detalle,
      };
    }),
  );

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
  const cantidadMes = (mes: string) =>
    bodegasConDatos.reduce((acc, b) => acc + (cantidadPorClave.get(b.id_bodega + "|" + mes) ?? 0), 0);

  return NextResponse.json({
    data: {
      bodegas: bodegasConDatos,
      meses,
      celdas,
      top_articulos: topArticulos,
      top_bodegas: topBodegas,
      mes_actual: { mes: mesActualKey, cantidad: cantidadMes(mesActualKey) },
      mes_anterior: { mes: mesAnteriorKey, cantidad: cantidadMes(mesAnteriorKey) },
      periodo: { desde: desdeDate.toISOString().slice(0, 10), hasta: hastaDate.toISOString().slice(0, 10) },
    },
  });
}
