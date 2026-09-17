-- ============================================================
-- Soporte para 5.11 Exportación y seguridad. La tabla "exportacion"
-- ya existe desde la sección 2; falta el bucket donde queda el
-- archivo generado y la función que ejecuta el "Plan de salida"
-- (sección 6.4, aclaración N°18 del Foro).
-- ============================================================

insert into storage.buckets (id, name, public)
values ('exportaciones', 'exportaciones', false)
on conflict (id) do nothing;

create policy "exportaciones_bucket_insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'exportaciones'
    and fn_perfil_actual() in ('Administrador', 'Usuario Droguería')
  );

create policy "exportaciones_bucket_select" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'exportaciones'
    and fn_perfil_actual() in ('Administrador', 'Usuario Droguería')
  );

create policy "exportaciones_bucket_delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'exportaciones'
    and fn_perfil_actual() = 'Administrador'
  );

-- ============================================================
-- Plan de salida: eliminación segura (sección 6.4). Se ejecuta con
-- privilegios de definer porque debe poder borrar hasta la propia
-- log_auditoria, que por diseño (sección 3) no tiene política de
-- delete para nadie. La verificación de perfil queda DENTRO de la
-- función, no solo en RLS, porque RLS no alcanza a protegerla.
--
-- ADVERTENCIA: esta función borra permanentemente todos los datos de
-- negocio del proyecto. No se ejecuta como parte de ninguna prueba;
-- solo debe invocarse al finalizar el contrato (Plan de salida).
-- ============================================================
create or replace function fn_eliminacion_segura()
returns void as $$
begin
  if fn_perfil_actual() <> 'Administrador' then
    raise exception 'Solo un Administrador puede ejecutar la eliminación segura';
  end if;

  insert into log_auditoria (id_usuario, accion, entidad, id_entidad, valor_anterior, valor_nuevo)
  values (
    auth.uid(), 'ELIMINACION_SEGURA', 'sistema', null, null,
    jsonb_build_object(
      'fecha', now(),
      'mensaje', 'Plan de salida ejecutado: eliminación segura de todos los datos del proyecto'
    )
  );

  delete from notificacion;
  delete from orden_abastecimiento_linea;
  delete from toma_inventario_linea;
  delete from movimiento;
  delete from toma_inventario;
  delete from orden_abastecimiento;
  delete from registro_temperatura;
  delete from lote;
  delete from stock_parametro;
  delete from codigo_barra;
  delete from via_administracion;
  delete from articulo;
  delete from proveedor;
  delete from centro_costo;
  delete from exportacion;
  delete from usuario_perfil;
  delete from bodega;
  delete from perfil;
  delete from log_auditoria;
end;
$$ language plpgsql security definer;

grant execute on function fn_eliminacion_segura() to authenticated;
