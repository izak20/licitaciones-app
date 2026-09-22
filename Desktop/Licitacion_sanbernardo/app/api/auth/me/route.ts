import { NextResponse } from "next/server";
import { requireUser } from "@/lib/api/require-user";

// GET /api/auth/me — Identidad de la sesión real (nombre, perfil,
// bodega asociada). La usa el sidebar de sistema.html para mostrar
// quién inició sesión de verdad, en vez del nombre de ejemplo fijo que
// traía la plantilla.
export async function GET() {
  const { supabase, user, unauthorized } = await requireUser();
  if (unauthorized) return unauthorized;

  const { data, error } = await supabase
    .from("usuario_perfil")
    .select(
      "nombre_completo, perfil:id_perfil(nombre), bodega:id_bodega(id_bodega, nombre)",
    )
    .eq("id_usuario", user.id)
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: "No se encontró el perfil del usuario" },
      { status: 404 },
    );
  }

  return NextResponse.json({
    data: {
      email: user.email,
      nombre_completo: data.nombre_completo,
      perfil: data.perfil,
      bodega: data.bodega,
    },
  });
}
