-- ============================================================
-- Precio unitario en lote (soporta valorización real de consumo/gasto)
-- ============================================================
-- El modal de recepción ya pedía "Precio unitario" pero nunca se
-- guardaba: no existía la columna. Sin esto no hay forma real de
-- calcular gasto por bodega/centro de costo (todo era un número de
-- ejemplo fijo en el frontend). Los lotes recibidos antes de este
-- cambio quedan con precio_unitario = null (se muestran como "sin
-- dato" en los reportes, nunca se inventa un valor).
alter table lote add column if not exists precio_unitario numeric(14,2);
