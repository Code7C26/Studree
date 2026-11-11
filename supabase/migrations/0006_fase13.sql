-- ============================================================================
-- Studree — 0006: Fase 13 (papelera, adjuntos, plantillas)
-- Spec: docs/superpowers/specs/2026-10-15-fase-13-design.md
-- Modelo: docs/DB_SCHEMA.md · Seguridad: docs/03-security.md
--
-- ADITIVA e idempotente: no borra datos. Funciones nuevas: security invoker
-- (RLS aplica). Reutiliza set_updated_at() de la 0001.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Papelera: deleted_at (NULL = vivo)
-- ----------------------------------------------------------------------------

alter table careers  add column if not exists deleted_at timestamptz;
alter table subjects add column if not exists deleted_at timestamptz;
alter table sheets   add column if not exists deleted_at timestamptz;

create index if not exists careers_trashed_idx  on careers  (deleted_at) where deleted_at is not null;
create index if not exists subjects_trashed_idx on subjects (deleted_at) where deleted_at is not null;
create index if not exists sheets_trashed_idx   on sheets   (deleted_at) where deleted_at is not null;

-- Manda a la papelera una fila y sus descendientes VIVOS con UNA sola marca.
-- (El trigger de updated_at de sheets solo mira title/content_md: no se toca.)
create or replace function trash_item(p_table text, p_id uuid)
returns timestamptz
language plpgsql
security invoker
set search_path = public
as $$
declare
  -- clock_timestamp() y no now(): now() es la hora de inicio de la transacción y dos
  -- borrados dentro de la misma compartirían marca (y no se podrían distinguir al restaurar).
  v_at timestamptz := clock_timestamp();
begin
  if p_table = 'careers' then
    update careers set deleted_at = v_at where id = p_id and deleted_at is null;
    if not found then raise exception 'No se encontró la carrera.'; end if;
    update subjects set deleted_at = v_at where career_id = p_id and deleted_at is null;
    update sheets set deleted_at = v_at
      where deleted_at is null and subject_id in (select id from subjects where career_id = p_id);
  elsif p_table = 'subjects' then
    update subjects set deleted_at = v_at where id = p_id and deleted_at is null;
    if not found then raise exception 'No se encontró la materia.'; end if;
    update sheets set deleted_at = v_at where subject_id = p_id and deleted_at is null;
  elsif p_table = 'sheets' then
    update sheets set deleted_at = v_at where id = p_id and deleted_at is null;
    if not found then raise exception 'No se encontró la hoja.'; end if;
  else
    raise exception 'Tabla no permitida: %', p_table;
  end if;
  return v_at;
end;
$$;

-- Restaura una fila y SOLO los descendientes con su misma marca. Si un ancestro
-- está en la papelera, restaura solo ese ancestro (si no, lo restaurado no se vería).
create or replace function restore_item(p_table text, p_id uuid)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_at      timestamptz;
  v_subject uuid;
  v_career  uuid;
begin
  if p_table = 'careers' then
    select deleted_at into v_at from careers where id = p_id;
    if v_at is null then return; end if;
    update careers set deleted_at = null where id = p_id;
    update subjects set deleted_at = null where career_id = p_id and deleted_at = v_at;
    update sheets set deleted_at = null
      where deleted_at = v_at and subject_id in (select id from subjects where career_id = p_id);
  elsif p_table = 'subjects' then
    select deleted_at, career_id into v_at, v_career from subjects where id = p_id;
    if v_at is null then return; end if;
    update subjects set deleted_at = null where id = p_id;
    update sheets set deleted_at = null where subject_id = p_id and deleted_at = v_at;
    update careers set deleted_at = null where id = v_career and deleted_at is not null;
  elsif p_table = 'sheets' then
    select s.deleted_at, s.subject_id, sub.career_id into v_at, v_subject, v_career
      from sheets s join subjects sub on sub.id = s.subject_id where s.id = p_id;
    if v_at is null then return; end if;
    update sheets set deleted_at = null where id = p_id;
    update subjects set deleted_at = null where id = v_subject and deleted_at is not null;
    update careers set deleted_at = null where id = v_career and deleted_at is not null;
  else
    raise exception 'Tabla no permitida: %', p_table;
  end if;
end;
$$;

-- ----------------------------------------------------------------------------
-- 2. Adjuntos (solo en hojas). Siguen a su hoja: sin deleted_at propio.
-- ----------------------------------------------------------------------------

create table if not exists attachments (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid() references auth.users(id) on delete cascade,
  sheet_id     uuid not null references sheets(id) on delete cascade,
  name         text not null check (length(trim(name)) between 1 and 200),
  mime_type    text not null,
  size_bytes   bigint not null check (size_bytes between 1 and 20971520), -- 20 MB
  storage_path text not null unique,
  created_at   timestamptz not null default now()
);

create index if not exists attachments_sheet_idx on attachments (sheet_id, created_at);

alter table attachments enable row level security;

