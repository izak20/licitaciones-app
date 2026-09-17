-- ============================================================
-- Tomas de inventario (sección 5.6). El esquema de la sección 2 no
-- incluye ninguna tabla para esto (ni para sus líneas de conteo) —
-- son necesarias para que "iniciar toma" y "cargar conteo físico"
-- tengan dónde persistir su estado.
-- ============================================================
create table toma_inventario (
  id_toma uuid primary key default gen_random_uuid(),
  id_bodega uuid not null references bodega(id_bodega),
  alcance varchar(30) not null default 'total' check (alcance in ('total', 'grupo', 'familia', 'manual')),
  responsable varchar(150),
  segundo_verificador varchar(150),
  conteo_a_ciegas boolean not null default false,
  estado varchar(20) not null default 'abierta' check (estado in ('abierta', 'cerrada')),
  id_usuario uuid not null references auth.users(id),
  fecha_inicio timestamptz not null default now(),
  fecha_cierre timestamptz
);

create table toma_inventario_linea (
  id_linea uuid primary key default gen_random_uuid(),
  id_toma uuid not null references toma_inventario(id_toma) on delete cascade,
  id_lote uuid not null references lote(id_lote),
  cantidad_sistema numeric(14, 2) not null,
  cantidad_contada numeric(14, 2),
  diferencia numeric(14, 2) generated always as (cantidad_contada - cantidad_sistema) stored,
  observacion text
);
create index idx_toma_linea_toma on toma_inventario_linea(id_toma);

alter table toma_inventario enable row level security;
alter table toma_inventario_linea enable row level security;

create policy "toma_select" on toma_inventario
  for select to authenticated
  using (
    fn_perfil_actual() in ('Administrador', 'Usuario Droguería', 'Usuario Finanzas')
    or id_bodega = fn_bodega_actual()
  );
create policy "toma_write" on toma_inventario
  for all to authenticated
  using (
    fn_perfil_actual() in ('Administrador', 'Usuario Droguería')
    or id_bodega = fn_bodega_actual()
  )
  with check (
    fn_perfil_actual() in ('Administrador', 'Usuario Droguería')
    or id_bodega = fn_bodega_actual()
  );

create policy "toma_linea_select" on toma_inventario_linea
  for select to authenticated
  using (
    exists (
      select 1 from toma_inventario t
      where t.id_toma = toma_inventario_linea.id_toma
        and (
          fn_perfil_actual() in ('Administrador', 'Usuario Droguería', 'Usuario Finanzas')
          or t.id_bodega = fn_bodega_actual()
        )
    )
  );
create policy "toma_linea_write" on toma_inventario_linea
  for all to authenticated
  using (
    exists (
      select 1 from toma_inventario t
      where t.id_toma = toma_inventario_linea.id_toma
        and (
          fn_perfil_actual() in ('Administrador', 'Usuario Droguería')
          or t.id_bodega = fn_bodega_actual()
        )
    )
  )
  with check (
    exists (
      select 1 from toma_inventario t
      where t.id_toma = toma_inventario_linea.id_toma
        and (
          fn_perfil_actual() in ('Administrador', 'Usuario Droguería')
          or t.id_bodega = fn_bodega_actual()
        )
    )
  );
