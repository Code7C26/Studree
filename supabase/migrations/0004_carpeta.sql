-- ============================================================================
-- Studree — 0004: La Carpeta (ADR-017)
-- Fuente de verdad del modelo: docs/DB_SCHEMA.md.
--
-- Cómo aplicarlo (DESPUÉS de 0001, 0002 y 0003):
--   Supabase Dashboard → SQL Editor → pegar este archivo → Run.
--
-- Qué hace:
--   1. Las hojas dejan de tener título: cada título existente pasa a ser el
--      primer tema (`# título`) de su contenido, así no se pierde nada y los
--      [[título]] ya escritos siguen resolviendo (ahora apuntan a temas).
--   2. Se elimina `sheet_links` con sus triggers y funciones (ADR-015
--      derogado): los links se resuelven en el cliente contra los temas.
--   3. Se eliminan las tablas viejas `units` y `topics` (deprecadas desde la
--      0003) y las columnas que quedaron sin uso.
--   4. `save_node_positions` queda solo para el canvas de carrera.
--
-- ⚠️ DESTRUCTIVA (autorizada por el usuario el 2026-10-14). Lo que se borra es
--    derivado (`sheet_links`) o ya no tiene UI (`units`, `topics`, posiciones).
-- ============================================================================

-- 1. Links derivados (ADR-015 derogado por ADR-017). VA PRIMERO: los triggers
--    de la 0003 reaccionan a cambios de título/contenido y, al poner el título
--    en NULL, el de rename reescribía el contenido de otras hojas a NULL.
drop trigger if exists sheets_refresh_links on sheets;
drop trigger if exists sheets_title_links on sheets;
drop function if exists sheets_after_content_change();
drop function if exists sheets_after_title_change();
drop function if exists refresh_sheet_links(uuid);
drop table if exists sheet_links;

-- 2. Títulos → primer tema del contenido.
update sheets
   set content_md = '# ' || trim(title) || case when content_md = '' then '' else E'\n\n' || content_md end
 where title is not null and length(trim(title)) > 0;

-- 3. Título opcional y vacío (las hojas se identifican por su fecha).
drop index if exists sheets_subject_title_unique;
alter table sheets drop constraint if exists sheets_title_check;
alter table sheets alter column title drop not null;
update sheets set title = null;

-- 4. Jerarquía vieja y columnas sin uso.
alter table sheets drop column if exists topic_id;
drop table if exists topics;
drop table if exists units;
alter table sheets drop column if exists pos_x;
alter table sheets drop column if exists pos_y;
alter table subjects drop column if exists map_x;
alter table subjects drop column if exists map_y;

-- 5. Posiciones en lote: solo el canvas de carrera (ADR-016).
create or replace function save_node_positions(
  p_table    text,
  p_x_column text,
  p_y_column text,
  p_moves    jsonb  -- [{ "id": uuid, "x": number, "y": number }, ...]
)
returns void
language plpgsql
security invoker
set search_path = public
as $fn$
begin
  if not (p_table = 'subjects' and p_x_column = 'pos_x' and p_y_column = 'pos_y') then
    raise exception 'save_node_positions: tabla o columnas no permitidas (%: %, %)', p_table, p_x_column, p_y_column;
  end if;

  execute format(
    'update %I as t set %I = m.x, %I = m.y
       from jsonb_to_recordset($1) as m(id uuid, x double precision, y double precision)
      where t.id = m.id',
    p_table, p_x_column, p_y_column
  ) using p_moves;
end;
$fn$;

-- 6. Orden de la carpeta (cronológico).
create index if not exists sheets_subject_created_idx on sheets (subject_id, created_at);

notify pgrst, 'reload schema';
