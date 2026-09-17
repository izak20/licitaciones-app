import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/api/require-user";
import { generarCertificadoEliminacion } from "@/lib/api/certificado-eliminacion";

// POST /api/exportaciones/eliminacion-segura — Plan de salida (sección
// 5.11 y 6.4): genera certificado_eliminacion.pdf y luego ejecuta
// fn_eliminacion_segura, que borra permanentemente todos los datos de
// negocio del proyecto (incluida la bitácora de auditoría).
//
// Es irreversible. Exige perfil Administrador y una frase de
// confirmación literal para evitar una llamada accidental.
const TABLAS_A_CONTAR = [
  "articulo",
  "proveedor",
  "lote",
  "movimiento",
  "orden_abastecimiento",
  "usuario_perfil",
  "bodega",
  "log_auditoria",
] as const;

const eliminacionSchema = z.object({
  confirmacion: z.literal("ELIMINAR TODOS LOS DATOS"),
});

export async function POST(request: Request) {
  const { supabase, user, unauthorized } = await requireUser();
  if (unauthorized) return unauthorized;

  const json = await request.json().catch(() => null);
  const parsed = eliminacionSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error:
          'Debes enviar { "confirmacion": "ELIMINAR TODOS LOS DATOS" } para autorizar esta operación irreversible',
      },
      { status: 400 },
    );
  }

  const { data: perfilActual } = await supabase.rpc("fn_perfil_actual");
  if (perfilActual !== "Administrador") {
    return NextResponse.json(
      { error: "Solo un Administrador puede ejecutar la eliminación segura" },
      { status: 403 },
    );
  }

  const conteos: Record<string, number> = {};
  for (const tabla of TABLAS_A_CONTAR) {
    const { count } = await supabase.from(tabla).select("*", { count: "exact", head: true });
    conteos[tabla] = count ?? 0;
  }

  const certificado = await generarCertificadoEliminacion({
    administrador: user.email ?? user.id,
    fecha: new Date(),
    conteos,
  });

  const rutaCertificado = `eliminacion-segura/certificado-${Date.now()}.pdf`;
  const { error: uploadError } = await supabase.storage
    .from("exportaciones")
    .upload(rutaCertificado, certificado, { contentType: "application/pdf" });
  if (uploadError) {
    return NextResponse.json(
      { error: `No se pudo generar el certificado, se aborta antes de borrar datos: ${uploadError.message}` },
      { status: 500 },
    );
  }

  const { error: rpcError } = await supabase.rpc("fn_eliminacion_segura");
  if (rpcError) {
    return NextResponse.json(
      { error: rpcError.message, certificado: rutaCertificado },
      { status: 400 },
    );
  }

  return NextResponse.json({
    data: { certificado: rutaCertificado, conteos_eliminados: conteos },
  });
}
