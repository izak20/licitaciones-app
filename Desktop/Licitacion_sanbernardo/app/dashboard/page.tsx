import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { logout } from "./actions";

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: usuarioPerfil } = await supabase
    .from("usuario_perfil")
    .select("nombre_completo, id_perfil, id_bodega")
    .eq("id_usuario", user.id)
    .single();

  let perfilNombre: string | null = null;
  if (usuarioPerfil?.id_perfil) {
    const { data: perfil } = await supabase
      .from("perfil")
      .select("nombre")
      .eq("id_perfil", usuarioPerfil.id_perfil)
      .single();
    perfilNombre = perfil?.nombre ?? null;
  }

  let bodegaNombre: string | null = null;
  if (usuarioPerfil?.id_bodega) {
    const { data: bodega } = await supabase
      .from("bodega")
      .select("nombre")
      .eq("id_bodega", usuarioPerfil.id_bodega)
      .single();
    bodegaNombre = bodega?.nombre ?? null;
  }

  return (
    <main style={{ maxWidth: 480, margin: "80px auto" }}>
      <h1>Bienvenido</h1>
      <p>
        <strong>Correo:</strong> {user.email}
      </p>
      <p>
        <strong>Nombre:</strong> {usuarioPerfil?.nombre_completo ?? "—"}
      </p>
      <p>
        <strong>Perfil:</strong> {perfilNombre ?? "—"}
      </p>
      <p>
        <strong>Bodega asignada:</strong> {bodegaNombre ?? "— (no aplica)"}
      </p>
      <form action={logout}>
        <button type="submit">Cerrar sesión</button>
      </form>
    </main>
  );
}
