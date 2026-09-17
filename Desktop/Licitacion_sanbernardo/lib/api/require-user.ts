import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Cada Route Handler verifica sesión al inicio (sección 5); el resto de
// la autorización la aplica RLS automáticamente sobre las consultas
// hechas con este mismo cliente.
export async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      supabase,
      user: null,
      unauthorized: NextResponse.json(
        { error: "No autenticado" },
        { status: 401 },
      ),
    } as const;
  }

  return { supabase, user, unauthorized: null } as const;
}
