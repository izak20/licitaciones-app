import { NextResponse } from "next/server";
import { requireUser } from "@/lib/api/require-user";
import { mapPostgresError } from "@/lib/api/errors";

// GET /api/log-auditoria?desde=&hasta=&q= — Consultar bitácora (sección
// 5.2), filtros de fecha y palabra clave sobre acción/entidad. Solo
// lectura: la política RLS de log_auditoria ya restringe esto a
// Administrador.
export async function GET(request: Request) {
  const { supabase, unauthorized } = await requireUser();
  if (unauthorized) return unauthorized;

  const { searchParams } = new URL(request.url);
  const desde = searchParams.get("desde");
  const hasta = searchParams.get("hasta");
  const q = searchParams.get("q");

  let query = supabase
    .from("log_auditoria")
    .select("id_log, id_usuario, accion, entidad, id_entidad, fecha_hora")
    .order("fecha_hora", { ascending: false })
    .limit(200);

  if (desde) query = query.gte("fecha_hora", desde);
  if (hasta) query = query.lte("fecha_hora", hasta);
  if (q) query = query.or(`accion.ilike.%${q}%,entidad.ilike.%${q}%`);

  const { data, error } = await query;
  if (error) {
    const mapped = mapPostgresError(error);
    return NextResponse.json({ error: mapped.message }, { status: mapped.status });
  }

  const idsUsuarios = Array.from(new Set((data ?? []).map((r) => r.id_usuario).filter(Boolean)));
  const { data: usuarios } = idsUsuarios.length
    ? await supabase
        .from("usuario_perfil")
        .select("id_usuario, nombre_completo")
        .in("id_usuario", idsUsuarios)
    : { data: [] as { id_usuario: string; nombre_completo: string }[] };
  const nombrePorId = new Map((usuarios ?? []).map((u) => [u.id_usuario, u.nombre_completo]));

  return NextResponse.json({
    data: (data ?? []).map((r) => ({ ...r, usuario: nombrePorId.get(r.id_usuario) ?? null })),
  });
}
