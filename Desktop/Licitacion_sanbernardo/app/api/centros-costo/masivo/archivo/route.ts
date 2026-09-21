import { NextResponse } from "next/server";
import { requireUser } from "@/lib/api/require-user";
import { leerFilasExcel } from "@/lib/api/carga-masiva";

// POST /api/centros-costo/masivo/archivo — Carga masiva de centros de
// costo.
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

  const { data: bodegas } = await supabase.from("bodega").select("id_bodega, nombre");
  const idPorNombre = new Map((bodegas ?? []).map((b) => [b.nombre, b.id_bodega]));

  const omitidos: string[] = [];
  const validas = [];
  for (const [i, f] of filas.entries()) {
    const idBodega = idPorNombre.get(f.bodega);
    if (!f.codigo || !f.nombre || !idBodega) {
      omitidos.push(`Fila ${i + 2}: falta codigo/nombre o la bodega '${f.bodega}' no existe`);
      continue;
    }
    validas.push({ codigo: f.codigo, nombre: f.nombre, id_bodega: idBodega });
  }

  if (!validas.length) {
    return NextResponse.json({ error: "Ninguna fila es válida", detalle: omitidos }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("centro_costo")
    .upsert(validas, { onConflict: "codigo" })
    .select();

  if (error) {
    return NextResponse.json({ error: error.message, detalle: omitidos }, { status: 400 });
  }

  return NextResponse.json({ data: { aplicados: data?.length ?? 0, omitidos } });
}
