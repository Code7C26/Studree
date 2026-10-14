-- ============================================================================
-- Studree — 0003: jerarquía de 3 niveles + links entre hojas + posiciones en lote
-- Fuente de verdad del modelo: docs/DB_SCHEMA.md (ADR-014, ADR-015, ADR-016).
--
-- Cómo aplicarlo (DESPUÉS de 0001 y 0002):
--   Supabase Dashboard → SQL Editor → pegar este archivo → Run.
--
-- Qué hace:
--   1. Las hojas pasan a colgar directo de la materia (`sheets.subject_id`).
--      `units` y `topics` quedan DEPRECADAS (sin UI): no se borran acá para no
--      perder nada; se eliminan en una migración posterior.
--   2. `updated_at` de las hojas solo cambia si cambia el título o el contenido
--      (mover un nodo no es "editar la hoja").
--   3. `sheet_links`: índice de los `[[links]]` entre hojas, DERIVADO del
--      Markdown por triggers (el Markdown sigue siendo la fuente de verdad).
--   4. `save_node_positions`: guarda las posiciones de muchos nodos en un solo
--      UPDATE (antes era un request por nodo).
--
-- Es idempotente: se puede correr más de una vez.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Hojas → materia (ADR-014)
-- ----------------------------------------------------------------------------

alter table sheets add column if not exists subject_id uuid references subjects(id) on delete cascade;

-- Backfill: cada hoja existente hereda la materia de su tema → unidad.
update sheets s
   set subject_id = u.subject_id
  from topics t
  join units u on u.id = t.unit_id
 where t.id = s.topic_id
   and s.subject_id is null;

alter table sheets alter column subject_id set not null;

-- `topic_id` queda como campo legado: nullable y SIN cascada (borrar un tema
-- viejo nunca puede borrar hojas).
alter table sheets alter column topic_id drop not null;
alter table sheets drop constraint if exists sheets_topic_id_fkey;
alter table sheets add constraint sheets_topic_id_fkey
  foreign key (topic_id) references topics(id) on delete set null;

-- Posición manual del nodo en el canvas de materia (ADR-012). NULL = dagre.
alter table sheets add column if not exists pos_x double precision;
alter table sheets add column if not exists pos_y double precision;

create index if not exists sheets_subject_id_idx on sheets (subject_id);

-- Títulos únicos por materia (sin distinguir mayúsculas): si no, un [[link]]
-- sería ambiguo.
create unique index if not exists sheets_subject_title_unique
  on sheets (subject_id, lower(trim(title)));

-- ----------------------------------------------------------------------------
-- 2. updated_at de hojas: solo por título o contenido
-- ----------------------------------------------------------------------------

drop trigger if exists sheets_set_updated_at on sheets;
create trigger sheets_set_updated_at
  before update on sheets
  for each row
  when (old.title is distinct from new.title or old.content_md is distinct from new.content_md)
  execute function set_updated_at();

-- ----------------------------------------------------------------------------
-- 3. sheet_links (ADR-015)
-- ----------------------------------------------------------------------------

create table if not exists sheet_links (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  source_id  uuid not null references sheets(id) on delete cascade, -- la hoja que escribe [[...]]
  target_id  uuid not null references sheets(id) on delete cascade, -- la hoja enlazada
  created_at timestamptz not null default now(),
  constraint no_self_link check (source_id <> target_id),
  unique (source_id, target_id)
);

create index if not exists sheet_links_source_idx on sheet_links (source_id);
create index if not exists sheet_links_target_idx on sheet_links (target_id);

alter table sheet_links enable row level security;

drop policy if exists sheet_links_owner on sheet_links;
create policy sheet_links_owner on sheet_links
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- 4. Derivar los links del Markdown
--
--    Sintaxis: [[Título de otra hoja]]. Se acepta también la forma escapada
--    \[\[Título\]\] (la que produce prosemirror-markdown). El título no puede
--    contener corchetes. Se resuelve dentro de la MISMA materia, sin distinguir
--    mayúsculas. Un link a un título que no existe no genera fila ("colgado").
--
--    SECURITY INVOKER: corre con los permisos de quien edita → RLS aplica.
--    `user_id` se copia de la hoja origen (no de auth.uid()) para que también
--    funcione desde el SQL Editor / backfill, donde auth.uid() es NULL.
-- ----------------------------------------------------------------------------

