-- El usuario reportó que no existe ningún límite visible de
-- temperatura: el sistema marcaba "fuera de rango" usando un 2-8°C
-- fijo en el trigger (fn_check_temperatura, sección 2.2), sin mostrar
-- ese número en ningún lado de la pantalla y sin poder ajustarlo por
-- bodega — el propio comentario original ("ajustar rango real por
-- bodega") ya dejaba esto como pendiente.
--
-- Se agrega temp_minima/temp_maxima a bodega (igual al patrón ya
-- usado en stock_parametro para stock_minimo/stock_maximo): nulos por
-- defecto, así las bodegas existentes siguen usando el 2-8°C global
-- hasta que alguien les configure un rango propio.
alter table bodega
  add column if not exists temp_minima numeric(5, 2),
  add column if not exists temp_maxima numeric(5, 2);

comment on column bodega.temp_minima is 'Límite mínimo de temperatura (°C) antes de marcar fuera_de_rango. Nulo = usa el rango global (2-8°C).';
comment on column bodega.temp_maxima is 'Límite máximo de temperatura (°C) antes de marcar fuera_de_rango. Nulo = usa el rango global (2-8°C).';

-- El trigger ahora busca el rango de la bodega que recibió la
-- lectura; si no tiene uno configurado, cae al 2-8°C de siempre.
create or replace function fn_check_temperatura()
returns trigger as $$
declare
  v_min numeric;
  v_max numeric;
begin
  select coalesce(temp_minima, 2), coalesce(temp_maxima, 8)
    into v_min, v_max
    from bodega
    where id_bodega = new.id_bodega;

  if new.temperatura < v_min or new.temperatura > v_max then
    new.fuera_de_rango := true;
  end if;
  return new;
end;
$$ language plpgsql;
