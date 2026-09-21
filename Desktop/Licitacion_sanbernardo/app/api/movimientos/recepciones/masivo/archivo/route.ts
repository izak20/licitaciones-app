import { NextResponse } from "next/server";
import { requireUser } from "@/lib/api/require-user";
import { leerFilasExcel } from "@/lib/api/carga-masiva";

// POST /api/movimientos/recepciones/masivo/archivo — Carga masiva de
// recepciones (sección 5.4 extendida), útil para cargar el stock
// inicial de la puesta en marcha. Cada fila crea un lote + un
// movimiento de recepción, igual que /api/movimientos/recepciones.
export async function POST(request: Request) {
  const { supabase, user, unauthorized } = await requireUser();
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

  const [{ data: articulos }, { data: bodegas }, { data: proveedores }] = await Promise.all([
    supabase.from("articulo").select("id_articulo, codigo_interno, requiere_lote"),
    supabase.from("bodega").select("id_bodega, nombre"),
    supabase.from("proveedor").select("id_proveedor, rut"),
  ]);
  const articuloPorCodigo = new Map((articulos ?? []).map((a) => [a.codigo_interno, a]));
  const idBodegaPorNombre = new Map((bodegas ?? []).map((b) => [b.nombre, b.id_bodega]));
  const idProveedorPorRut = new Map((proveedores ?? []).map((p) => [p.rut, p.id_proveedor]));

  const omitidos: string[] = [];
  let aplicados = 0;
  for (const [i, f] of filas.entries()) {
    const articulo = articuloPorCodigo.get(f.codigo_interno);
    const idBodega = idBodegaPorNombre.get(f.bodega);
    const cantidad = Number(f.cantidad);
    if (!articulo || !idBodega || !cantidad || cantidad <= 0) {
      omitidos.push(
        `Fila ${i + 2}: artículo '${f.codigo_interno}' o bodega '${f.bodega}' no existe, o cantidad inválida`,
      );
      continue;
    }
    if (articulo.requiere_lote && (!f.numero_lote || !f.fecha_vencimiento)) {
      omitidos.push(`Fila ${i + 2}: este artículo requiere numero_lote y fecha_vencimiento`);
      continue;
    }

    const { data: lote, error: loteError } = await supabase
      .from("lote")
      .insert({
        id_articulo: articulo.id_articulo,
        numero_lote: f.numero_lote || "SIN-LOTE",
        fecha_vencimiento: f.fecha_vencimiento || "9999-12-31",
        id_bodega: idBodega,
        cantidad_disponible: cantidad,
        id_proveedor: f.proveedor_rut ? idProveedorPorRut.get(f.proveedor_rut) ?? null : null,
      })
      .select("id_lote")
      .single();
    if (loteError || !lote) {
      omitidos.push(`Fila ${i + 2}: ${loteError?.message ?? "no se pudo crear el lote"}`);
      continue;
    }

    const { error: movError } = await supabase.from("movimiento").insert({
      tipo: "recepcion",
      id_lote: lote.id_lote,
      id_bodega_destino: idBodega,
      cantidad,
      estado: "recepcionado_sin_reparos",
      observacion: "Carga masiva (stock inicial)",
      id_usuario: user.id,
    });
    if (movError) {
      omitidos.push(`Fila ${i + 2}: ${movError.message}`);
      continue;
    }
    aplicados += 1;
  }

  return NextResponse.json({ data: { aplicados, omitidos } });
}
