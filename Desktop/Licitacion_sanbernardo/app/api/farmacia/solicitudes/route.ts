import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/api/require-user";
import { mapPostgresError } from "@/lib/api/errors";

// POST /api/farmacia/solicitudes — Solicitud especial de abastecimiento
// (sección 5.10): mismo mecanismo que una orden por "solicitud" en
// abastecimiento (sección 5.7), expuesto acá para el flujo de Farmacia.
// GET /api/farmacia/solicitudes — Consulta de solicitudes propias: la
// RLS de orden_abastecimiento (sección 3) ya acota a la bodega del
// perfil Cliente Interno.
const solicitudSchema = z.object({
  id_bodega: z.string().uuid(),
  lineas: z
    .array(
      z.object({
        id_articulo: z.string().uuid(),
        cantidad: z.number().positive(),
        observacion: z.string().optional(),
      }),
    )
    .min(1),
});

export async function POST(request: Request) {
  const { supabase, user, unauthorized } = await requireUser();
  if (unauthorized) return unauthorized;

  const json = await request.json().catch(() => null);
  const parsed = solicitudSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const body = parsed.data;

  const { data: folio, error: folioError } = await supabase.rpc(
    "fn_siguiente_folio_orden",
  );
  if (folioError || !folio) {
    return NextResponse.json(
      { error: "No se pudo generar el folio de la solicitud" },
      { status: 500 },
    );
  }

  const { data: orden, error: ordenError } = await supabase
    .from("orden_abastecimiento")
    .insert({
      folio,
      origen: "solicitud",
      id_bodega_solicitante: body.id_bodega,
      id_usuario: user.id,
    })
    .select()
    .single();
  if (ordenError) {
    const mapped = mapPostgresError(ordenError);
    return NextResponse.json({ error: mapped.message }, { status: mapped.status });
  }

  const { data: lineas, error: lineasError } = await supabase
    .from("orden_abastecimiento_linea")
    .insert(
      body.lineas.map((l) => ({
        id_orden: orden.id_orden,
        id_articulo: l.id_articulo,
        cantidad_solicitada: l.cantidad,
        observacion: l.observacion ?? null,
      })),
    )
    .select();
  if (lineasError) {
    const mapped = mapPostgresError(lineasError);
    return NextResponse.json({ error: mapped.message }, { status: mapped.status });
  }

  return NextResponse.json({ data: { ...orden, lineas } }, { status: 201 });
}

export async function GET() {
  const { supabase, unauthorized } = await requireUser();
  if (unauthorized) return unauthorized;

  const { data, error } = await supabase
    .from("orden_abastecimiento")
    .select("*, lineas:orden_abastecimiento_linea(*, articulo:id_articulo(nombre, codigo_interno))")
    .eq("origen", "solicitud")
    .order("fecha_creacion", { ascending: false });
  if (error) {
    const mapped = mapPostgresError(error);
    return NextResponse.json({ error: mapped.message }, { status: mapped.status });
  }

  return NextResponse.json({ data });
}
