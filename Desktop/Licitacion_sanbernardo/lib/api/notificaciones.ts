import type { SupabaseClient } from "@supabase/supabase-js";

// Aviso automático de recepción con diferencias (sección 6.2): inserta
// en "notificacion" para que el Centro de Notificaciones del header
// (suscrito vía Supabase Realtime) lo reciba sin recargar la página.
export async function crearNotificacionDiferencia(
  supabase: SupabaseClient,
  params: {
    idMovimiento: string;
    idBodega: string | null;
    idUsuario: string;
    mensaje: string;
  },
) {
  await supabase.from("notificacion").insert({
    tipo: "recepcion_con_diferencias",
    mensaje: params.mensaje,
    id_movimiento: params.idMovimiento,
    id_bodega: params.idBodega,
    id_usuario: params.idUsuario,
  });
}
