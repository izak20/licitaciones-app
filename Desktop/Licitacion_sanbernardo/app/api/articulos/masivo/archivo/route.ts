import { NextResponse } from "next/server";
import { requireUser } from "@/lib/api/require-user";
import { esVerdadero, leerFilasExcel } from "@/lib/api/carga-masiva";

// POST /api/articulos/masivo/archivo — Carga masiva de artículos desde
// Excel (mismo formato que descarga /api/articulos/masivo/plantilla).
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
    if (!f.codigo_interno || !f.nombre) {
      omitidos.push(`Fila ${i + 2}: falta codigo_interno o nombre`);
      continue;
    }
    validas.push({
      codigo_interno: f.codigo_interno,
      nombre: f.nombre,
      grupo: f.grupo || null,
      familia: f.familia || null,
      subfamilia: f.subfamilia || null,
      unidad_medida: f.unidad_medida || null,
      es_controlado: esVerdadero(f.es_controlado),
      requiere_cadena_frio: esVerdadero(f.requiere_cadena_frio),
      requiere_lote: f.requiere_lote ? esVerdadero(f.requiere_lote) : true,
      condicion_almacenamiento: f.condicion_almacenamiento || null,
      registro_sanitario: f.registro_sanitario || null,
    });
  }

  if (!validas.length) {
    return NextResponse.json({ error: "Ninguna fila es válida", detalle: omitidos }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("articulo")
    .upsert(validas, { onConflict: "codigo_interno" })
    .select();

  if (error) {
    return NextResponse.json({ error: error.message, detalle: omitidos }, { status: 400 });
  }

  return NextResponse.json({ data: { aplicados: data?.length ?? 0, omitidos } });
}
