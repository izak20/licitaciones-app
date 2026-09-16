-- ============================================================
-- Esquema inicial — Sistema de Gestión de Droguería Comunal
-- CORSABER · PANALBIT SPA
-- Fuente: Especificacion_Backend_NextJS_Supabase.md, sección 2
-- Nota: el orden de creación de tablas fue reordenado respecto al
-- documento original para respetar las dependencias de FOREIGN KEY
-- (bodega debía crearse antes que usuario_perfil).
-- ============================================================

-- ============================================================
-- 1. PERFILES Y USUARIOS
-- ============================================================
create table perfil (
  id_perfil uuid primary key default gen_random_uuid(),
  nombre varchar(60) not null,           -- Administrador, Usuario Droguería, Usuario Finanzas, Cliente Interno
  permisos jsonb not null default '{}',
  activo boolean not null default true
);

-- ============================================================
-- 2. ESTRUCTURA ORGANIZACIONAL
-- ============================================================
create table bodega (
  id_bodega uuid primary key default gen_random_uuid(),
  nombre varchar(150) not null,
  tipo varchar(30) not null check (tipo in ('centro_distribucion','bodega','sub_bodega')),
  id_bodega_padre uuid references bodega(id_bodega),
  direccion varchar(200),
  requiere_cadena_frio boolean not null default false,
  activa boolean not null default true
);

-- Tabla de perfil de usuario, vinculada 1:1 con auth.users de Supabase
create table usuario_perfil (
  id_usuario uuid primary key references auth.users(id) on delete cascade,
  nombre_completo varchar(150) not null,
  id_perfil uuid not null references perfil(id_perfil),
  id_bodega uuid references bodega(id_bodega),   -- aplica a perfil Cliente Interno
  activo boolean not null default true,
  fecha_creacion timestamptz not null default now()
);

create table centro_costo (
  id_centro_costo uuid primary key default gen_random_uuid(),
  codigo varchar(20) unique not null,
  nombre varchar(150) not null,
  id_bodega uuid not null references bodega(id_bodega),
  activo boolean not null default true
);

-- ============================================================
-- 3. MAESTROS
-- ============================================================
create table articulo (
  id_articulo uuid primary key default gen_random_uuid(),
  codigo_interno varchar(30) unique not null,
  nombre varchar(200) not null,
  grupo varchar(80), familia varchar(80), subfamilia varchar(80),
  unidad_medida varchar(40),
  es_controlado boolean not null default false,        -- Ley 20.000
  requiere_cadena_frio boolean not null default false,
  requiere_lote boolean not null default true,
  condicion_almacenamiento varchar(120),
  registro_sanitario varchar(40),
  ubicacion varchar(80),
  activo boolean not null default true,
  creado_en timestamptz not null default now()
);

create table codigo_barra (
  id_codigo_barra uuid primary key default gen_random_uuid(),
  id_articulo uuid not null references articulo(id_articulo) on delete cascade,
  codigo varchar(50) not null
);

create table via_administracion (
  id_articulo uuid not null references articulo(id_articulo) on delete cascade,
  via varchar(40) not null check (via in ('Oral','Intravenosa','Intramuscular','Subcutánea','Inhalatoria','Rectal')),
  primary key (id_articulo, via)
);

create table proveedor (
  id_proveedor uuid primary key default gen_random_uuid(),
  rut varchar(12) unique not null,
  razon_social varchar(200) not null,
  direccion varchar(200), telefono varchar(30), email varchar(150),
  nombre_ejecutivo varchar(150), telefono_ejecutivo varchar(30),
  documento_adjunto_url text,          -- ruta en Supabase Storage (resolución sanitaria)
  activo boolean not null default true
);

create table stock_parametro (
  id_articulo uuid not null references articulo(id_articulo) on delete cascade,
  id_bodega uuid not null references bodega(id_bodega) on delete cascade,
  stock_minimo numeric(14,2) not null default 0,
  stock_maximo numeric(14,2) not null default 0,
  stock_critico numeric(14,2) not null default 0,
  primary key (id_articulo, id_bodega)
);

-- ============================================================
-- 4. TRAZABILIDAD (el núcleo del sistema)
-- ============================================================
create table lote (
  id_lote uuid primary key default gen_random_uuid(),
  id_articulo uuid not null references articulo(id_articulo),
  numero_lote varchar(50) not null,
  fecha_vencimiento date not null,
  id_bodega uuid not null references bodega(id_bodega),
  cantidad_disponible numeric(14,2) not null default 0,
  id_proveedor uuid references proveedor(id_proveedor),
  fecha_ingreso timestamptz not null default now()
);
create index idx_lote_articulo on lote(id_articulo);
create index idx_lote_vencimiento on lote(fecha_vencimiento);   -- soporta la alerta diaria de vencimiento

