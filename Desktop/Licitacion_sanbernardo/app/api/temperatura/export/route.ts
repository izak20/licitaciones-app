import ExcelJS from "exceljs";
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/api/require-user";
import { mapPostgresError } from "@/lib/api/errors";

// GET /api/temperatura/export?bodega=&desde=&hasta= — Exportar
// histórico de temperatura filtrado (sección 5.5).
export async function GET(request: Request) {
  const { supabase, unauthorized } = await requireUser();
  if (unauthorized) return unauthorized;

  const { searchParams } = new URL(request.url);
  const bodega = searchParams.get("bodega");
  const desde = searchParams.get("desde");
  const hasta = searchParams.get("hasta");

  let query = supabase
    .from("registro_temperatura")
    .select("fecha_registro, temperatura, fuera_de_rango, bodega:id_bodega(nombre)")
    .order("fecha_registro", { ascending: false });

  if (bodega) query = query.eq("id_bodega", bodega);
  if (desde) query = query.gte("fecha_registro", desde);
  if (hasta) query = query.lte("fecha_registro", hasta);

  const { data, error } = await query;
  if (error) {
    const mapped = mapPostgresError(error);
    return NextResponse.json({ error: mapped.message }, { status: mapped.status });
  }

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Temperatura");
  sheet.columns = [
    { header: "Fecha", key: "fecha", width: 22 },
    { header: "Bodega", key: "bodega", width: 24 },
    { header: "Temperatura (°C)", key: "temperatura", width: 18 },
    { header: "Fuera de rango", key: "fuera", width: 16 },
  ];
  sheet.addRows(
    (data ?? []).map((r) => {
      const bodega = Array.isArray(r.bodega) ? r.bodega[0] : r.bodega;
      return {
        fecha: r.fecha_registro,
        bodega: bodega?.nombre ?? "",
        temperatura: r.temperatura,
        fuera: r.fuera_de_rango ? "Sí" : "No",
      };
    }),
  );
  sheet.getRow(1).font = { bold: true };

  const buffer = await workbook.xlsx.writeBuffer();
  return new NextResponse(buffer as unknown as BodyInit, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="temperatura.xlsx"',
    },
  });
}
