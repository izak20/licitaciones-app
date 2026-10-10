import { NextResponse } from "next/server";
import { requireUser } from "@/lib/api/require-user";

// GET /api/dashboard/resumen — KPIs reales del Panel de Inicio
// (Administrador): antes eran números de ejemplo fijos ("1.284
// artículos activos", etc.) sin ninguna consulta real detrás.
function desanidar<T>(v: T | T[] | null | undefined): T | null {
  if (Array.isArray(v)) return v[0] ?? null;
  return v ?? null;
}

export async function GET() {
  const { supabase, unauthorized } = await requireUser();
  if (unauthorized) return unauthorized;

  const inicioMes = new Date();
  inicioMes.setDate(1);
  inicioMes.setHours(0, 0, 0, 0);

  const [
    { data: articulos },
    { count: movimientosMes },
    { count: recepcionesConReparos },
    { data: usuarios },
    { data: actividad },
  ] = await Promise.all([
    supabase.from("articulo").select("es_controlado, requiere_cadena_frio").eq("activo", true),
    supabase
      .from("movimiento")
      .select("id_movimiento", { count: "exact", head: true })
      .gte("fecha_movimiento", inicioMes.toISOString()),
    supabase
      .from("movimiento")
      .select("id_movimiento", { count: "exact", head: true })
      .eq("tipo", "recepcion")
      .eq("estado", "recepcionado_con_reparos"),
    supabase.from("usuario_perfil").select("activo"),
    supabase
      .from("log_auditoria")
      .select("id_log, id_usuario, accion, entidad, id_entidad, fecha_hora")
      .order("fecha_hora", { ascending: false })
      .limit(5),
  ]);

  const idsUsuariosActividad = Array.from(new Set((actividad ?? []).map((r) => r.id_usuario).filter(Boolean)));
  const { data: nombresUsuarios } = idsUsuariosActividad.length
    ? await supabase.from("usuario_perfil").select("id_usuario, nombre_completo").in("id_usuario", idsUsuariosActividad)
    : { data: [] as { id_usuario: string; nombre_completo: string }[] };
  const nombrePorId = new Map((nombresUsuarios ?? []).map((u) => [u.id_usuario, u.nombre_completo]));

  return NextResponse.json({
    data: {
      articulos_activos: articulos?.length ?? 0,
      articulos_controlados: (articulos ?? []).filter((a) => a.es_controlado).length,
      articulos_cadena_frio: (articulos ?? []).filter((a) => a.requiere_cadena_frio).length,
      movimientos_mes: movimientosMes ?? 0,
      recepciones_con_reparos: recepcionesConReparos ?? 0,
      usuarios_activos: (usuarios ?? []).filter((u) => u.activo).length,
      usuarios_total: usuarios?.length ?? 0,
      actividad_reciente: (actividad ?? []).map((r) => ({
        usuario: nombrePorId.get(r.id_usuario) ?? "Usuario",
        accion: r.accion,
        entidad: r.entidad,
        fecha_hora: r.fecha_hora,
      })),
    },
  });
}