create or replace function refresh_sheet_links(p_sheet uuid)
returns void
language plpgsql
security invoker
set search_path = public
as $fn$
declare
  v_source sheets%rowtype;
begin
  select * into v_source from sheets where id = p_sheet;
  if not found then
    return;
  end if;

  delete from sheet_links where source_id = p_sheet;

  insert into sheet_links (user_id, source_id, target_id)
  select distinct v_source.user_id, v_source.id, t.id
    from (
      select lower(trim(
               regexp_replace(regexp_replace(m[1], '\\$', ''), '\\(.)', '\1', 'g')
             )) as title
        from regexp_matches(v_source.content_md, '\\?\[\\?\[([^][]+)\\?\]\\?\]', 'g') as m
    ) found
    join sheets t
      on t.subject_id = v_source.subject_id
     and lower(trim(t.title)) = found.title
   where t.id <> v_source.id
  on conflict (source_id, target_id) do nothing;
end;
$fn$;

-- Cambió el contenido (o se creó la hoja) → recalcular sus links salientes.
create or replace function sheets_after_content_change()
returns trigger
language plpgsql
security invoker
set search_path = public
as $fn$
begin
  perform refresh_sheet_links(new.id);
  return null;
end;
$fn$;

drop trigger if exists sheets_refresh_links on sheets;
create trigger sheets_refresh_links
  after insert or update of content_md on sheets
  for each row execute function sheets_after_content_change();

-- Cambió el título (o se creó la hoja):
--   a) rename → reescribir [[título viejo]] por [[título nuevo]] en las hojas
--      que la enlazaban (así el link no se rompe);
--   b) resolver los links "colgados" que ya mencionaban el título nuevo.
create or replace function sheets_after_title_change()
returns trigger
language plpgsql
security invoker
set search_path = public
as $fn$
declare
  v_old_pattern text;
  v_new_text    text;
  v_source      uuid;
begin
  if tg_op = 'UPDATE' and old.title is distinct from new.title then
    -- Escapa los caracteres especiales de regex del título viejo.
    v_old_pattern := regexp_replace(trim(old.title), '([][(){}.*+?^$|\\])', '\\\1', 'g');
    -- En el reemplazo, `\` es especial: se duplica.
    v_new_text := replace(trim(new.title), '\', '\\');

    update sheets s
       set content_md = regexp_replace(
             s.content_md,
             '\\?\[\\?\[\s*' || v_old_pattern || '\s*\\?\]\\?\]',
             '[[' || v_new_text || ']]',
             'gi'
           )
     where s.subject_id = new.subject_id
       and s.id <> new.id
       and s.id in (select source_id from sheet_links where target_id = new.id);
  end if;

  for v_source in
    select s.id
      from sheets s
     where s.subject_id = new.subject_id
       and s.id <> new.id
       and position(lower('[[' || trim(new.title) || ']]') in lower(s.content_md)) > 0
  loop
    perform refresh_sheet_links(v_source);
  end loop;

  return null;
end;
$fn$;

drop trigger if exists sheets_title_links on sheets;
create trigger sheets_title_links
  after insert or update of title on sheets
  for each row execute function sheets_after_title_change();

revoke all on function refresh_sheet_links(uuid) from public;
grant execute on function refresh_sheet_links(uuid) to authenticated;

-- ----------------------------------------------------------------------------
-- 5. Posiciones en lote (ADR-016)
--
--    Un solo UPDATE para todos los nodos movidos/"congelados" del canvas.
--    SECURITY INVOKER → RLS aplica (nadie mueve filas ajenas). Whitelist
--    estricta de tabla y columnas: el nombre de tabla viene del cliente y se
--    interpola en SQL dinámico, así que NUNCA se acepta otro valor.
-- ----------------------------------------------------------------------------

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
  if not (
       (p_table = 'subjects' and (p_x_column, p_y_column) in (('pos_x', 'pos_y'), ('map_x', 'map_y')))
    or (p_table = 'sheets'   and (p_x_column, p_y_column) = ('pos_x', 'pos_y'))
  ) then
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

revoke all on function save_node_positions(text, text, text, jsonb) from public;
grant execute on function save_node_positions(text, text, text, jsonb) to authenticated;

-- ----------------------------------------------------------------------------
-- 6. Backfill de links de las hojas existentes + recargar el esquema de la API
-- ----------------------------------------------------------------------------

select refresh_sheet_links(id) from sheets;

notify pgrst, 'reload schema';
