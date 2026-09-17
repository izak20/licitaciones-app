-- ============================================================
-- Row Level Security — sección 3 de la especificación
-- Aplica el patrón de la sección 3 (Administrador/Usuario Droguería/
-- Usuario Finanzas con visibilidad amplia, Cliente Interno restringido
-- a su propia bodega) a las 15 tablas, siguiendo la instrucción del
-- documento: "repetir para el resto de las tablas".
-- ============================================================

alter table perfil enable row level security;
alter table bodega enable row level security;
alter table usuario_perfil enable row level security;
alter table centro_costo enable row level security;
alter table articulo enable row level security;
alter table codigo_barra enable row level security;
alter table via_administracion enable row level security;
alter table proveedor enable row level security;
alter table stock_parametro enable row level security;
alter table lote enable row level security;
alter table movimiento enable row level security;
alter table orden_abastecimiento enable row level security;
alter table registro_temperatura enable row level security;
alter table log_auditoria enable row level security;
alter table exportacion enable row level security;

-- ============================================================
-- Funciones helper (exactas de la sección 3)
-- ============================================================
create or replace function fn_perfil_actual()
returns text as $$
  select p.nombre from usuario_perfil up
  join perfil p on p.id_perfil = up.id_perfil
  where up.id_usuario = auth.uid();
$$ language sql security definer stable;

create or replace function fn_bodega_actual()
returns uuid as $$
  select id_bodega from usuario_perfil where id_usuario = auth.uid();
$$ language sql security definer stable;

-- ============================================================
-- perfil: catalogo visible para todos, escritura solo Administrador
-- ============================================================
create policy "perfil_select" on perfil
  for select to authenticated using (true);
create policy "perfil_admin_write" on perfil
  for all to authenticated
  using (fn_perfil_actual() = 'Administrador')
  with check (fn_perfil_actual() = 'Administrador');

-- ============================================================
-- bodega: catalogo visible para todos, escritura Administrador/Droguería
-- ============================================================
create policy "bodega_select" on bodega
  for select to authenticated using (true);
create policy "bodega_admin_drogueria_write" on bodega
  for all to authenticated
  using (fn_perfil_actual() in ('Administrador','Usuario Droguería'))
  with check (fn_perfil_actual() in ('Administrador','Usuario Droguería'));

-- ============================================================
-- usuario_perfil: cada quien ve su propia fila; Administrador ve todo
-- ============================================================
create policy "usuario_perfil_select" on usuario_perfil
  for select to authenticated
  using (fn_perfil_actual() = 'Administrador' or id_usuario = auth.uid());
create policy "usuario_perfil_admin_insert" on usuario_perfil
  for insert to authenticated
  with check (fn_perfil_actual() = 'Administrador');
create policy "usuario_perfil_admin_update" on usuario_perfil
  for update to authenticated
  using (fn_perfil_actual() = 'Administrador')
  with check (fn_perfil_actual() = 'Administrador');
create policy "solo_admin_elimina_usuarios" on usuario_perfil
  for delete using (fn_perfil_actual() = 'Administrador');

-- ============================================================
-- centro_costo: catalogo visible para todos, escritura Administrador
-- ============================================================
create policy "centro_costo_select" on centro_costo
  for select to authenticated using (true);
create policy "centro_costo_admin_write" on centro_costo
  for all to authenticated
  using (fn_perfil_actual() = 'Administrador')
  with check (fn_perfil_actual() = 'Administrador');

-- ============================================================
-- articulo / codigo_barra / via_administracion: catalogo visible para
-- todos, escritura Administrador/Droguería
-- ============================================================
create policy "articulo_select" on articulo
  for select to authenticated using (true);
create policy "articulo_admin_drogueria_write" on articulo
  for all to authenticated
  using (fn_perfil_actual() in ('Administrador','Usuario Droguería'))
  with check (fn_perfil_actual() in ('Administrador','Usuario Droguería'));

create policy "codigo_barra_select" on codigo_barra
  for select to authenticated using (true);
create policy "codigo_barra_admin_drogueria_write" on codigo_barra
  for all to authenticated
  using (fn_perfil_actual() in ('Administrador','Usuario Droguería'))
  with check (fn_perfil_actual() in ('Administrador','Usuario Droguería'));

create policy "via_administracion_select" on via_administracion
  for select to authenticated using (true);
create policy "via_administracion_admin_drogueria_write" on via_administracion
  for all to authenticated
  using (fn_perfil_actual() in ('Administrador','Usuario Droguería'))
  with check (fn_perfil_actual() in ('Administrador','Usuario Droguería'));

-- ============================================================
-- proveedor: visible para back-office (Administrador/Droguería/
-- Finanzas), escritura Administrador/Droguería
-- ============================================================
create policy "proveedor_select_backoffice" on proveedor
  for select to authenticated
  using (fn_perfil_actual() in ('Administrador','Usuario Droguería','Usuario Finanzas'));
create policy "proveedor_admin_drogueria_write" on proveedor
  for all to authenticated
  using (fn_perfil_actual() in ('Administrador','Usuario Droguería'))
  with check (fn_perfil_actual() in ('Administrador','Usuario Droguería'));

