import { NextResponse } from "next/server";
import { requireUser } from "@/lib/api/require-user";
import { esVerdadero, leerFilasExcel } from "@/lib/api/carga-masiva";

const TIPOS = ["centro_distribucion", "bodega", "sub_bodega"];

// POST /api/bodegas/masivo/archivo — Carga masiva de bodegas. Se
// insertan fila por fila (no en lote) porque una fila puede referenciar
// como bodega_padre a otra fila anterior del mismo archivo.
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

  const { data: existentes } = await supabase.from("bodega").select("id_bodega, nombre");
  const idPorNombre = new Map((existentes ?? []).map((b) => [b.nombre, b.id_bodega]));

  const omitidos: string[] = [];
  let aplicados = 0;
  for (const [i, f] of filas.entries()) {
    if (!f.nombre || !f.tipo || !TIPOS.includes(f.tipo)) {
      omitidos.push(`Fila ${i + 2}: falta nombre o tipo inválido (${f.tipo || "vacío"})`);
      continue;
    }
    const idPadre = f.bodega_padre ? idPorNombre.get(f.bodega_padre) : null;
    if (f.bodega_padre && !idPadre) {
      omitidos.push(`Fila ${i + 2}: bodega_padre '${f.bodega_padre}' no existe`);
      continue;
    }
    const { data, error } = await supabase
      .from("bodega")
      .insert({
        nombre: f.nombre,
        tipo: f.tipo,
        id_bodega_padre: idPadre ?? null,
        direccion: f.direccion || null,
        requiere_cadena_frio: esVerdadero(f.requiere_cadena_frio),
      })
      .select("id_bodega, nombre")
      .single();
    if (error) {
      omitidos.push(`Fila ${i + 2}: ${error.message}`);
      continue;
    }
    idPorNombre.set(data.nombre, data.id_bodega);
    aplicados += 1;
  }

  return NextResponse.json({ data: { aplicados, omitidos } });
}
