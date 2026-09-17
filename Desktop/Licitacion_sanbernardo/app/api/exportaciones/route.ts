import ExcelJS from "exceljs";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/api/require-user";
import { mapPostgresError } from "@/lib/api/errors";

// POST /api/exportaciones — Genera exportación (sección 5.11): un
// respaldo en formato abierto (xlsx, aclaración N°18 del Foro) con las
// tablas principales del sistema, subido al bucket "exportaciones".
// tipo "trimestral" es el mismo endpoint que pg_cron llamará
// automáticamente (sección 6.4); ese cron aún no está configurado.
const exportacionSchema = z.object({
  tipo: z.enum(["trimestral", "a_solicitud", "final_contrato"]),
});

async function agregarHoja(
  workbook: ExcelJS.Workbook,
  nombre: string,
  columnas: Partial<ExcelJS.Column>[],
  filas: Record<string, unknown>[],
) {
  const sheet = workbook.addWorksheet(nombre);
  sheet.columns = columnas;
  sheet.addRows(filas);
  sheet.getRow(1).font = { bold: true };
}

export async function POST(request: Request) {
  const { supabase, user, unauthorized } = await requireUser();
  if (unauthorized) return unauthorized;

  const json = await request.json().catch(() => ({}));
  const parsed = exportacionSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const [{ data: articulos }, { data: proveedores }, { data: lotes }, { data: movimientos }] =
    await Promise.all([
      supabase.from("articulo").select("*"),
      supabase.from("proveedor").select("*"),
      supabase.from("lote").select("*"),
      supabase.from("movimiento").select("*"),
    ]);

  const workbook = new ExcelJS.Workbook();
  await agregarHoja(
    workbook,
    "Artículos",
    [
      { header: "Código interno", key: "codigo_interno", width: 18 },
      { header: "Nombre", key: "nombre", width: 30 },
      { header: "Grupo", key: "grupo", width: 18 },
      { header: "Familia", key: "familia", width: 18 },
      { header: "Activo", key: "activo", width: 10 },
    ],
    articulos ?? [],
  );
  await agregarHoja(
    workbook,
    "Proveedores",
    [
      { header: "RUT", key: "rut", width: 16 },
      { header: "Razón social", key: "razon_social", width: 30 },
      { header: "Activo", key: "activo", width: 10 },
    ],
    proveedores ?? [],
  );
  await agregarHoja(
    workbook,
    "Lotes",
    [
      { header: "Número de lote", key: "numero_lote", width: 20 },
      { header: "Vencimiento", key: "fecha_vencimiento", width: 16 },
      { header: "Cantidad disponible", key: "cantidad_disponible", width: 20 },
      { header: "Bodega", key: "id_bodega", width: 36 },
    ],
    lotes ?? [],
  );
  await agregarHoja(
    workbook,
    "Movimientos",
    [
      { header: "Tipo", key: "tipo", width: 16 },
      { header: "Cantidad", key: "cantidad", width: 14 },
      { header: "Estado", key: "estado", width: 24 },
      { header: "Folio", key: "folio", width: 16 },
      { header: "Fecha", key: "fecha_movimiento", width: 22 },
    ],
    movimientos ?? [],
  );

  const buffer = await workbook.xlsx.writeBuffer();
  const path = `${parsed.data.tipo}/${Date.now()}.xlsx`;

  const { error: uploadError } = await supabase.storage
    .from("exportaciones")
    .upload(path, buffer as ArrayBuffer, {
      contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 400 });
  }

  const { data: exportacion, error } = await supabase
    .from("exportacion")
    .insert({
      tipo: parsed.data.tipo,
      formato: "xlsx",
      id_usuario: user.id,
      ruta_archivo: path,
    })
    .select()
    .single();
  if (error) {
    const mapped = mapPostgresError(error);
    return NextResponse.json({ error: mapped.message }, { status: mapped.status });
  }

  return NextResponse.json({ data: exportacion }, { status: 201 });
}
