-- ============================================================
-- Secuencia de folio único de despacho (sección 6.2: "generarlo en el
-- backend con una secuencia PostgreSQL, nunca en el frontend, para
-- evitar folios duplicados por condición de carrera")
-- ============================================================
create sequence if not exists seq_folio_despacho start 1;

-- ============================================================
-- Bucket de Storage para resoluciones sanitarias de proveedores
-- (especificación general N°9)
-- ============================================================
insert into storage.buckets (id, name, public)
values ('resoluciones-sanitarias', 'resoluciones-sanitarias', false)
on conflict (id) do nothing;

-- Solo Administrador y Usuario Droguería pueden subir documentos
create policy "resoluciones_sanitarias_insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'resoluciones-sanitarias'
    and fn_perfil_actual() in ('Administrador', 'Usuario Droguería')
  );

-- Back-office puede ver los documentos ya subidos
create policy "resoluciones_sanitarias_select" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'resoluciones-sanitarias'
    and fn_perfil_actual() in ('Administrador', 'Usuario Droguería', 'Usuario Finanzas')
  );

create policy "resoluciones_sanitarias_update" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'resoluciones-sanitarias'
    and fn_perfil_actual() in ('Administrador', 'Usuario Droguería')
  )
  with check (
    bucket_id = 'resoluciones-sanitarias'
    and fn_perfil_actual() in ('Administrador', 'Usuario Droguería')
  );

create policy "resoluciones_sanitarias_delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'resoluciones-sanitarias'
    and fn_perfil_actual() = 'Administrador'
  );
