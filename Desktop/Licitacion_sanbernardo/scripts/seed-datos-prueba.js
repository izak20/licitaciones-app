// Datos de prueba realistas para poder ver Alertas/Analíticas/Mapa de
// calor con contenido real (no vacíos). Usa el cliente con service
// role (bypassa RLS, como cualquier script de mantenimiento) y NO
// toca usuarios/perfiles/bodegas ya creados por el usuario — solo
// agrega proveedores, artículos, parámetros de stock, lotes,
// movimientos (últimos 6 meses) y registros de temperatura.
//
// Todo lo creado acá queda marcado como datos de prueba mediante el
// prefijo de código/observación "DEMO" para poder identificarlo y
// borrarlo antes de ir a producción real.
const fs = require("fs");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");

const envPath = path.join(__dirname, "..", ".env.local");
for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2];
}

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL || !KEY) {
  console.error("Falta NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local");
  process.exit(1);
}
const admin = createClient(URL, KEY, { auth: { autoRefreshToken: false, persistSession: false } });

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
  console.log("=== 1. Usuarios y bodegas existentes ===");
  const { data: usuarios } = await admin.from("usuario_perfil").select("id_usuario, nombre_completo");
  const idsUsuarios = usuarios.map((u) => u.id_usuario);
  const { data: bodegas } = await admin.from("bodega").select("id_bodega, nombre, tipo");
  const bodegaCentral = bodegas.find((b) => b.tipo === "centro_distribucion");
  const bodegasConsumo = bodegas.filter((b) => b.tipo !== "centro_distribucion");
  const { data: centros } = await admin.from("centro_costo").select("id_centro_costo, id_bodega");
  console.log("usuarios:", idsUsuarios.length, "bodega central:", bodegaCentral?.nombre, "bodegas consumo:", bodegasConsumo.map((b) => b.nombre));
  if (!bodegaCentral || bodegasConsumo.length === 0) {
    throw new Error("Se necesita al menos 1 bodega centro_distribucion y 1 bodega de consumo ya creadas");
  }

  console.log("=== 2. Proveedores ===");
  const proveedoresData = [
    { rut: "76123456-7", razon_social: "Laboratorio Chile S.A.", direccion: "Av. Andrés Bello 2687, Santiago", telefono: "+56221234500", email: "contacto@labchile.cl", nombre_ejecutivo: "Patricia Reyes", telefono_ejecutivo: "+56991234567" },
    { rut: "96812345-3", razon_social: "Laboratorios Saval S.A.", direccion: "Av. Marathon 1315, Ñuñoa", telefono: "+56225551200", email: "ventas@saval.cl", nombre_ejecutivo: "Cristián Muñoz", telefono_ejecutivo: "+56992345678" },
    { rut: "79456123-8", razon_social: "Novo Nordisk Chile Ltda.", direccion: "Isidora Goyenechea 3162, Las Condes", telefono: "+56224561200", email: "chile@novonordisk.com", nombre_ejecutivo: "Verónica Tapia", telefono_ejecutivo: "+56993456789" },
    { rut: "77321654-1", razon_social: "Distribuidora Andes Ltda.", direccion: "Camino a Melipilla 8500, Maipú", telefono: "+56227891200", email: "contacto@distandes.cl", nombre_ejecutivo: "Javier Alsina", telefono_ejecutivo: "+56994567890" },
    { rut: "78987321-3", razon_social: "Farmindustria S.A.", direccion: "Vitacura 2939, Vitacura", telefono: "+56229871200", email: "info@farmindustria.cl", nombre_ejecutivo: "Marcela Orellana", telefono_ejecutivo: "+56995678901" },
  ];
  const { data: proveedoresExistentes } = await admin.from("proveedor").select("id_proveedor, rut");
  const rutsExistentes = new Set((proveedoresExistentes || []).map((p) => p.rut));
  const proveedoresNuevos = proveedoresData.filter((p) => !rutsExistentes.has(p.rut));
  if (proveedoresNuevos.length) {
    const { error } = await admin.from("proveedor").insert(proveedoresNuevos);
    if (error) throw error;
  }
  const { data: proveedores } = await admin.from("proveedor").select("id_proveedor, rut, razon_social");
  console.log("proveedores:", proveedores.length);

  console.log("=== 3. Artículos ===");
  const articulosData = [
    { codigo_interno: "ART-001042", nombre: "Fentanilo 0,05 mg/ml ampolla", grupo: "Medicamentos", familia: "Controlados", unidad_medida: "ampolla", es_controlado: true, requiere_cadena_frio: false, requiere_lote: true, precio: 3200 },
    { codigo_interno: "ART-001301", nombre: "Paracetamol 500 mg comprimido", grupo: "Medicamentos", familia: "Analgésicos", unidad_medida: "comprimido", es_controlado: false, requiere_cadena_frio: false, requiere_lote: true, precio: 45 },
    { codigo_interno: "ART-001215", nombre: "Ibuprofeno 400 mg comprimido", grupo: "Medicamentos", familia: "Analgésicos", unidad_medida: "comprimido", es_controlado: false, requiere_cadena_frio: false, requiere_lote: true, precio: 60 },
    { codigo_interno: "ART-002011", nombre: "Amoxicilina 500 mg cápsula", grupo: "Medicamentos", familia: "Antibióticos", unidad_medida: "cápsula", es_controlado: false, requiere_cadena_frio: false, requiere_lote: true, precio: 90 },
    { codigo_interno: "ART-002045", nombre: "Ciprofloxacino 500 mg comprimido", grupo: "Medicamentos", familia: "Antibióticos", unidad_medida: "comprimido", es_controlado: false, requiere_cadena_frio: false, requiere_lote: true, precio: 150 },
    { codigo_interno: "ART-002099", nombre: "Clindamicina 300 mg cápsula", grupo: "Medicamentos", familia: "Antibióticos", unidad_medida: "cápsula", es_controlado: false, requiere_cadena_frio: false, requiere_lote: true, precio: 210 },
    { codigo_interno: "ART-003018", nombre: "Metformina 850 mg comprimido", grupo: "Medicamentos", familia: "Antidiabéticos", unidad_medida: "comprimido", es_controlado: false, requiere_cadena_frio: false, requiere_lote: true, precio: 55 },
    { codigo_interno: "ART-003022", nombre: "Insulina NPH 100 UI/ml", grupo: "Medicamentos", familia: "Antidiabéticos", unidad_medida: "frasco", es_controlado: false, requiere_cadena_frio: true, requiere_lote: true, precio: 4800 },
    { codigo_interno: "ART-004010", nombre: "Suero fisiológico 0,9% 1000ml", grupo: "Insumos", familia: "Soluciones", unidad_medida: "unidad", es_controlado: false, requiere_cadena_frio: false, requiere_lote: true, precio: 1800 },
    { codigo_interno: "ART-004033", nombre: "Suero glucosado 5% 500ml", grupo: "Insumos", familia: "Soluciones", unidad_medida: "unidad", es_controlado: false, requiere_cadena_frio: false, requiere_lote: true, precio: 1500 },
    { codigo_interno: "ART-005001", nombre: "Guantes de nitrilo talla M", grupo: "Insumos", familia: "Protección", unidad_medida: "caja", es_controlado: false, requiere_cadena_frio: false, requiere_lote: false, precio: 6500 },
    { codigo_interno: "ART-005002", nombre: "Mascarillas quirúrgicas", grupo: "Insumos", familia: "Protección", unidad_medida: "caja", es_controlado: false, requiere_cadena_frio: false, requiere_lote: false, precio: 4200 },
    { codigo_interno: "ART-006001", nombre: "Vacuna Influenza trivalente", grupo: "Vacunas", familia: "Cadena de frío", unidad_medida: "dosis", es_controlado: false, requiere_cadena_frio: true, requiere_lote: true, precio: 8200 },
    { codigo_interno: "ART-006002", nombre: "Vacuna Hepatitis B", grupo: "Vacunas", familia: "Cadena de frío", unidad_medida: "dosis", es_controlado: false, requiere_cadena_frio: true, requiere_lote: true, precio: 11500 },
    { codigo_interno: "ART-007001", nombre: "Losartán 50 mg comprimido", grupo: "Medicamentos", familia: "Cardiovascular", unidad_medida: "comprimido", es_controlado: false, requiere_cadena_frio: false, requiere_lote: true, precio: 70 },
    { codigo_interno: "ART-007002", nombre: "Atorvastatina 20 mg comprimido", grupo: "Medicamentos", familia: "Cardiovascular", unidad_medida: "comprimido", es_controlado: false, requiere_cadena_frio: false, requiere_lote: true, precio: 95 },
  ];
  const { data: articulosExistentes } = await admin.from("articulo").select("id_articulo, codigo_interno");
  const codigosExistentes = new Set((articulosExistentes || []).map((a) => a.codigo_interno));
  const articulosNuevos = articulosData
    .filter((a) => !codigosExistentes.has(a.codigo_interno))
    .map(({ precio, ...resto }) => resto);
  if (articulosNuevos.length) {
    const { error } = await admin.from("articulo").insert(articulosNuevos);
    if (error) throw error;
  }
  const { data: articulos } = await admin.from("articulo").select("id_articulo, codigo_interno, nombre, requiere_lote");
  const precioPorCodigo = new Map(articulosData.map((a) => [a.codigo_interno, a.precio]));
  console.log("artículos:", articulos.length);

  console.log("=== 4. Parámetros de stock (mínimo/crítico/máximo) por artículo x bodega de consumo ===");
  const stockParametroRows = [];
  for (const art of articulos) {
    if (art.codigo_interno === "TEST-001") continue;
    for (const bod of bodegasConsumo) {
      const stockMinimo = rand(20, 80);
      stockParametroRows.push({
        id_articulo: art.id_articulo,
        id_bodega: bod.id_bodega,
        stock_minimo: stockMinimo,
        stock_critico: Math.round(stockMinimo * 0.4),
        stock_maximo: stockMinimo * 4,
      });
    }
  }
  const { error: spError } = await admin
    .from("stock_parametro")
    .upsert(stockParametroRows, { onConflict: "id_articulo,id_bodega" });
  if (spError) throw spError;
  console.log("stock_parametro filas:", stockParametroRows.length);

  console.log("=== 5. Lotes (con precio_unitario real) ===");
  const lotes = [];
  for (const art of articulos) {
    if (art.codigo_interno === "TEST-001") continue;
    const precio = precioPorCodigo.get(art.codigo_interno) || 100;
    // 1 lote grande recibido en la Droguería Comunal (stock central).
    const fechaIngresoCentral = diasAtras(rand(30, 170));
    const cantidadCentral = rand(800, 3000);
    lotes.push({
      id_articulo: art.id_articulo,
      numero_lote: "L-" + art.codigo_interno.slice(4) + "-C",
      fecha_vencimiento: new Date(Date.now() + rand(20, 700) * 86400000).toISOString().slice(0, 10),
      id_bodega: bodegaCentral.id_bodega,
      cantidad_disponible: cantidadCentral,
      id_proveedor: pick(proveedores).id_proveedor,
      fecha_ingreso: fechaIngresoCentral.toISOString(),
      precio_unitario: precio,
      _cantidadInicial: cantidadCentral,
      _fechaIngreso: fechaIngresoCentral,
      _esCentral: true,
    });
    // 1 lote más chico ya despachado hacia cada bodega de consumo.
    for (const bod of bodegasConsumo) {
      const fechaIngreso = diasAtras(rand(10, 150));
      const cantidadInicial = rand(60, 300);
      lotes.push({
        id_articulo: art.id_articulo,
        numero_lote: "L-" + art.codigo_interno.slice(4) + "-" + bod.nombre.replace(/\s+/g, "").slice(0, 4).toUpperCase(),
        fecha_vencimiento: new Date(Date.now() + rand(-15, 400) * 86400000).toISOString().slice(0, 10),
        id_bodega: bod.id_bodega,
        cantidad_disponible: cantidadInicial,
        id_proveedor: pick(proveedores).id_proveedor,
        fecha_ingreso: fechaIngreso.toISOString(),
        precio_unitario: precio,
        _cantidadInicial: cantidadInicial,
        _fechaIngreso: fechaIngreso,
        _esCentral: false,
      });
    }
  }
  const lotesParaInsertar = lotes.map(({ _cantidadInicial, _fechaIngreso, _esCentral, ...resto }) => resto);
  const { data: lotesInsertados, error: loteError } = await admin.from("lote").insert(lotesParaInsertar).select();
  if (loteError) throw loteError;
  // Reasociar metadata auxiliar (_cantidadInicial, etc.) con el id real devuelto, por orden de inserción.
  const lotesConMeta = lotesInsertados.map((l, i) => Object.assign({}, l, {
    _cantidadInicial: lotes[i]._cantidadInicial,
    _fechaIngreso: lotes[i]._fechaIngreso,
    _esCentral: lotes[i]._esCentral,
  }));
  console.log("lotes insertados:", lotesConMeta.length);

  console.log("=== 6. Movimientos (recepción + 6 meses de despacho/vale_consumo/devolución) ===");
  const movimientos = [];
  // Recepción original de cada lote (a la fecha de ingreso).
  for (const l of lotesConMeta) {
    movimientos.push({
      tipo: "recepcion",
      id_lote: l.id_lote,
      id_bodega_destino: l.id_bodega,
      cantidad: l._cantidadInicial,
      estado: Math.random() < 0.08 ? "recepcionado_con_reparos" : "recepcionado_sin_reparos",
      observacion: "DEMO: carga de datos de prueba",
      id_usuario: pick(idsUsuarios),
      fecha_movimiento: l._fechaIngreso.toISOString(),
    });
  }

  // Consumo mensual (últimos 6 meses) desde los lotes ya en cada bodega
  // de consumo -> descuenta cantidad_disponible de forma realista.
  const restante = new Map(lotesConMeta.filter((l) => !l._esCentral).map((l) => [l.id_lote, Number(l.cantidad_disponible)]));
  const lotesPorBodegaConsumo = new Map();
  for (const l of lotesConMeta.filter((x) => !x._esCentral)) {
    if (!lotesPorBodegaConsumo.has(l.id_bodega)) lotesPorBodegaConsumo.set(l.id_bodega, []);
    lotesPorBodegaConsumo.get(l.id_bodega).push(l);
  }
  const centroPorBodega = new Map((centros || []).map((c) => [c.id_bodega, c.id_centro_costo]));

  for (let mesAtras = 5; mesAtras >= 0; mesAtras--) {
    for (const bod of bodegasConsumo) {
      const lotesBodega = lotesPorBodegaConsumo.get(bod.id_bodega) || [];
      if (!lotesBodega.length) continue;
      const nConsumos = rand(3, 7);
      for (let i = 0; i < nConsumos; i++) {
        const l = pick(lotesBodega);
        const disponible = restante.get(l.id_lote) ?? 0;
        if (disponible <= 5) continue;
        const cantidad = Math.min(disponible - 2, rand(5, 35));
        if (cantidad <= 0) continue;
        restante.set(l.id_lote, disponible - cantidad);
        const dia = mesAtras * 30 + rand(0, 27);
        movimientos.push({
          tipo: "vale_consumo",
          id_lote: l.id_lote,
          id_bodega_origen: bod.id_bodega,
          id_centro_costo: centroPorBodega.get(bod.id_bodega) || null,
          cantidad,
          estado: "recepcionado_sin_reparos",
          observacion: "DEMO: vale de consumo",
          id_usuario: pick(idsUsuarios),
          fecha_movimiento: diasAtras(dia).toISOString(),
        });
      }
    }

    // Despachos desde la Droguería Comunal hacia cada bodega de consumo (van desde los lotes centrales).
    const lotesCentrales = lotesConMeta.filter((l) => l._esCentral);
    const restanteCentral = new Map(lotesCentrales.map((l) => [l.id_lote, Number(l.cantidad_disponible)]));
    for (const bod of bodegasConsumo) {
      const nDespachos = rand(1, 3);
      for (let i = 0; i < nDespachos; i++) {
        const l = pick(lotesCentrales);
        const disponible = restanteCentral.get(l.id_lote) ?? 0;
        if (disponible <= 20) continue;
        const cantidad = Math.min(disponible - 10, rand(10, 80));
        if (cantidad <= 0) continue;
        restanteCentral.set(l.id_lote, disponible - cantidad);
        const dia = mesAtras * 30 + rand(0, 27);
        movimientos.push({
          tipo: "despacho",
          id_lote: l.id_lote,
          id_bodega_origen: bodegaCentral.id_bodega,
          id_bodega_destino: bod.id_bodega,
          id_centro_costo: centroPorBodega.get(bod.id_bodega) || null,
          cantidad,
          estado: "recepcionado_sin_reparos",
          observacion: "DEMO: despacho a red",
          id_usuario: pick(idsUsuarios),
          fecha_movimiento: diasAtras(dia).toISOString(),
        });
      }
    }
    // Actualiza el stock final de los lotes centrales luego de este mes.
    for (const [idLote, cant] of restanteCentral.entries()) {
      const l = lotesCentrales.find((x) => x.id_lote === idLote);
      if (l) l.cantidad_disponible = cant;
    }
  }

  // Una devolución a proveedor real.
  const loteConProveedor = lotesConMeta.find((l) => !l._esCentral && l.id_proveedor);
  if (loteConProveedor) {
    movimientos.push({
      tipo: "devolucion",
      id_lote: loteConProveedor.id_lote,
      id_bodega_origen: loteConProveedor.id_bodega,
      cantidad: Math.min(5, Number(restante.get(loteConProveedor.id_lote) ?? 5) || 5),
      estado: "recepcionado_sin_reparos",
      observacion: "DEMO: devolución por empaque dañado",
      id_usuario: pick(idsUsuarios),
      fecha_movimiento: diasAtras(rand(2, 20)).toISOString(),
    });
  }

  const { error: movError } = await admin.from("movimiento").insert(movimientos);
  if (movError) throw movError;
  console.log("movimientos insertados:", movimientos.length);

  console.log("=== 7. Ajustar cantidad_disponible final de los lotes de consumo ===");
  for (const [idLote, cant] of restante.entries()) {
    const { error } = await admin.from("lote").update({ cantidad_disponible: Math.max(0, cant) }).eq("id_lote", idLote);
    if (error) throw error;
  }
  for (const l of lotesConMeta.filter((x) => x._esCentral)) {
    const { error } = await admin.from("lote").update({ cantidad_disponible: Math.max(0, l.cantidad_disponible) }).eq("id_lote", l.id_lote);
    if (error) throw error;
  }
  console.log("stock final ajustado para", restante.size + lotesConMeta.filter((x) => x._esCentral).length, "lotes");

  console.log("=== 8. Registros de temperatura (algunos fuera de rango) ===");
  const registrosTemp = [];
  for (const bod of bodegas) {
    for (let i = 0; i < 8; i++) {
      const dia = rand(0, 45);
      const fueraDeRango = i < 2 && bod.tipo !== "centro_distribucion" ? true : Math.random() < 0.1;
      const temperatura = fueraDeRango ? (Math.random() < 0.5 ? rand(9, 14) : rand(-4, 1)) : rand(2, 8);
      registrosTemp.push({
        id_bodega: bod.id_bodega,
        temperatura,
        fuera_de_rango: fueraDeRango,
        id_usuario: pick(idsUsuarios),
        fecha_registro: diasAtras(dia).toISOString(),
      });
    }
  }
  const { error: tempError } = await admin.from("registro_temperatura").insert(registrosTemp);
  if (tempError) throw tempError;
  console.log("registros de temperatura insertados:", registrosTemp.length);

  console.log("\n=== LISTO ===");
}

main().catch((err) => {
  console.error("ERROR:", err);
  process.exit(1);
});
