import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/api/require-user";
import { mapPostgresError } from "@/lib/api/errors";
import { createAdminClient } from "@/lib/supabase/admin";

// GET /api/usuarios — Listado de usuarios y perfiles (sección 5.2).
export async function GET() {
  const { supabase, unauthorized } = await requireUser();
  if (unauthorized) return unauthorized;

  const { data, error } = await supabase
    .from("usuario_perfil")
    .select(
      "id_usuario, nombre_completo, activo, fecha_creacion, perfil:id_perfil(id_perfil, nombre), bodega:id_bodega(id_bodega, nombre)",
    )
    .order("fecha_creacion", { ascending: false });

  if (error) {
    const mapped = mapPostgresError(error);
    return NextResponse.json({ error: mapped.message }, { status: mapped.status });
  }

  return NextResponse.json({ data });
}

// POST /api/usuarios — Crear usuario + perfil (sección 4 y 5.2): crea
// primero en auth.users (con la service role key) y en el mismo paso
// la fila de usuario_perfil. Licencias ilimitadas (aclaración N°12).
const usuarioSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  nombre_completo: z.string().min(1),
  id_perfil: z.string().uuid(),
  id_bodega: z.string().uuid().optional().nullable(),
});

export async function POST(request: Request) {
  const { supabase, unauthorized } = await requireUser();
  if (unauthorized) return unauthorized;

  const { data: perfilActual } = await supabase.rpc("fn_perfil_actual");
  if (perfilActual !== "Administrador") {
    return NextResponse.json(
      { error: "Solo un Administrador puede crear usuarios" },
      { status: 403 },
    );
  }

  const json = await request.json().catch(() => null);
  const parsed = usuarioSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const body = parsed.data;

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json(
      { error: "Falta configurar SUPABASE_SERVICE_ROLE_KEY en el servidor" },
      { status: 500 },
    );
  }

  const admin = createAdminClient();
  const { data: authUser, error: authError } = await admin.auth.admin.createUser({
    email: body.email,
    password: body.password,
    email_confirm: true,
  });
  if (authError || !authUser.user) {
    return NextResponse.json(
      { error: authError?.message ?? "No se pudo crear el usuario" },
      { status: 400 },
    );
  }

  const { data: usuarioPerfil, error: perfilError } = await supabase
    .from("usuario_perfil")
    .insert({
      id_usuario: authUser.user.id,
      nombre_completo: body.nombre_completo,
      id_perfil: body.id_perfil,
      id_bodega: body.id_bodega ?? null,
    })
    .select("*, perfil:id_perfil(nombre), bodega:id_bodega(nombre)")
    .single();

  if (perfilError) {
    await admin.auth.admin.deleteUser(authUser.user.id);
    const mapped = mapPostgresError(perfilError);
    return NextResponse.json({ error: mapped.message }, { status: mapped.status });
  }

  return NextResponse.json({ data: { ...usuarioPerfil, email: body.email } }, { status: 201 });
}
