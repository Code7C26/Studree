-- ============================================================================
-- Studree — 0005: Inicio útil (fechas importantes, tareas, notas rápidas)
-- Modelo: docs/DB_SCHEMA.md · Feature: docs/features/home.md
-- Seguridad: docs/03-security.md (RLS obligatorio en cada tabla).
--
-- Idempotente: se puede correr más de una vez.
-- No crea funciones nuevas: reutiliza set_updated_at() de la 0001.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Tablas
-- ----------------------------------------------------------------------------

create table if not exists important_dates (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title      text not null check (length(trim(title)) between 1 and 120),
  date       date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists tasks (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  text       text not null check (length(trim(text)) between 1 and 300),
  due_date   date,          -- opcional
  done_at    timestamptz,   -- NULL = pendiente
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists quick_notes (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  body       text not null check (length(trim(body)) between 1 and 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists important_dates_user_date_idx on important_dates (user_id, date);
create index if not exists tasks_user_done_due_idx on tasks (user_id, done_at, due_date);
create index if not exists quick_notes_user_created_idx on quick_notes (user_id, created_at);

-- ----------------------------------------------------------------------------
-- 2. updated_at automático (función de la 0001)
-- ----------------------------------------------------------------------------

drop trigger if exists important_dates_set_updated_at on important_dates;
create trigger important_dates_set_updated_at
  before update on important_dates
  for each row execute function set_updated_at();

drop trigger if exists tasks_set_updated_at on tasks;
create trigger tasks_set_updated_at
  before update on tasks
  for each row execute function set_updated_at();

drop trigger if exists quick_notes_set_updated_at on quick_notes;
create trigger quick_notes_set_updated_at
  before update on quick_notes
  for each row execute function set_updated_at();

-- ----------------------------------------------------------------------------
-- 3. Row Level Security (OBLIGATORIO)
--    La anon key es pública: lo único que separa los datos de cada usuario son
--    estas políticas. Sin sesión auth.uid() es NULL y no se ve ni inserta nada.
-- ----------------------------------------------------------------------------

alter table important_dates enable row level security;
alter table tasks           enable row level security;
alter table quick_notes     enable row level security;

drop policy if exists important_dates_owner on important_dates;
create policy important_dates_owner on important_dates
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists tasks_owner on tasks;
create policy tasks_owner on tasks
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists quick_notes_owner on quick_notes;
create policy quick_notes_owner on quick_notes
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

notify pgrst, 'reload schema';
