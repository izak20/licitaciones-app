-- ============================================================
-- Folio único de despacho (sección 6.2): envuelve seq_folio_despacho
-- en un formato legible, generado siempre en el backend.
-- ============================================================
create or replace function fn_siguiente_folio_despacho()
returns text as $$
  select 'DESP-' || lpad(nextval('seq_folio_despacho')::text, 6, '0');
$$ language sql;

grant execute on function fn_siguiente_folio_despacho() to authenticated;

-- ============================================================
-- Traspaso entre bodegas (sección 6.2, regla N°16): descuenta del lote
-- de origen, agrega (o crea) el lote correspondiente en la bodega de
-- destino, e inserta el movimiento — todo en una sola transacción
-- (la función completa es atómica). Se ejecuta con los permisos de
-- quien llama (security invoker, el default) para que seguridad de
-- acceso a datos de la sección 3 se siga aplicando normalmente.
-- ============================================================
create or replace function fn_crear_traspaso(
  p_id_bodega_origen uuid,
  p_id_bodega_destino uuid,
  p_id_lote uuid,
  p_cantidad numeric,
  p_observacion text default null
)
returns table (id_movimiento uuid) as $$
declare
  v_articulo uuid;
  v_numero_lote varchar;
  v_fecha_vencimiento date;
  v_proveedor uuid;
  v_disponible numeric;
  v_lote_destino uuid;
  v_id_movimiento uuid;
begin
  select id_articulo, numero_lote, fecha_vencimiento, id_proveedor, cantidad_disponible
    into v_articulo, v_numero_lote, v_fecha_vencimiento, v_proveedor, v_disponible
  from lote
  where id_lote = p_id_lote
  for update;

  if not found then
    raise exception 'Lote no encontrado';
  end if;

  if v_disponible < p_cantidad then
    raise exception 'Stock insuficiente en el lote de origen';
  end if;

  update lote set cantidad_disponible = cantidad_disponible - p_cantidad
  where id_lote = p_id_lote;

  select id_lote into v_lote_destino
  from lote
  where id_articulo = v_articulo
    and numero_lote = v_numero_lote
    and id_bodega = p_id_bodega_destino
  for update;

  if v_lote_destino is null then
    insert into lote (id_articulo, numero_lote, fecha_vencimiento, id_bodega, cantidad_disponible, id_proveedor)
    values (v_articulo, v_numero_lote, v_fecha_vencimiento, p_id_bodega_destino, p_cantidad, v_proveedor)
    returning lote.id_lote into v_lote_destino;
  else
    update lote set cantidad_disponible = cantidad_disponible + p_cantidad
    where lote.id_lote = v_lote_destino;
  end if;

  insert into movimiento (tipo, id_lote, id_bodega_origen, id_bodega_destino, cantidad, estado, observacion, id_usuario)
  values ('traspaso', p_id_lote, p_id_bodega_origen, p_id_bodega_destino, p_cantidad, 'enviado', p_observacion, auth.uid())
  returning movimiento.id_movimiento into v_id_movimiento;

  return query select v_id_movimiento;
end;
$$ language plpgsql security invoker;

grant execute on function fn_crear_traspaso(uuid, uuid, uuid, numeric, text) to authenticated;
