"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// Login: Anexo N°4, especificación general N°5 — se resuelve con
// supabase.auth.signInWithPassword(), sin sistema de contraseñas propio
// (sección 4 de la especificación).
export async function login(formData: FormData) {
  const supabase = await createClient();

  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}`);
  }

  redirect("/dashboard");
}
