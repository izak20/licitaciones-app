import { NextResponse } from "next/server";
import { requireUser } from "@/lib/api/require-user";
import { leerFilasExcel } from "@/lib/api/carga-masiva";

// POST /api/proveedores/masivo/archivo — Carga masiva de proveedores.
export async function POST(request: Request) {
  const { supabase, unauthorized } = await requireUser();
  if (unauthorized) return unauthorized;

  const formData = await request.formData().catch(() => null);
  const file = formData?.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Falta el archivo (campo 'file')" }, { status: 400 });
  }

  const filas = await leerFilasExcel(file);
  if (!filas.length) {
    return NextResponse.json({ error: "El archivo no tiene filas de datos" }, { status: 400 });
  }

  const omitidos: string[] = [];
  const validas = [];
  for (const [i, f] of filas.entries()) {
    if (!f.rut || !f.razon_social) {
      omitidos.push(`Fila ${i + 2}: falta rut o razon_social`);
      continue;
    }
    validas.push({
      rut: f.rut,
      razon_social: f.razon_social,
      direccion: f.direccion || null,
      telefono: f.telefono || null,
      email: f.email || null,
      nombre_ejecutivo: f.nombre_ejecutivo || null,
      telefono_ejecutivo: f.telefono_ejecutivo || null,
    });
  }

  if (!validas.length) {
    return NextResponse.json({ error: "Ninguna fila es válida", detalle: omitidos }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("proveedor")
    .upsert(validas, { onConflict: "rut" })
    .select();

  if (error) {
    return NextResponse.json({ error: error.message, detalle: omitidos }, { status: 400 });
  }

  return NextResponse.json({ data: { aplicados: data?.length ?? 0, omitidos } });
}
