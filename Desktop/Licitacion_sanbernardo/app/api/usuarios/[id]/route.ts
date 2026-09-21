import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/api/require-user";
import { mapPostgresError } from "@/lib/api/errors";
import { createAdminClient } from "@/lib/supabase/admin";

// GET /api/usuarios/[id] — Detalle de un usuario (sección 5.2).
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { supabase, unauthorized } = await requireUser();
  if (unauthorized) return unauthorized;

  const { data, error } = await supabase
    .from("usuario_perfil")
    .select(
      "id_usuario, nombre_completo, activo, fecha_creacion, perfil:id_perfil(id_perfil, nombre), bodega:id_bodega(id_bodega, nombre)",
    )
    .eq("id_usuario", id)
    .single();

  if (error) {
    const mapped = mapPostgresError(error);
    return NextResponse.json({ error: mapped.message }, { status: mapped.status });
  }

  return NextResponse.json({ data });
}

// PATCH /api/usuarios/[id] — Editar usuario (sección 5.2).
const editarUsuarioSchema = z.object({
  nombre_completo: z.string().min(1).optional(),
  id_perfil: z.string().uuid().optional(),
  id_bodega: z.string().uuid().optional().nullable(),
  activo: z.boolean().optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { supabase, unauthorized } = await requireUser();
  if (unauthorized) return unauthorized;

  const json = await request.json().catch(() => null);
  const parsed = editarUsuarioSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("usuario_perfil")
    .update(parsed.data)
    .eq("id_usuario", id)
    .select("*, perfil:id_perfil(nombre), bodega:id_bodega(nombre)")
    .single();

  if (error) {
    const mapped = mapPostgresError(error);
    return NextResponse.json({ error: mapped.message }, { status: mapped.status });
  }

  return NextResponse.json({ data });
}

// DELETE /api/usuarios/[id] — Eliminar usuario (sección 5.2, solo
// Administrador por RLS). Borra el perfil y, si hay service role key
// configurada, también el usuario de auth.users.
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { supabase, unauthorized } = await requireUser();
  if (unauthorized) return unauthorized;

  const { error } = await supabase.from("usuario_perfil").delete().eq("id_usuario", id);
  if (error) {
    const mapped = mapPostgresError(error);
    return NextResponse.json({ error: mapped.message }, { status: mapped.status });
  }

  if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const admin = createAdminClient();
    await admin.auth.admin.deleteUser(id).catch(() => null);
  }

  return NextResponse.json({ data: { eliminado: true } });
}
