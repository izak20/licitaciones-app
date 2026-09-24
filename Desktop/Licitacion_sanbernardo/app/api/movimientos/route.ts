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
      "*, lote:id_lote(numero_lote, fecha_vencimiento, precio_unitario, articulo:id_articulo(nombre, codigo_interno), proveedor:id_proveedor(razon_social)), bodega_origen:id_bodega_origen(nombre), bodega_destino:id_bodega_destino(nombre), centro_costo:id_centro_costo(nombre)",
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

  // movimiento.id_usuario referencia auth.users directamente (no
  // usuario_perfil), así que no se puede anidar en el select de
  // arriba: se resuelve el nombre aparte, igual que en log-auditoria.
  const idsUsuarios = Array.from(new Set((data ?? []).map((r) => r.id_usuario).filter(Boolean)));
  const { data: usuarios } = idsUsuarios.length
    ? await supabase.from("usuario_perfil").select("id_usuario, nombre_completo").in("id_usuario", idsUsuarios)
    : { data: [] as { id_usuario: string; nombre_completo: string }[] };
  const nombrePorId = new Map((usuarios ?? []).map((u) => [u.id_usuario, u.nombre_completo]));

  return NextResponse.json({
    data: (data ?? []).map((r) => ({ ...r, registrado_por: nombrePorId.get(r.id_usuario) ?? null })),
  });
}
