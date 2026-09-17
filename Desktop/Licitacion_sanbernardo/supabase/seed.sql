-- ============================================================
-- seed.sql — Datos base de puesta en marcha (sección 8, punto 3)
-- Especificación general N°6: sembrar la tabla perfil con los 4
-- valores exactos. Estructura de bodegas y centros de costo de
-- prueba para la demo.
--
-- Idempotente: cada insert usa "where not exists" por nombre/código,
-- así se puede volver a ejecutar sin duplicar filas (útil porque el
-- proyecto ya tiene datos de prueba de la verificación de RLS).
-- ============================================================

-- ============================================================
-- 1. Perfiles (Anexo N°4, especificación general N°6: 4 perfiles mínimo)
-- ============================================================
insert into perfil (nombre)
select v.nombre from (values
  ('Administrador'),
  ('Usuario Droguería'),
  ('Usuario Finanzas'),
  ('Cliente Interno')
) as v(nombre)
where not exists (select 1 from perfil p where p.nombre = v.nombre);

-- ============================================================
-- 2. Estructura de bodegas: Droguería Comunal (centro de distribución)
-- + centros de salud de prueba para la demo
-- ============================================================
insert into bodega (nombre, tipo, requiere_cadena_frio)
select v.nombre, v.tipo, v.requiere_cadena_frio from (values
  ('Droguería Comunal', 'centro_distribucion', true),
  ('CESFAM Prueba', 'bodega', true),
  ('CESFAM Otro', 'bodega', true),
  ('CESFAM Demo Tres', 'bodega', true)
) as v(nombre, tipo, requiere_cadena_frio)
where not exists (select 1 from bodega b where b.nombre = v.nombre);

-- ============================================================
-- 3. Centros de costo de prueba (5), asociados a las bodegas anteriores
-- ============================================================
insert into centro_costo (codigo, nombre, id_bodega)
select v.codigo, v.nombre, b.id_bodega
from (values
  ('CC-001', 'Farmacia CESFAM Prueba', 'CESFAM Prueba'),
  ('CC-002', 'Consultorio CESFAM Prueba', 'CESFAM Prueba'),
  ('CC-003', 'Farmacia CESFAM Otro', 'CESFAM Otro'),
  ('CC-004', 'Bodega Droguería Comunal', 'Droguería Comunal'),
  ('CC-005', 'Administración CESFAM Demo Tres', 'CESFAM Demo Tres')
) as v(codigo, nombre, bodega_nombre)
join bodega b on b.nombre = v.bodega_nombre
where not exists (select 1 from centro_costo c where c.codigo = v.codigo);