-- ============================================================
-- stock_parametro / lote: back-office ve todo, Cliente Interno solo
-- su propia bodega
-- ============================================================
create policy "stock_parametro_select" on stock_parametro
  for select to authenticated
  using (
    fn_perfil_actual() in ('Administrador','Usuario Droguería','Usuario Finanzas')
    or id_bodega = fn_bodega_actual()
  );
create policy "stock_parametro_admin_drogueria_write" on stock_parametro
  for all to authenticated
  using (fn_perfil_actual() in ('Administrador','Usuario Droguería'))
  with check (fn_perfil_actual() in ('Administrador','Usuario Droguería'));

create policy "lote_select" on lote
  for select to authenticated
  using (
    fn_perfil_actual() in ('Administrador','Usuario Droguería','Usuario Finanzas')
    or id_bodega = fn_bodega_actual()
  );
create policy "lote_admin_drogueria_write" on lote
  for all to authenticated
  using (fn_perfil_actual() in ('Administrador','Usuario Droguería'))
  with check (fn_perfil_actual() in ('Administrador','Usuario Droguería'));

-- ============================================================
-- movimiento: politica exacta de la seccion 3, mas insert/update
-- acotados a la bodega propia para Cliente Interno
-- ============================================================
create policy "cliente_interno_ve_su_bodega" on movimiento
  for select using (
    fn_perfil_actual() in ('Administrador','Usuario Droguería','Usuario Finanzas')
    or id_bodega_destino = fn_bodega_actual()
    or id_bodega_origen = fn_bodega_actual()
  );
create policy "movimiento_insert" on movimiento
  for insert to authenticated
  with check (
    fn_perfil_actual() in ('Administrador','Usuario Droguería')
    or id_bodega_destino = fn_bodega_actual()
    or id_bodega_origen = fn_bodega_actual()
  );
create policy "movimiento_update" on movimiento
  for update to authenticated
  using (
    fn_perfil_actual() in ('Administrador','Usuario Droguería')
    or id_bodega_destino = fn_bodega_actual()
  )
  with check (
    fn_perfil_actual() in ('Administrador','Usuario Droguería')
    or id_bodega_destino = fn_bodega_actual()
  );
create policy "movimiento_admin_delete" on movimiento
  for delete to authenticated using (fn_perfil_actual() = 'Administrador');

-- ============================================================
-- orden_abastecimiento: back-office ve todo, Cliente Interno solo
-- sus propias solicitudes
-- ============================================================
create policy "orden_abastecimiento_select" on orden_abastecimiento
  for select to authenticated
  using (
    fn_perfil_actual() in ('Administrador','Usuario Droguería','Usuario Finanzas')
    or id_bodega_solicitante = fn_bodega_actual()
  );
create policy "orden_abastecimiento_insert" on orden_abastecimiento
  for insert to authenticated
  with check (
    fn_perfil_actual() in ('Administrador','Usuario Droguería')
    or id_bodega_solicitante = fn_bodega_actual()
  );
create policy "orden_abastecimiento_admin_drogueria_update" on orden_abastecimiento
  for update to authenticated
  using (fn_perfil_actual() in ('Administrador','Usuario Droguería'))
  with check (fn_perfil_actual() in ('Administrador','Usuario Droguería'));
create policy "orden_abastecimiento_admin_delete" on orden_abastecimiento
  for delete to authenticated using (fn_perfil_actual() = 'Administrador');

-- ============================================================
-- registro_temperatura: back-office ve todo, Cliente Interno solo
-- su propia bodega; solo Administrador corrige/elimina lecturas
-- ============================================================
create policy "registro_temperatura_select" on registro_temperatura
  for select to authenticated
  using (
    fn_perfil_actual() in ('Administrador','Usuario Droguería','Usuario Finanzas')
    or id_bodega = fn_bodega_actual()
  );
create policy "registro_temperatura_insert" on registro_temperatura
  for insert to authenticated
  with check (
    fn_perfil_actual() in ('Administrador','Usuario Droguería')
    or id_bodega = fn_bodega_actual()
  );
create policy "registro_temperatura_admin_update" on registro_temperatura
  for update to authenticated
  using (fn_perfil_actual() = 'Administrador')
  with check (fn_perfil_actual() = 'Administrador');
create policy "registro_temperatura_admin_delete" on registro_temperatura
  for delete to authenticated using (fn_perfil_actual() = 'Administrador');

-- ============================================================
-- log_auditoria: politica exacta de la seccion 3 (solo lectura, solo
-- Administrador). Sin insert/update/delete: solo el trigger
-- (security definer) escribe aqui.
-- ============================================================
create policy "log_auditoria_solo_lectura" on log_auditoria
  for select using (fn_perfil_actual() = 'Administrador');

-- ============================================================
-- exportacion: Administrador y Droguería generan/gestionan exportaciones
-- ============================================================
create policy "exportacion_select" on exportacion
  for select to authenticated
  using (fn_perfil_actual() in ('Administrador','Usuario Droguería'));
create policy "exportacion_insert" on exportacion
  for insert to authenticated
  with check (fn_perfil_actual() in ('Administrador','Usuario Droguería'));
create policy "exportacion_admin_update" on exportacion
  for update to authenticated
  using (fn_perfil_actual() = 'Administrador')
  with check (fn_perfil_actual() = 'Administrador');
create policy "exportacion_admin_delete" on exportacion
  for delete to authenticated using (fn_perfil_actual() = 'Administrador');
