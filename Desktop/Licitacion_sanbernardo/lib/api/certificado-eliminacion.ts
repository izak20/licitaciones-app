import PDFDocument from "pdfkit";

// Certificado de eliminación segura (sección 6.4, aclaración N°18 del
// Foro): deja constancia de qué se borró, cuándo y quién lo autorizó,
// antes de ejecutar fn_eliminacion_segura (que sí hace el borrado).
export function generarCertificadoEliminacion(params: {
  administrador: string;
  fecha: Date;
  conteos: Record<string, number>;
}): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    doc
      .fontSize(18)
      .text("Certificado de eliminación segura de datos", { align: "center" })
      .moveDown()
      .fontSize(11)
      .text("Sistema de Gestión de Droguería Comunal — CORSABER · PANALBIT SPA")
      .moveDown(2)
      .text(`Fecha y hora: ${params.fecha.toISOString()}`)
      .text(`Autorizado por: ${params.administrador}`)
      .moveDown()
      .text(
        "En cumplimiento del Plan de salida (Anexo N°4, aclaración N°18 del Foro), " +
          "se ejecutó la eliminación permanente de todos los datos de negocio del " +
          "proyecto Supabase asociado a este sistema, incluyendo la bitácora de " +
          "auditoría. El siguiente detalle registra el volumen de datos eliminado:",
      )
      .moveDown();

    for (const [tabla, cantidad] of Object.entries(params.conteos)) {
      doc.text(`• ${tabla}: ${cantidad} registro(s)`);
    }

    doc
      .moveDown(2)
      .text(
        "Este documento es generado automáticamente por el sistema y constituye " +
          "el respaldo formal de la eliminación segura solicitada.",
      );

    doc.end();
  });
}
