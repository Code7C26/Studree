-- ============================================================================
-- Studree — Esquema inicial (Supabase / PostgreSQL)
-- Fuente de verdad del modelo: docs/DB_SCHEMA.md (ADR-007, ADR-010).
-- Reglas de seguridad: docs/03-security.md.
--
-- Jerarquía: Career → Subject → Unit → Topic → Sheet
--            Subject ←→ Prerequisite (correlativas entre materias)
--
-- Cómo aplicarlo:
--   Supabase Dashboard → SQL Editor → pegar este archivo → Run.
--   (o `supabase db push` si se usa la CLI de Supabase)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Tablas
-- ----------------------------------------------------------------------------

  create table if not exists careers (
    id         uuid primary key default gen_random_uuid(),
    user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
    name       text not null check (length(trim(name)) between 1 and 120),
    color      text not null default '#22c55e',
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
  );

  create table if not exists subjects (
    id         uuid primary key default gen_random_uuid(),
    career_id  uuid not null references careers(id) on delete cascade,
    user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
    name       text not null check (length(trim(name)) between 1 and 120),
    color      text not null default '#22c55e',
    status     text not null default 'pendiente'
              check (status in ('pendiente', 'cursando', 'aprobada')),
    position   int  not null default 0,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
  );

  -- Correlativas: grafo dirigido entre materias.
  -- Debe ser un DAG; la ausencia de ciclos se valida en el service (ADR-009).
  -- Acá solo se rechaza el caso trivial: una materia requisito de sí misma.
  create table if not exists prerequisites (
    id          uuid primary key default gen_random_uuid(),
    user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
    subject_id  uuid not null references subjects(id) on delete cascade, -- la condicionada
    requires_id uuid not null references subjects(id) on delete cascade, -- la requerida
    kind        text not null check (kind in ('cursar', 'rendir')),
    constraint no_self_prerequisite check (subject_id <> requires_id),
    unique (subject_id, requires_id, kind)
  );

  create table if not exists units (
    id         uuid primary key default gen_random_uuid(),
    subject_id uuid not null references subjects(id) on delete cascade,
    user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
    name       text not null check (length(trim(name)) between 1 and 200),
    position   int  not null default 0,
    created_at timestamptz not null default now()
  );

  create table if not exists topics (
    id         uuid primary key default gen_random_uuid(),
    unit_id    uuid not null references units(id) on delete cascade,
    user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
    name       text not null check (length(trim(name)) between 1 and 200),
    position   int  not null default 0,
    created_at timestamptz not null default now()
  );

  create table if not exists sheets (
    id         uuid primary key default gen_random_uuid(),
    topic_id   uuid not null references topics(id) on delete cascade,
    user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
    title      text not null check (length(trim(title)) between 1 and 200),
    content_md text not null default '',   -- Markdown: fuente de verdad (ADR-011)
    position   int  not null default 0,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
  );

  -- ----------------------------------------------------------------------------
  -- 2. Índices (consultas del explorador y de los canvas)
  -- ----------------------------------------------------------------------------

  create index if not exists careers_user_id_idx        on careers (user_id);
  create index if not exists subjects_career_id_idx     on subjects (career_id);
  create index if not exists prerequisites_subject_idx  on prerequisites (subject_id);
  create index if not exists prerequisites_requires_idx on prerequisites (requires_id);
  create index if not exists units_subject_id_idx       on units (subject_id);
  create index if not exists topics_unit_id_idx         on topics (unit_id);
  create index if not exists sheets_topic_id_idx        on sheets (topic_id);

  -- ----------------------------------------------------------------------------
  -- 3. updated_at automático
  --    Las columnas updated_at tienen default now() solo al insertar; este trigger
  --    las mantiene al día en cada UPDATE sin depender del cliente.
  -- ----------------------------------------------------------------------------

  create or replace function set_updated_at()
  returns trigger
  language plpgsql
  as $fn$
  begin
    new.updated_at = now();
    return new;
  end;
  $fn$;

  drop trigger if exists careers_set_updated_at on careers;
  create trigger careers_set_updated_at
    before update on careers
    for each row execute function set_updated_at();

  drop trigger if exists subjects_set_updated_at on subjects;
  create trigger subjects_set_updated_at
    before update on subjects
    for each row execute function set_updated_at();

  drop trigger if exists sheets_set_updated_at on sheets;
  create trigger sheets_set_updated_at
    before update on sheets
    for each row execute function set_updated_at();

  -- ----------------------------------------------------------------------------
  -- 4. Row Level Security (OBLIGATORIO)
  --
  --    ⚠️ La anon key es PÚBLICA (viaja en el bundle del frontend). Lo único que
  --    separa los datos de un estudiante de los de otro son estas políticas.
  --    Una tabla sin RLS = base de datos abierta. Ver docs/03-security.md.
  --
  --    Cada política deja ver y tocar SOLO las filas cuyo user_id es el del
  --    usuario autenticado. Sin sesión iniciada auth.uid() es NULL: no se
  --    devuelve ninguna fila ni se puede insertar.
  -- ----------------------------------------------------------------------------

  alter table careers       enable row level security;
  alter table subjects      enable row level security;
  alter table prerequisites enable row level security;
  alter table units         enable row level security;
  alter table topics        enable row level security;
  alter table sheets        enable row level security;

  drop policy if exists careers_owner on careers;
  create policy careers_owner on careers
    for all to authenticated
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);

  drop policy if exists subjects_owner on subjects;
  create policy subjects_owner on subjects
    for all to authenticated
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);

  drop policy if exists prerequisites_owner on prerequisites;
  create policy prerequisites_owner on prerequisites
    for all to authenticated
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);

  drop policy if exists units_owner on units;
  create policy units_owner on units
    for all to authenticated
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);

  drop policy if exists topics_owner on topics;
  create policy topics_owner on topics
    for all to authenticated
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);

  drop policy if exists sheets_owner on sheets;
  create policy sheets_owner on sheets
    for all to authenticated
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);
