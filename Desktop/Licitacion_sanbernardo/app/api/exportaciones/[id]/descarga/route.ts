import { NextResponse } from "next/server";
import { requireUser } from "@/lib/api/require-user";
import { mapPostgresError } from "@/lib/api/errors";

// GET /api/exportaciones/[id]/descarga — Descarga del archivo generado
// (sección 5.11): redirige a una URL firmada de corta duración sobre
// el bucket "exportaciones".
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { supabase, unauthorized } = await requireUser();
  if (unauthorized) return unauthorized;

  const { data: exportacion, error } = await supabase
    .from("exportacion")
    .select("ruta_archivo")
    .eq("id_exportacion", id)
    .single();
  if (error || !exportacion?.ruta_archivo) {
    const mapped = error ? mapPostgresError(error) : { status: 404, message: "Exportación no encontrada" };
    return NextResponse.json({ error: mapped.message }, { status: mapped.status });
  }

  const { data: signed, error: signedError } = await supabase.storage
    .from("exportaciones")
    .createSignedUrl(exportacion.ruta_archivo, 60);
  if (signedError || !signed) {
    return NextResponse.json(
      { error: signedError?.message ?? "No se pudo generar el enlace de descarga" },
      { status: 400 },
    );
  }

  return NextResponse.redirect(signed.signedUrl);
}
