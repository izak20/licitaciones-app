import ExcelJS from "exceljs";
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/api/require-user";
import { mapPostgresError } from "@/lib/api/errors";

// GET /api/proveedores/[id]/lista-precios — Exportar lista de precios
// (sección 5.3).
//
// NOTA IMPORTANTE: el esquema de la sección 2 no tiene ninguna tabla de
// precios por proveedor/artículo (ni una columna "precio" en ningún
// lado). Esta ruta exporta, a modo de placeholder, los artículos que
// históricamente se han recibido de este proveedor (vía lote), con la
// columna "Precio" en blanco. Para que esta exportación tenga datos
// reales hace falta agregar una tabla (p.ej. lista_precio_proveedor)
// al esquema — pendiente de definir con el cliente.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { supabase, unauthorized } = await requireUser();
  if (unauthorized) return unauthorized;

  const { data: proveedor, error: proveedorError } = await supabase
    .from("proveedor")
    .select("razon_social")
    .eq("id_proveedor", id)
    .single();
  if (proveedorError || !proveedor) {
    return NextResponse.json({ error: "Proveedor no encontrado" }, { status: 404 });
  }

  const { data, error } = await supabase
    .from("lote")
    .select("articulo:id_articulo(codigo_interno, nombre, unidad_medida)")
    .eq("id_proveedor", id);

  if (error) {
    const mapped = mapPostgresError(error);
    return NextResponse.json({ error: mapped.message }, { status: mapped.status });
  }

  const articulosUnicos = new Map<
    string,
    { codigo_interno: string; nombre: string; unidad_medida: string | null }
  >();
  for (const fila of data ?? []) {
    const articulo = Array.isArray(fila.articulo) ? fila.articulo[0] : fila.articulo;
    if (articulo) articulosUnicos.set(articulo.codigo_interno, articulo);
  }

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Lista de precios");
  sheet.columns = [
    { header: "Código interno", key: "codigo_interno", width: 18 },
    { header: "Nombre", key: "nombre", width: 32 },
    { header: "Unidad de medida", key: "unidad_medida", width: 16 },
    { header: "Precio", key: "precio", width: 14 },
  ];
  sheet.addRows(
    Array.from(articulosUnicos.values()).map((a) => ({ ...a, precio: null })),
  );
  sheet.getRow(1).font = { bold: true };

  const buffer = await workbook.xlsx.writeBuffer();

  return new NextResponse(buffer as unknown as BodyInit, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="lista-precios-${proveedor.razon_social}.xlsx"`,
    },
  });
}
