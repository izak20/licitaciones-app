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
  formato: z.enum(["xlsx", "csv"]).optional().default("xlsx"),
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

function csvEscape(valor: unknown): string {
  if (valor === null || valor === undefined) return "";
  const texto = String(valor);
  if (/[",\n\r]/.test(texto)) return '"' + texto.replace(/"/g, '""') + '"';
  return texto;
}

function tablaCsv(titulo: string, columnas: { header: string; key: string }[], filas: Record<string, unknown>[]): string {
  const encabezado = "=== " + titulo + " ===";
  const cabeceraCols = columnas.map((c) => csvEscape(c.header)).join(",");
  const lineas = filas.map((f) => columnas.map((c) => csvEscape(f[c.key])).join(","));
  return [encabezado, cabeceraCols, ...lineas].join("\r\n");
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

  const COLUMNAS_ARTICULOS = [
    { header: "Código interno", key: "codigo_interno", width: 18 },
    { header: "Nombre", key: "nombre", width: 30 },
    { header: "Grupo", key: "grupo", width: 18 },
    { header: "Familia", key: "familia", width: 18 },
    { header: "Activo", key: "activo", width: 10 },
  ];
  const COLUMNAS_PROVEEDORES = [
    { header: "RUT", key: "rut", width: 16 },
    { header: "Razón social", key: "razon_social", width: 30 },
    { header: "Activo", key: "activo", width: 10 },
  ];
  const COLUMNAS_LOTES = [
    { header: "Número de lote", key: "numero_lote", width: 20 },
    { header: "Vencimiento", key: "fecha_vencimiento", width: 16 },
    { header: "Cantidad disponible", key: "cantidad_disponible", width: 20 },
    { header: "Bodega", key: "id_bodega", width: 36 },
  ];
  const COLUMNAS_MOVIMIENTOS = [
    { header: "Tipo", key: "tipo", width: 16 },
    { header: "Cantidad", key: "cantidad", width: 14 },
    { header: "Estado", key: "estado", width: 24 },
    { header: "Folio", key: "folio", width: 16 },
    { header: "Fecha", key: "fecha_movimiento", width: 22 },
  ];

  let buffer: ArrayBuffer | Buffer;
  let contentType: string;
  let extension: string;

  if (parsed.data.formato === "csv") {
    // Un solo CSV con una sección por tabla (CSV no tiene "hojas" como
    // Excel); cada sección trae su propio encabezado de columnas.
    const secciones = [
      tablaCsv("ARTÍCULOS", COLUMNAS_ARTICULOS, articulos ?? []),
      tablaCsv("PROVEEDORES", COLUMNAS_PROVEEDORES, proveedores ?? []),
      tablaCsv("LOTES", COLUMNAS_LOTES, lotes ?? []),
      tablaCsv("MOVIMIENTOS", COLUMNAS_MOVIMIENTOS, movimientos ?? []),
    ];
    buffer = Buffer.from("﻿" + secciones.join("\r\n\r\n"), "utf-8");
    contentType = "text/csv; charset=utf-8";
    extension = "csv";
  } else {
    const workbook = new ExcelJS.Workbook();
    await agregarHoja(workbook, "Artículos", COLUMNAS_ARTICULOS, articulos ?? []);
    await agregarHoja(workbook, "Proveedores", COLUMNAS_PROVEEDORES, proveedores ?? []);
    await agregarHoja(workbook, "Lotes", COLUMNAS_LOTES, lotes ?? []);
    await agregarHoja(workbook, "Movimientos", COLUMNAS_MOVIMIENTOS, movimientos ?? []);
    buffer = await workbook.xlsx.writeBuffer();
    contentType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
    extension = "xlsx";
  }

  const path = `${parsed.data.tipo}/${Date.now()}.${extension}`;

  const { error: uploadError } = await supabase.storage
    .from("exportaciones")
    .upload(path, buffer as ArrayBuffer, { contentType });
  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 400 });
  }

  const { data: exportacion, error } = await supabase
    .from("exportacion")
    .insert({
      tipo: parsed.data.tipo,
      formato: parsed.data.formato,
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

// GET /api/exportaciones — Historial de exportaciones (sección 5.11).
export async function GET() {
  const { supabase, unauthorized } = await requireUser();
  if (unauthorized) return unauthorized;

  const { data, error } = await supabase
    .from("exportacion")
    .select("*")
    .order("fecha_generacion", { ascending: false });
  if (error) {
    const mapped = mapPostgresError(error);
    return NextResponse.json({ error: mapped.message }, { status: mapped.status });
  }

  const idsUsuarios = Array.from(new Set((data ?? []).map((r) => r.id_usuario).filter(Boolean)));
  const { data: usuarios } = idsUsuarios.length
    ? await supabase
        .from("usuario_perfil")
        .select("id_usuario, nombre_completo")
        .in("id_usuario", idsUsuarios)
    : { data: [] as { id_usuario: string; nombre_completo: string }[] };
  const nombrePorId = new Map((usuarios ?? []).map((u) => [u.id_usuario, u.nombre_completo]));

  return NextResponse.json({
    data: (data ?? []).map((r) => ({ ...r, generado_por: nombrePorId.get(r.id_usuario) ?? null })),
  });
}
