import { NextResponse } from "next/server";
import { requireUser } from "@/lib/api/require-user";
import { leerFilasExcel } from "@/lib/api/carga-masiva";
import { createAdminClient } from "@/lib/supabase/admin";

// POST /api/usuarios/masivo/archivo — Carga masiva de usuarios
// (sección 5.2). Igual que la creación individual: crea primero en
// auth.users con la service role key y luego el usuario_perfil.
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
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json(
      { error: "Falta configurar SUPABASE_SERVICE_ROLE_KEY en el servidor" },
      { status: 500 },
    );
  }

  const formData = await request.formData().catch(() => null);
  const file = formData?.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Falta el archivo (campo 'file')" }, { status: 400 });
  }

  const filas = await leerFilasExcel(file);
  if (!filas.length) {
    return NextResponse.json({ error: "El archivo no tiene filas de datos" }, { status: 400 });
  }

  const { data: perfiles } = await supabase.from("perfil").select("id_perfil, nombre");
  const { data: bodegas } = await supabase.from("bodega").select("id_bodega, nombre");
  const idPerfilPorNombre = new Map((perfiles ?? []).map((p) => [p.nombre, p.id_perfil]));
  const idBodegaPorNombre = new Map((bodegas ?? []).map((b) => [b.nombre, b.id_bodega]));

  const admin = createAdminClient();
  const omitidos: string[] = [];
  let aplicados = 0;
  for (const [i, f] of filas.entries()) {
    const idPerfil = idPerfilPorNombre.get(f.perfil);
    if (!f.nombre_completo || !f.email || !f.password || !idPerfil) {
      omitidos.push(`Fila ${i + 2}: faltan datos obligatorios o el perfil '${f.perfil}' no existe`);
      continue;
    }
    const { data: authUser, error: authError } = await admin.auth.admin.createUser({
      email: f.email,
      password: f.password,
      email_confirm: true,
    });
    if (authError || !authUser.user) {
      omitidos.push(`Fila ${i + 2}: ${authError?.message ?? "no se pudo crear el usuario"}`);
      continue;
    }
    const { error: perfilError } = await supabase.from("usuario_perfil").insert({
      id_usuario: authUser.user.id,
      nombre_completo: f.nombre_completo,
      id_perfil: idPerfil,
      id_bodega: f.bodega ? idBodegaPorNombre.get(f.bodega) ?? null : null,
    });
    if (perfilError) {
      await admin.auth.admin.deleteUser(authUser.user.id);
      omitidos.push(`Fila ${i + 2}: ${perfilError.message}`);
      continue;
    }
    aplicados += 1;
  }

  return NextResponse.json({ data: { aplicados, omitidos } });
}
