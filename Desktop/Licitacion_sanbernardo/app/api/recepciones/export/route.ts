import ExcelJS from "exceljs";
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/api/require-user";
import { mapPostgresError } from "@/lib/api/errors";

// GET /api/recepciones/export?bodega=&desde=&hasta= — Exportar consulta
// de recepciones (sección 5.8).
export async function GET(request: Request) {
  const { supabase, unauthorized } = await requireUser();
  if (unauthorized) return unauthorized;

  const { searchParams } = new URL(request.url);
  const bodega = searchParams.get("bodega");
  const desde = searchParams.get("desde");
  const hasta = searchParams.get("hasta");

  let query = supabase
    .from("movimiento")
    .select(
      "fecha_movimiento, cantidad, estado, observacion, lote:id_lote(numero_lote, fecha_vencimiento, articulo:id_articulo(nombre, codigo_interno), proveedor:id_proveedor(razon_social)), bodega:id_bodega_destino(nombre)",
    )
    .eq("tipo", "recepcion")
    .order("fecha_movimiento", { ascending: false });

  if (bodega) query = query.eq("id_bodega_destino", bodega);
  if (desde) query = query.gte("fecha_movimiento", desde);
  if (hasta) query = query.lte("fecha_movimiento", hasta);

  const { data, error } = await query;
  if (error) {
    const mapped = mapPostgresError(error);
    return NextResponse.json({ error: mapped.message }, { status: mapped.status });
  }

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Recepciones");
  sheet.columns = [
    { header: "Fecha", key: "fecha", width: 22 },
    { header: "Bodega", key: "bodega", width: 24 },
    { header: "Artículo", key: "articulo", width: 30 },
    { header: "Lote", key: "lote", width: 16 },
    { header: "Vencimiento", key: "vencimiento", width: 16 },
    { header: "Proveedor", key: "proveedor", width: 26 },
    { header: "Cantidad", key: "cantidad", width: 12 },
    { header: "Estado", key: "estado", width: 24 },
    { header: "Observación", key: "observacion", width: 30 },
  ];
  sheet.addRows(
    (data ?? []).map((r) => {
      const lote = Array.isArray(r.lote) ? r.lote[0] : r.lote;
      const bodega = Array.isArray(r.bodega) ? r.bodega[0] : r.bodega;
      const articulo = lote?.articulo
        ? Array.isArray(lote.articulo)
          ? lote.articulo[0]
          : lote.articulo
        : null;
      const proveedor = lote?.proveedor
        ? Array.isArray(lote.proveedor)
          ? lote.proveedor[0]
          : lote.proveedor
        : null;
      return {
        fecha: r.fecha_movimiento,
        bodega: bodega?.nombre ?? "",
        articulo: articulo?.nombre ?? "",
        lote: lote?.numero_lote ?? "",
        vencimiento: lote?.fecha_vencimiento ?? "",
        proveedor: proveedor?.razon_social ?? "",
        cantidad: r.cantidad,
        estado: r.estado,
        observacion: r.observacion ?? "",
      };
    }),
  );
  sheet.getRow(1).font = { bold: true };

  const buffer = await workbook.xlsx.writeBuffer();
  return new NextResponse(buffer as unknown as BodyInit, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="recepciones.xlsx"',
    },
  });
}
