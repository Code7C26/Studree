-- ============================================================================
-- Studree — 0009: Fase 14.1 (el Brote, mejoras de uso: "Mi estudio")
-- Spec: docs/superpowers/specs/2026-10-22-brote-mejoras-design.md
-- Modelo: docs/DB_SCHEMA.md · Seguridad: docs/03-security.md
--
-- ADITIVA e idempotente: no borra datos. Sin funciones nuevas (nada de
-- security definer).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. quiz_attempts: materia, carrera, título y detalle del examen (registro).
--    Los intentos viejos quedan con NULL en todo. Conserva quiz_attempts_owner.
-- ----------------------------------------------------------------------------

alter table quiz_attempts
  add column if not exists subject_id uuid references subjects(id) on delete cascade;

alter table quiz_attempts
  add column if not exists career_id uuid references careers(id) on delete cascade;

alter table quiz_attempts
  add column if not exists title text
    check (title is null or length(title) between 1 and 200);

alter table quiz_attempts
  add column if not exists detail jsonb
    check (detail is null or pg_column_size(detail) <= 262144);

create index if not exists quiz_attempts_user_created_idx
  on quiz_attempts (user_id, created_at desc);

-- ----------------------------------------------------------------------------
-- 2. Resúmenes guardados (Mi estudio). Sin update: un resumen se crea o se
--    borra. Políticas separadas de select, insert y delete.
-- ----------------------------------------------------------------------------

create table if not exists summaries (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  scope_type  text not null check (scope_type in ('sheet', 'subject', 'career', 'all')),
  scope_id    uuid,
  subject_id  uuid references subjects(id) on delete cascade,
  career_id   uuid references careers(id) on delete cascade,
  title       text not null check (length(title) between 1 and 200),
  external    boolean not null default false,
  sheet_count int not null default 0 check (sheet_count >= 0),
  total_sheets int not null default 0 check (total_sheets >= 0),
  content     jsonb not null check (pg_column_size(content) <= 262144),
  created_at  timestamptz not null default now()
);

create index if not exists summaries_user_created_idx
  on summaries (user_id, created_at desc);

alter table summaries enable row level security;

drop policy if exists summaries_select on summaries;
create policy summaries_select on summaries
  for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists summaries_insert on summaries;
create policy summaries_insert on summaries
  for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists summaries_delete on summaries;
create policy summaries_delete on summaries
  for delete to authenticated
  using (auth.uid() = user_id);

notify pgrst, 'reload schema';
