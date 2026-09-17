-- ============================================================
-- Soporte para 5.7 Abastecimiento, 5.8 Despachos y recepción, y
-- 5.10 Farmacia. El esquema original (sección 2) trae la cabecera
-- orden_abastecimiento pero no sus líneas, y la sección 6.2 exige
-- notificaciones Realtime y una vista agregada de stock que tampoco
-- estaban creadas — se agregan aquí como gap de esquema, igual que
-- se hizo con toma_inventario en 005.
-- ============================================================

create table orden_abastecimiento_linea (
  id_linea uuid primary key default gen_random_uuid(),
  id_orden uuid not null references orden_abastecimiento(id_orden) on delete cascade,
  id_articulo uuid not null references articulo(id_articulo),
  cantidad_solicitada numeric(14,2) not null,
  cantidad_aprobada numeric(14,2),
  observacion text
);
create index idx_orden_linea_orden on orden_abastecimiento_linea(id_orden);

-- ============================================================
-- Centro de notificaciones (sección 6.2: "Aviso automático de
-- recepción con diferencias"). El frontend se suscribe vía Supabase
-- Realtime a inserts sobre esta tabla.
-- ============================================================
create table notificacion (
  id_notificacion uuid primary key default gen_random_uuid(),
  tipo varchar(40) not null,
  mensaje text not null,
  id_movimiento uuid references movimiento(id_movimiento),
  id_bodega uuid references bodega(id_bodega),
  leida boolean not null default false,
  id_usuario uuid references auth.users(id),
  fecha_creacion timestamptz not null default now()
);
create index idx_notificacion_bodega on notificacion(id_bodega);

alter table orden_abastecimiento_linea enable row level security;
alter table notificacion enable row level security;

create policy "orden_abastecimiento_linea_select" on orden_abastecimiento_linea
  for select to authenticated
  using (
    exists (
      select 1 from orden_abastecimiento oa
      where oa.id_orden = orden_abastecimiento_linea.id_orden
        and (
          fn_perfil_actual() in ('Administrador','Usuario Droguería','Usuario Finanzas')
          or oa.id_bodega_solicitante = fn_bodega_actual()
        )
    )
  );
create policy "orden_abastecimiento_linea_insert" on orden_abastecimiento_linea
  for insert to authenticated
  with check (
    exists (
      select 1 from orden_abastecimiento oa
      where oa.id_orden = orden_abastecimiento_linea.id_orden
        and (
          fn_perfil_actual() in ('Administrador','Usuario Droguería')
          or oa.id_bodega_solicitante = fn_bodega_actual()
        )
    )
  );
create policy "orden_abastecimiento_linea_update" on orden_abastecimiento_linea
  for update to authenticated
  using (
    exists (
      select 1 from orden_abastecimiento oa
      where oa.id_orden = orden_abastecimiento_linea.id_orden
        and (
          fn_perfil_actual() in ('Administrador','Usuario Droguería')
          or oa.id_bodega_solicitante = fn_bodega_actual()
        )
    )
  )
  with check (
    exists (
      select 1 from orden_abastecimiento oa
      where oa.id_orden = orden_abastecimiento_linea.id_orden
        and (
          fn_perfil_actual() in ('Administrador','Usuario Droguería')
          or oa.id_bodega_solicitante = fn_bodega_actual()
        )
    )
  );
create policy "orden_abastecimiento_linea_delete" on orden_abastecimiento_linea
  for delete to authenticated
  using (
    exists (
      select 1 from orden_abastecimiento oa
      where oa.id_orden = orden_abastecimiento_linea.id_orden
        and (
          fn_perfil_actual() in ('Administrador','Usuario Droguería')
          or oa.id_bodega_solicitante = fn_bodega_actual()
        )
    )
  );

create policy "notificacion_select" on notificacion
  for select to authenticated
  using (
    fn_perfil_actual() in ('Administrador','Usuario Droguería','Usuario Finanzas')
    or id_bodega = fn_bodega_actual()
  );
create policy "notificacion_insert" on notificacion
  for insert to authenticated
  with check (
    fn_perfil_actual() in ('Administrador','Usuario Droguería')
    or id_bodega = fn_bodega_actual()
  );
create policy "notificacion_update_leida" on notificacion
  for update to authenticated
  using (
    fn_perfil_actual() in ('Administrador','Usuario Droguería','Usuario Finanzas')
    or id_bodega = fn_bodega_actual()
  )
  with check (
    fn_perfil_actual() in ('Administrador','Usuario Droguería','Usuario Finanzas')
    or id_bodega = fn_bodega_actual()
  );

-- ============================================================
-- Vista de stock por artículo con desglose de lotes (sección 6.1,
-- regla N°17). security_invoker para que la RLS de "lote" se siga
-- aplicando según quién consulta la vista, no según su dueño.
-- ============================================================
create view v_stock_por_articulo
  with (security_invoker = true) as
select
  l.id_articulo,
  a.codigo_interno,
  a.nombre as articulo_nombre,
  l.id_bodega,
  b.nombre as bodega_nombre,
  sum(l.cantidad_disponible) as stock_total,
  jsonb_agg(
    jsonb_build_object(
      'id_lote', l.id_lote,
      'numero_lote', l.numero_lote,
      'fecha_vencimiento', l.fecha_vencimiento,
      'cantidad_disponible', l.cantidad_disponible
    ) order by l.fecha_vencimiento
  ) filter (where l.cantidad_disponible > 0) as lotes
from lote l
join articulo a on a.id_articulo = l.id_articulo
join bodega b on b.id_bodega = l.id_bodega
group by l.id_articulo, a.codigo_interno, a.nombre, l.id_bodega, b.nombre;

-- ============================================================
-- Folio único de orden de abastecimiento, mismo patrón que el folio
-- de despacho (sección 6.2).
-- ============================================================
create sequence seq_folio_orden;

create or replace function fn_siguiente_folio_orden()
returns text as $$
  select 'ORD-' || lpad(nextval('seq_folio_orden')::text, 6, '0');
$$ language sql;

grant execute on function fn_siguiente_folio_orden() to authenticated;

-- ============================================================
-- Órdenes de abastecimiento automáticas (sección 6.2): por stock
-- mínimo (compara contra stock_parametro) o por consumo (promedio de
-- despachos/vales de los últimos 3 meses). El modo "solicitud" no pasa
-- por esta función: sus líneas las arma directamente quien la pide.
-- security invoker para que la RLS de cada tabla se siga aplicando.
-- ============================================================
create or replace function fn_generar_orden_automatica(
  p_modo text,
  p_id_bodega uuid
)
returns uuid as $$
declare
  v_id_orden uuid;
  v_folio text;
begin
  if p_modo not in ('automatica_consumo', 'automatica_stock_minimo') then
    raise exception 'Modo no soportado por fn_generar_orden_automatica: %', p_modo;
  end if;

  select fn_siguiente_folio_orden() into v_folio;

  insert into orden_abastecimiento (folio, origen, id_bodega_solicitante, estado, id_usuario)
  values (v_folio, p_modo, p_id_bodega, 'generada', auth.uid())
  returning id_orden into v_id_orden;

  if p_modo = 'automatica_stock_minimo' then
    insert into orden_abastecimiento_linea (id_orden, id_articulo, cantidad_solicitada)
    select
      v_id_orden,
      sp.id_articulo,
      sp.stock_maximo - coalesce(v.stock_total, 0)
    from stock_parametro sp
    left join v_stock_por_articulo v
      on v.id_articulo = sp.id_articulo and v.id_bodega = sp.id_bodega
    where sp.id_bodega = p_id_bodega
      and coalesce(v.stock_total, 0) < sp.stock_minimo
      and sp.stock_maximo > coalesce(v.stock_total, 0);
  elsif p_modo = 'automatica_consumo' then
    insert into orden_abastecimiento_linea (id_orden, id_articulo, cantidad_solicitada)
    select
      v_id_orden,
      consumo.id_articulo,
      round(consumo.promedio_mensual - coalesce(v.stock_total, 0), 2)
    from (
      select
        l.id_articulo,
        sum(m.cantidad) / 3.0 as promedio_mensual
      from movimiento m
      join lote l on l.id_lote = m.id_lote
      where m.id_bodega_origen = p_id_bodega
        and m.tipo in ('despacho', 'vale_consumo')
        and m.fecha_movimiento >= now() - interval '3 months'
      group by l.id_articulo
    ) consumo
    left join v_stock_por_articulo v
      on v.id_articulo = consumo.id_articulo and v.id_bodega = p_id_bodega
    where consumo.promedio_mensual > coalesce(v.stock_total, 0);
  end if;

  return v_id_orden;
end;
$$ language plpgsql security invoker;

grant execute on function fn_generar_orden_automatica(text, uuid) to authenticated;
