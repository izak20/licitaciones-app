// Traduce errores de Postgres/RLS a respuestas HTTP claras, en vez de
// dejar pasar el mensaje interno de Postgres tal cual.
export function mapPostgresError(error: { code?: string; message: string }) {
  if (error.code === "42501") {
    return { status: 403, message: "No tienes permisos para esta operación" };
  }
  if (error.code === "23505") {
    return {
      status: 409,
      message: "Ya existe un registro con ese valor único (ej. código o folio duplicado)",
    };
  }
  if (error.code === "23503") {
    return {
      status: 400,
      message: "Referencia inválida: el registro relacionado no existe",
    };
  }
  if (error.code === "PGRST116") {
    return { status: 404, message: "Registro no encontrado" };
  }
  return { status: 400, message: error.message };
}
