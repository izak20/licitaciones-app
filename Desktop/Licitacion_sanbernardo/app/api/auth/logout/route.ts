import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// POST /api/auth/logout — Cierre de sesión (sección 5.1). Lo llama el
// botón "Cerrar sesión" de sistema.html; limpia la sesión real de
// Supabase Auth (las cookies) para que el middleware exija login de
// nuevo en el próximo request a /sistema.html.
export async function POST() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  return NextResponse.json({ data: { cerrado: true } });
}
