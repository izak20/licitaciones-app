-- ============================================================
-- Cierra el circuito entre una solicitud de abastecimiento y el
-- traspaso físico que la despacha. El esquema original ya traía
-- movimiento.id_orden_abastecimiento y el estado 'despachada' en
-- orden_abastecimiento (001_schema.sql), pero nada los usaba todavía:
-- fn_crear_traspaso no aceptaba la orden de origen. Se agrega el
-- parámetro (con default null para no romper el traspaso manual que
-- ya existe) y se deja registrado en el movimiento que crea.
-- ============================================================
-- Postgres identifica una función por su firma de parámetros, así que
-- agregar un parámetro al final (aunque tenga default) no reemplaza
-- la versión anterior con "create or replace" — quedaría coexistiendo
-- como una sobrecarga aparte. Se elimina explícitamente la firma
-- vieja primero.
drop function if exists fn_crear_traspaso(uuid, uuid, uuid, numeric, text);

create or replace function fn_crear_traspaso(
  p_id_bodega_origen uuid,
  p_id_bodega_destino uuid,
  p_id_lote uuid,
  p_cantidad numeric,
  p_observacion text default null,
  p_id_orden_abastecimiento uuid default null
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

  insert into movimiento (tipo, id_lote, id_bodega_origen, id_bodega_destino, cantidad, estado, observacion, id_usuario, id_orden_abastecimiento)
  values ('traspaso', p_id_lote, p_id_bodega_origen, p_id_bodega_destino, p_cantidad, 'enviado', p_observacion, auth.uid(), p_id_orden_abastecimiento)
  returning movimiento.id_movimiento into v_id_movimiento;

  return query select v_id_movimiento;
end;
$$ language plpgsql security invoker;

grant execute on function fn_crear_traspaso(uuid, uuid, uuid, numeric, text, uuid) to authenticated;

-- 'generada' es el único estado al crear una orden hoy; se permite
-- actualizar a 'despachada' desde el endpoint de despacho (misma
-- policy de update ya existente para Administrador/Usuario Droguería,
-- sin cambios de RLS necesarios).
