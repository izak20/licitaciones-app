import { NextResponse } from "next/server";
import { requireUser } from "@/lib/api/require-user";
import { mapPostgresError } from "@/lib/api/errors";

// GET /api/movimientos?tipo=&bodega=&desde=&hasta= — Listado genérico de
// movimientos (no es una ruta propia de la sección 5; es soporte para
// las tablas de Movimientos — Droguería y Movimientos — Farmacia del
// frontend, que antes mostraban filas de mockup). "bodega" filtra por
// origen O destino, para cubrir tanto recepciones como despachos.
export async function GET(request: Request) {
  const { supabase, unauthorized } = await requireUser();
  if (unauthorized) return unauthorized;

  const { searchParams } = new URL(request.url);
  const tipo = searchParams.get("tipo");
  const bodega = searchParams.get("bodega");
  const desde = searchParams.get("desde");
  const hasta = searchParams.get("hasta");

  let query = supabase
    .from("movimiento")
    .select(
      "*, lote:id_lote(numero_lote, fecha_vencimiento, articulo:id_articulo(nombre, codigo_interno), proveedor:id_proveedor(razon_social)), bodega_origen:id_bodega_origen(nombre), bodega_destino:id_bodega_destino(nombre), centro_costo:id_centro_costo(nombre)",
    )
    .order("fecha_movimiento", { ascending: false })
    .limit(200);

  if (tipo) query = query.in("tipo", tipo.split(","));
  if (bodega) query = query.or(`id_bodega_origen.eq.${bodega},id_bodega_destino.eq.${bodega}`);
  if (desde) query = query.gte("fecha_movimiento", desde);
  if (hasta) query = query.lte("fecha_movimiento", hasta);

  const { data, error } = await query;
  if (error) {
    const mapped = mapPostgresError(error);
    return NextResponse.json({ error: mapped.message }, { status: mapped.status });
  }

  return NextResponse.json({ data });
}
