-- ============================================================================
-- Studree — 0007: Fase 14 (asistente de IA "el Brote")
-- Spec: docs/superpowers/specs/2026-10-19-fase-14-asistente-design.md
-- Modelo: docs/DB_SCHEMA.md · Seguridad: docs/03-security.md
--
-- ADITIVA e idempotente: no borra datos. Sin funciones nuevas (nada de
-- security definer). Reutiliza set_updated_at() de la 0001.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Planes: nadie se sube de plan desde la app (solo select propio).
--    El plan se cambia a mano en el panel de Supabase. Sin fila = 'free'.
-- ----------------------------------------------------------------------------

create table if not exists user_plans (
  user_id    uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  plan       text not null default 'free' check (plan in ('free', 'premium')),
  updated_at timestamptz not null default now()
);

drop trigger if exists user_plans_set_updated_at on user_plans;
create trigger user_plans_set_updated_at
  before update on user_plans
  for each row execute function set_updated_at();

alter table user_plans enable row level security;

drop policy if exists user_plans_select on user_plans;
create policy user_plans_select on user_plans
  for select to authenticated
  using (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- 2. Uso de IA: registro de acciones (para los límites diarios). Solo select e
--    insert propios: sin update ni delete.
-- ----------------------------------------------------------------------------

create table if not exists ai_usage (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  action     text not null check (action in
               ('chat', 'shortcut', 'summary', 'quiz', 'weak_review', 'study_plan', 'gaps', 'connections')),
  external   boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists ai_usage_user_action_idx on ai_usage (user_id, action, created_at desc);

alter table ai_usage enable row level security;

drop policy if exists ai_usage_select on ai_usage;
create policy ai_usage_select on ai_usage
  for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists ai_usage_insert on ai_usage;
create policy ai_usage_insert on ai_usage
  for insert to authenticated
  with check (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- 3. Intentos de pruebas (quiz)
-- ----------------------------------------------------------------------------

create table if not exists quiz_attempts (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  scope_type text not null check (scope_type in ('sheet', 'subject', 'career', 'all')),
  scope_id   uuid,
  total      int not null check (total >= 0),
  correct    int not null check (correct >= 0),
  created_at timestamptz not null default now()
);

alter table quiz_attempts enable row level security;

drop policy if exists quiz_attempts_owner on quiz_attempts;
create policy quiz_attempts_owner on quiz_attempts
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- 4. Temas flojos (los que el usuario falla en las pruebas)
-- ----------------------------------------------------------------------------

create table if not exists weak_topics (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null default auth.uid() references auth.users(id) on delete cascade,
  subject_id     uuid not null references subjects(id) on delete cascade,
  sheet_id       uuid references sheets(id) on delete set null,
  topic          text not null check (length(topic) between 1 and 200),
  misses         int not null default 1 check (misses >= 1),
  last_missed_at timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (user_id, subject_id, topic)
);

create index if not exists weak_topics_user_subject_idx on weak_topics (user_id, subject_id);

drop trigger if exists weak_topics_set_updated_at on weak_topics;
create trigger weak_topics_set_updated_at
  before update on weak_topics
  for each row execute function set_updated_at();

alter table weak_topics enable row level security;

drop policy if exists weak_topics_owner on weak_topics;
create policy weak_topics_owner on weak_topics
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

notify pgrst, 'reload schema';