create table movimiento (
  id_movimiento uuid primary key default gen_random_uuid(),
  tipo varchar(30) not null check (tipo in
    ('recepcion','despacho','traspaso','devolucion','donacion','vale_consumo','ajuste')),
  id_lote uuid not null references lote(id_lote),
  id_bodega_origen uuid references bodega(id_bodega),
  id_bodega_destino uuid references bodega(id_bodega),
  id_centro_costo uuid references centro_costo(id_centro_costo),
  cantidad numeric(14,2) not null,
  estado varchar(40) not null default 'enviado' check (estado in
    ('enviado','en_transito','recepcionado_sin_reparos','recepcionado_con_reparos')),
  folio varchar(30) unique,
  id_orden_abastecimiento uuid,
  observacion text,
  id_usuario uuid not null references auth.users(id),
  fecha_movimiento timestamptz not null default now()
);
create index idx_movimiento_lote on movimiento(id_lote);
create index idx_movimiento_fecha on movimiento(fecha_movimiento);

create table orden_abastecimiento (
  id_orden uuid primary key default gen_random_uuid(),
  folio varchar(30) unique not null,
  origen varchar(30) not null check (origen in ('automatica_consumo','automatica_stock_minimo','solicitud')),
  id_bodega_solicitante uuid not null references bodega(id_bodega),
  estado varchar(30) not null default 'generada' check (estado in ('generada','aprobada','despachada','cerrada')),
  id_usuario uuid not null references auth.users(id),
  fecha_creacion timestamptz not null default now()
);

alter table movimiento
  add constraint fk_orden foreign key (id_orden_abastecimiento) references orden_abastecimiento(id_orden);

create table registro_temperatura (
  id_registro uuid primary key default gen_random_uuid(),
  id_bodega uuid not null references bodega(id_bodega),
  temperatura numeric(5,2) not null,
  fuera_de_rango boolean not null default false,
  id_usuario uuid not null references auth.users(id),
  fecha_registro timestamptz not null default now()
);

-- ============================================================
-- 5. AUDITORÍA Y CUMPLIMIENTO
-- ============================================================
create table log_auditoria (
  id_log bigserial primary key,
  id_usuario uuid references auth.users(id),
  accion varchar(60) not null,
  entidad varchar(60) not null,
  id_entidad uuid,
  valor_anterior jsonb,
  valor_nuevo jsonb,
  fecha_hora timestamptz not null default now()
);
create index idx_log_fecha on log_auditoria(fecha_hora);
create index idx_log_entidad on log_auditoria(entidad, id_entidad);

create table exportacion (
  id_exportacion uuid primary key default gen_random_uuid(),
  tipo varchar(30) not null check (tipo in ('trimestral','a_solicitud','final_contrato')),
  formato varchar(20) not null,
  id_usuario uuid not null references auth.users(id),
  fecha_generacion timestamptz not null default now(),
  ruta_archivo text
);

-- ============================================================
-- 2.1 Trigger obligatorio de auditoría
-- ============================================================
create or replace function fn_log_auditoria()
returns trigger as $$
begin
  insert into log_auditoria (id_usuario, accion, entidad, id_entidad, valor_anterior, valor_nuevo)
  values (
    auth.uid(),
    tg_op,
    tg_table_name,
    coalesce(new.id_movimiento, new.id_articulo, new.id_lote, old.id_movimiento, old.id_articulo, old.id_lote),
    case when tg_op = 'DELETE' or tg_op = 'UPDATE' then to_jsonb(old) else null end,
    case when tg_op = 'INSERT' or tg_op = 'UPDATE' then to_jsonb(new) else null end
  );
  return coalesce(new, old);
end;
$$ language plpgsql security definer;

create trigger trg_auditoria_movimiento after insert or update or delete on movimiento
  for each row execute function fn_log_auditoria();
create trigger trg_auditoria_articulo after insert or update or delete on articulo
  for each row execute function fn_log_auditoria();
create trigger trg_auditoria_lote after insert or update or delete on lote
  for each row execute function fn_log_auditoria();
create trigger trg_auditoria_proveedor after insert or update or delete on proveedor
  for each row execute function fn_log_auditoria();
create trigger trg_auditoria_usuario_perfil after insert or update or delete on usuario_perfil
  for each row execute function fn_log_auditoria();
create trigger trg_auditoria_orden_abastecimiento after insert or update or delete on orden_abastecimiento
  for each row execute function fn_log_auditoria();
create trigger trg_auditoria_registro_temperatura after insert or update or delete on registro_temperatura
  for each row execute function fn_log_auditoria();

-- ============================================================
-- 2.2 Alerta automática de excursión de temperatura
-- ============================================================
create or replace function fn_check_temperatura()
returns trigger as $$
begin
  if new.temperatura < 2 or new.temperatura > 8 then   -- ajustar rango real por bodega
    new.fuera_de_rango := true;
  end if;
  return new;
end;
$$ language plpgsql;

create trigger trg_temperatura before insert on registro_temperatura
  for each row execute function fn_check_temperatura();
