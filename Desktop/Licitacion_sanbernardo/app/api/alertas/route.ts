import { NextResponse } from "next/server";
import { requireUser } from "@/lib/api/require-user";
import { stockPorArticuloBodega } from "@/lib/api/inventario";

// GET /api/alertas — Centro de alertas real: stock bajo mínimo/crítico,
// lotes por vencer o vencidos, lecturas de temperatura fuera de rango y
// recepciones con reparos. Cada tabla ya aplica RLS (back-office ve
// toda la red, Cliente Interno solo su propia bodega), así que esta
// ruta no filtra nada extra: solo agrega y ordena por severidad.

type Severidad = "alta" | "media" | "baja";

type Alerta = {
  tipo: "stock_bajo" | "vencimiento" | "temperatura" | "reparos";
  severidad: Severidad;
  titulo: string;
  detalle: string;
  fecha: string;
};

const ORDEN_SEVERIDAD: Record<Severidad, number> = { alta: 0, media: 1, baja: 2 };

function desanidar<T>(v: T | T[] | null | undefined): T | null {
  if (Array.isArray(v)) return v[0] ?? null;
  return v ?? null;
}

export async function GET() {
  const { supabase, unauthorized } = await requireUser();
  if (unauthorized) return unauthorized;

  const ahora = new Date();
  const hoyIso = ahora.toISOString().slice(0, 10);
  const en90DiasIso = new Date(ahora.getTime() + 90 * 86400000).toISOString().slice(0, 10);

  const [{ data: parametros }, stockPorClave, { data: lotesVencer }, { data: temperaturas }, { data: reparos }] =
    await Promise.all([
    supabase
      .from("stock_parametro")
      .select(
        "id_articulo, id_bodega, stock_minimo, stock_critico, articulo:id_articulo(nombre), bodega:id_bodega(nombre)",
      ),
    stockPorArticuloBodega(supabase),
    supabase
      .from("lote")
      .select(
        "id_lote, numero_lote, fecha_vencimiento, cantidad_disponible, articulo:id_articulo(nombre), bodega:id_bodega(nombre)",
      )
      .lte("fecha_vencimiento", en90DiasIso)
      .gt("cantidad_disponible", 0)
      .order("fecha_vencimiento", { ascending: true })
      .limit(50),
    supabase
      .from("registro_temperatura")
      .select("id_registro, temperatura, fecha_registro, bodega:id_bodega(nombre)")
      .eq("fuera_de_rango", true)
      .order("fecha_registro", { ascending: false })
      .limit(20),
    supabase
      .from("movimiento")
      .select(
        "id_movimiento, cantidad, fecha_movimiento, folio, lote:id_lote(articulo:id_articulo(nombre)), bodega_destino:id_bodega_destino(nombre)",
      )
      .eq("estado", "recepcionado_con_reparos")
      .order("fecha_movimiento", { ascending: false })
      .limit(20),
  ]);

  const alertas: Alerta[] = [];

  for (const p of parametros ?? []) {
    const clave = p.id_articulo + "|" + p.id_bodega;
    const stockActual = stockPorClave.get(clave) ?? 0;
    const articulo = desanidar(p.articulo);
    const bodega = desanidar(p.bodega);
    const stockCritico = Number(p.stock_critico);
    const stockMinimo = Number(p.stock_minimo);
    if (stockActual <= stockCritico) {
      alertas.push({
        tipo: "stock_bajo",
        severidad: "alta",
        titulo: `Stock crítico: ${articulo?.nombre ?? "artículo"}`,
        detalle: `${bodega?.nombre ?? "bodega"} · quedan ${stockActual} (crítico: ${stockCritico})`,
        fecha: ahora.toISOString(),
      });
    } else if (stockActual <= stockMinimo) {
      alertas.push({
        tipo: "stock_bajo",
        severidad: "media",
        titulo: `Bajo stock mínimo: ${articulo?.nombre ?? "artículo"}`,
        detalle: `${bodega?.nombre ?? "bodega"} · quedan ${stockActual} (mínimo: ${stockMinimo})`,
        fecha: ahora.toISOString(),
      });
    }
  }

  for (const l of lotesVencer ?? []) {
    const vencido = l.fecha_vencimiento < hoyIso;
    const dias = Math.ceil(
      (new Date(l.fecha_vencimiento).getTime() - ahora.getTime()) / 86400000,
    );
    const articulo = desanidar(l.articulo);
    const bodega = desanidar(l.bodega);
    alertas.push({
      tipo: "vencimiento",
      severidad: vencido ? "alta" : dias <= 30 ? "media" : "baja",
      titulo: vencido
        ? `Lote vencido: ${articulo?.nombre ?? "artículo"}`
        : `Vence en ${dias} días: ${articulo?.nombre ?? "artículo"}`,
      detalle: `${bodega?.nombre ?? "bodega"} · lote ${l.numero_lote} · ${l.cantidad_disponible} unid. · vence ${l.fecha_vencimiento}`,
      fecha: l.fecha_vencimiento,
    });
  }

  for (const t of temperaturas ?? []) {
    const bodega = desanidar(t.bodega);
    alertas.push({
      tipo: "temperatura",
      severidad: "alta",
      titulo: `Temperatura fuera de rango: ${bodega?.nombre ?? "bodega"}`,
      detalle: `${t.temperatura} °C registrados`,
      fecha: t.fecha_registro,
    });
  }

  for (const m of reparos ?? []) {
    const lote = desanidar(m.lote);
    const articulo = lote ? desanidar(lote.articulo) : null;
    const bodega = desanidar(m.bodega_destino);
    alertas.push({
      tipo: "reparos",
      severidad: "media",
      titulo: `Recepción con reparos${m.folio ? " · " + m.folio : ""}`,
      detalle: `${bodega?.nombre ?? "bodega"} · ${articulo?.nombre ?? "artículo"} · ${m.cantidad} unid.`,
      fecha: m.fecha_movimiento,
    });
  }

  alertas.sort(
    (a, b) => ORDEN_SEVERIDAD[a.severidad] - ORDEN_SEVERIDAD[b.severidad] || b.fecha.localeCompare(a.fecha),
  );

  return NextResponse.json({ data: alertas });
}
