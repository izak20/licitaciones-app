import { NextResponse } from "next/server";
import { requireUser } from "@/lib/api/require-user";
import { mapPostgresError } from "@/lib/api/errors";

// POST /api/proveedores/[id]/documentos — Subir resolución sanitaria a
// Supabase Storage (bucket "resoluciones-sanitarias"; especificación
// general N°9). Body: multipart/form-data con campo "file".
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { supabase, unauthorized } = await requireUser();
  if (unauthorized) return unauthorized;

  const formData = await request.formData().catch(() => null);
  const file = formData?.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: "Falta el archivo (campo 'file' en el form-data)" },
      { status: 400 },
    );
  }

  const extension = file.name.split(".").pop() ?? "pdf";
  const path = `${id}/${Date.now()}.${extension}`;

  const { error: uploadError } = await supabase.storage
    .from("resoluciones-sanitarias")
    .upload(path, file, { contentType: file.type });

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("proveedor")
    .update({ documento_adjunto_url: path })
    .eq("id_proveedor", id)
    .select()
    .single();

  if (error) {
    const mapped = mapPostgresError(error);
    return NextResponse.json({ error: mapped.message }, { status: mapped.status });
  }

  return NextResponse.json({ data });
}
