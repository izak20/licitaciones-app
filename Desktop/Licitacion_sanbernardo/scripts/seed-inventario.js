// El usuario reportó que Inventario (Toma de inventario y Ajustes)
// aparecía vacío. No era un bug: el seed original nunca creó ninguna
// toma_inventario, y por azar ningún lote generado quedó vencido con
// stock > 0 (los que caían vencidos ya se habían consumido a 0). Se
// agrega una toma cerrada (con conteo y diferencias reales) y una
// abierta, más algunos lotes genuinamente vencidos con stock, cada uno
// con su recepción real para quedar consistentes en el log.
const fs = require("fs");
const path = require("path");

const envPath = path.join(__dirname, "..", ".env.local");
for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2];
}
const { createClient } = require("@supabase/supabase-js");
const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

function diasAtras(n) {
  return new Date(Date.now() - n * 86400000);
}
function rand(min, max) {
  return Math.round(min + Math.random() * (max - min));
}
function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

async function main() {
  const { data: bodegas } = await admin.from("bodega").select("id_bodega, nombre, tipo");
  const { data: usuarios } = await admin.from("usuario_perfil").select("id_usuario, nombre_completo");
  const idsUsuarios = usuarios.map((u) => u.id_usuario);
  const bodegaCentral = bodegas.find((b) => b.tipo === "centro_distribucion");
  const cesfam1 = bodegas.find((b) => b.nombre === "CESFAM Prueba");
  const cesfam2 = bodegas.find((b) => b.nombre === "CESFAM Otro");

  console.log("=== 1. Toma cerrada (con conteo y diferencias) en", cesfam1.nombre, "===");
  const { data: lotesCesfam1 } = await admin
    .from("lote")
    .select("id_lote, cantidad_disponible")
    .eq("id_bodega", cesfam1.id_bodega)
    .gt("cantidad_disponible", 0);

  const inicio1 = diasAtras(6);
  const { data: tomaCerrada, error: errToma1 } = await admin
    .from("toma_inventario")
    .insert({
      id_bodega: cesfam1.id_bodega,
      alcance: "total",
      responsable: "Patricia Reyes",
      segundo_verificador: "Cristián Muñoz",
      conteo_a_ciegas: false,
      estado: "cerrada",
      id_usuario: pick(idsUsuarios),
      fecha_inicio: inicio1.toISOString(),
      fecha_cierre: diasAtras(5).toISOString(),
    })
    .select()
    .single();
  if (errToma1) throw errToma1;

  const lineasCerrada = lotesCesfam1.map((l) => {
    const sistema = Number(l.cantidad_disponible);
    // La mayoría cuadra; un par queda con una diferencia real (merma/error de conteo).
    const conDiferencia = Math.random() < 0.25;
    const contado = conDiferencia ? Math.max(0, sistema - rand(1, 5)) : sistema;
    return {
      id_toma: tomaCerrada.id_toma,
      id_lote: l.id_lote,
      cantidad_sistema: sistema,
      cantidad_contada: contado,
      observacion: conDiferencia ? "Diferencia detectada en conteo físico" : null,
    };
  });
  if (lineasCerrada.length) {
    const { error } = await admin.from("toma_inventario_linea").insert(lineasCerrada);
    if (error) throw error;
  }
  console.log("toma cerrada:", tomaCerrada.id_toma, "-", lineasCerrada.length, "líneas");

  console.log("=== 2. Toma abierta (en curso) en", cesfam2.nombre, "===");
  const { data: lotesCesfam2 } = await admin
    .from("lote")
    .select("id_lote, cantidad_disponible")
    .eq("id_bodega", cesfam2.id_bodega)
    .gt("cantidad_disponible", 0);

  const { data: tomaAbierta, error: errToma2 } = await admin
    .from("toma_inventario")
    .insert({
      id_bodega: cesfam2.id_bodega,
      alcance: "total",
      responsable: "Javier Alsina",
      segundo_verificador: null,
      conteo_a_ciegas: true,
      estado: "abierta",
      id_usuario: pick(idsUsuarios),
      fecha_inicio: diasAtras(1).toISOString(),
    })
    .select()
    .single();
  if (errToma2) throw errToma2;

  const lineasAbierta = lotesCesfam2.map((l) => ({
    id_toma: tomaAbierta.id_toma,
    id_lote: l.id_lote,
    cantidad_sistema: Number(l.cantidad_disponible),
    cantidad_contada: null,
  }));
  if (lineasAbierta.length) {
    const { error } = await admin.from("toma_inventario_linea").insert(lineasAbierta);
    if (error) throw error;
  }
  console.log("toma abierta:", tomaAbierta.id_toma, "-", lineasAbierta.length, "líneas");

  console.log("=== 3. Lotes realmente vencidos, con stock (para la pestaña Ajustes) ===");
  const { data: articulos } = await admin
    .from("articulo")
    .select("id_articulo, codigo_interno, requiere_lote")
    .eq("activo", true)
    .neq("codigo_interno", "TEST-001")
    .limit(4);
  const { data: proveedores } = await admin.from("proveedor").select("id_proveedor");

  const lotesVencidos = [];
  const movimientosVencidos = [];
  for (const art of articulos) {
    const bodega = pick([cesfam1, cesfam2, bodegaCentral]);
    const fechaIngreso = diasAtras(rand(200, 400));
    const cantidad = rand(8, 45);
    lotesVencidos.push({
      id_articulo: art.id_articulo,
      numero_lote: "L-VENC-" + art.codigo_interno.slice(4),
      fecha_vencimiento: diasAtras(rand(5, 60)).toISOString().slice(0, 10),
      id_bodega: bodega.id_bodega,
      cantidad_disponible: cantidad,
      id_proveedor: pick(proveedores).id_proveedor,
      fecha_ingreso: fechaIngreso.toISOString(),
      precio_unitario: rand(50, 5000),
      _cantidad: cantidad,
      _fecha: fechaIngreso,
    });
  }
  const { data: lotesInsertados, error: errLotes } = await admin
    .from("lote")
    .insert(lotesVencidos.map(({ _cantidad, _fecha, ...resto }) => resto))
    .select();
  if (errLotes) throw errLotes;

  lotesInsertados.forEach((l, i) => {
    movimientosVencidos.push({
      tipo: "recepcion",
      id_lote: l.id_lote,
      id_bodega_destino: l.id_bodega,
      cantidad: lotesVencidos[i]._cantidad,
      estado: "recepcionado_sin_reparos",
      observacion: "DEMO: lote de ejemplo ya vencido, para probar retiro",
      id_usuario: pick(idsUsuarios),
      fecha_movimiento: lotesVencidos[i]._fecha.toISOString(),
    });
  });
  const { error: errMov } = await admin.from("movimiento").insert(movimientosVencidos);
  if (errMov) throw errMov;
  console.log("lotes vencidos creados:", lotesInsertados.length);

  console.log("\n=== LISTO ===");
}

main().catch((err) => {
  console.error("ERROR:", err);
  process.exit(1);
});