drop policy if exists attachments_owner on attachments;
create policy attachments_owner on attachments
  for all to authenticated
  using (auth.uid() = user_id)
  -- La hoja tiene que ser del usuario (el select de sheets ya pasa por su RLS).
  with check (auth.uid() = user_id and exists (select 1 from sheets where sheets.id = sheet_id));

-- Bucket PRIVADO. Ruta: <user_id>/<attachment_id>/<nombre>.
insert into storage.buckets (id, name, public, file_size_limit)
values ('attachments', 'attachments', false, 20971520)
on conflict (id) do update set public = false, file_size_limit = 20971520;

drop policy if exists attachments_objects_select on storage.objects;
create policy attachments_objects_select on storage.objects
  for select to authenticated
  using (bucket_id = 'attachments' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists attachments_objects_insert on storage.objects;
create policy attachments_objects_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'attachments' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists attachments_objects_update on storage.objects;
create policy attachments_objects_update on storage.objects
  for update to authenticated
  using (bucket_id = 'attachments' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'attachments' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists attachments_objects_delete on storage.objects;
create policy attachments_objects_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'attachments' and (storage.foldername(name))[1] = auth.uid()::text);

-- ----------------------------------------------------------------------------
-- 3. Papelera: listados (después de attachments, que usan)
-- ----------------------------------------------------------------------------

-- Elementos "de primer nivel": los que no tienen un padre marcado con la misma fecha.
create or replace function list_trash()
returns table (
  kind text, id uuid, deleted_at timestamptz, label text, sheet_created_at timestamptz,
  career_name text, subject_name text, subjects_count int, sheets_count int, attachments_count int
)
language sql
stable
security invoker
set search_path = public
as $$
  select 'career'::text, c.id, c.deleted_at, c.name, null::timestamptz, null::text, null::text,
    (select count(*)::int from subjects s where s.career_id = c.id and s.deleted_at = c.deleted_at),
    (select count(*)::int from sheets h join subjects s on s.id = h.subject_id
       where s.career_id = c.id and h.deleted_at = c.deleted_at),
    (select count(*)::int from attachments a join sheets h on h.id = a.sheet_id join subjects s on s.id = h.subject_id
       where s.career_id = c.id and h.deleted_at = c.deleted_at)
  from careers c
  where c.deleted_at is not null
  union all
  select 'subject'::text, s.id, s.deleted_at, s.name, null::timestamptz, c.name, null::text, 0,
    (select count(*)::int from sheets h where h.subject_id = s.id and h.deleted_at = s.deleted_at),
    (select count(*)::int from attachments a join sheets h on h.id = a.sheet_id
       where h.subject_id = s.id and h.deleted_at = s.deleted_at)
  from subjects s join careers c on c.id = s.career_id
  where s.deleted_at is not null and c.deleted_at is distinct from s.deleted_at
  union all
  select 'sheet'::text, h.id, h.deleted_at, left(h.content_md, 300), h.created_at, c.name, s.name, 0, 0,
    (select count(*)::int from attachments a where a.sheet_id = h.id)
  from sheets h join subjects s on s.id = h.subject_id join careers c on c.id = s.career_id
  where h.deleted_at is not null and s.deleted_at is distinct from h.deleted_at
  order by 3 desc
$$;

create or replace function list_expired_trash(p_days int default 30)
returns table (kind text, id uuid)
language sql
stable
security invoker
set search_path = public
as $$
  select t.kind, t.id from list_trash() t where t.deleted_at < clock_timestamp() - make_interval(days => p_days)
$$;

-- Rutas de Storage de todos los adjuntos que cuelgan de un elemento (para borrarlos
-- con la API de Storage ANTES de borrar las filas).
create or replace function attachment_paths_for(p_kind text, p_id uuid)
returns setof text
language sql
stable
security invoker
set search_path = public
as $$
  select a.storage_path from attachments a
  join sheets h on h.id = a.sheet_id
  join subjects s on s.id = h.subject_id
  where (p_kind = 'sheet' and h.id = p_id)
     or (p_kind = 'subject' and s.id = p_id)
     or (p_kind = 'career' and s.career_id = p_id)
$$;

-- ----------------------------------------------------------------------------
-- 4. Plantillas de hoja (las de fábrica viven en el código)
-- ----------------------------------------------------------------------------

create table if not exists sheet_templates (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name       text not null check (length(trim(name)) between 1 and 60),
  content_md text not null check (length(content_md) between 1 and 20000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists sheet_templates_user_idx on sheet_templates (user_id, created_at);

drop trigger if exists sheet_templates_set_updated_at on sheet_templates;
create trigger sheet_templates_set_updated_at
  before update on sheet_templates
  for each row execute function set_updated_at();

alter table sheet_templates enable row level security;

drop policy if exists sheet_templates_owner on sheet_templates;
create policy sheet_templates_owner on sheet_templates
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

notify pgrst, 'reload schema';
