-- ============================================================================
-- Studree — 0010: Fase 15 (compartir por link y tarjetas)
-- Spec: docs/superpowers/specs/2026-11-10-fase-15-compartir-tarjetas-design.md
-- Modelo: docs/DB_SCHEMA.md · Seguridad: docs/03-security.md
--
-- ADITIVA e idempotente: no borra datos. Reutiliza set_updated_at() de la 0001.
-- La única función `security definer` del proyecto es get_shared_subject: ver
-- la revisión en docs/03-security.md.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Links para compartir una materia (solo lectura pública)
-- ----------------------------------------------------------------------------

create table if not exists shared_links (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  subject_id uuid not null references subjects(id) on delete cascade,
  token      text not null unique check (token ~ '^[0-9a-f]{32}$'),
  created_at timestamptz not null default now(),
  revoked_at timestamptz
);

-- Un solo link activo por materia (el revocado deja de contar).
create unique index if not exists shared_links_active_subject_idx
  on shared_links (subject_id) where revoked_at is null;

create index if not exists shared_links_user_idx
  on shared_links (user_id, created_at desc);

alter table shared_links enable row level security;

drop policy if exists shared_links_owner on shared_links;
create policy shared_links_owner on shared_links
  for all to authenticated
  using (auth.uid() = user_id)
  -- La materia tiene que ser del usuario (el select de subjects ya pasa por su RLS).
  with check (auth.uid() = user_id and exists (select 1 from subjects where subjects.id = subject_id));

-- Lectura pública de UNA materia a partir de su token. Devuelve NULL si el link
-- no existe, está revocado o la materia/carrera está en la papelera. No devuelve
-- ids de usuario ni datos de otras materias.
create or replace function get_shared_subject(p_token text)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'subject', jsonb_build_object('name', s.name, 'color', s.color),
    'career', jsonb_build_object('name', c.name),
    'sheets', coalesce((
      select jsonb_agg(
        jsonb_build_object('id', h.id, 'created_at', h.created_at, 'content_md', h.content_md)
        order by h.created_at, h.id
      )
      from sheets h
      where h.subject_id = s.id and h.deleted_at is null
    ), '[]'::jsonb)
  )
  from shared_links l
  join subjects s on s.id = l.subject_id
  join careers c on c.id = s.career_id
  where l.token = lower(p_token)
    and l.revoked_at is null
    and s.deleted_at is null
    and c.deleted_at is null
  limit 1
$$;

revoke all on function get_shared_subject(text) from public;
grant execute on function get_shared_subject(text) to anon, authenticated;

-- ----------------------------------------------------------------------------
-- 2. Tarjetas de repaso (flashcards) por materia
-- ----------------------------------------------------------------------------

create table if not exists flashcards (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null default auth.uid() references auth.users(id) on delete cascade,
  subject_id        uuid not null references subjects(id) on delete cascade,
  sheet_id          uuid references sheets(id) on delete set null,
  front             text not null check (length(btrim(front)) between 1 and 2000),
  back              text not null check (length(btrim(back)) between 1 and 2000),
  box               int not null default 1 check (box between 1 and 5),
  due_at            timestamptz not null default now(),
  last_reviewed_at  timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists flashcards_subject_due_idx on flashcards (subject_id, due_at);
create index if not exists flashcards_user_idx on flashcards (user_id, created_at desc);

drop trigger if exists flashcards_set_updated_at on flashcards;
create trigger flashcards_set_updated_at
  before update on flashcards
  for each row execute function set_updated_at();

alter table flashcards enable row level security;

drop policy if exists flashcards_owner on flashcards;
create policy flashcards_owner on flashcards
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id and exists (select 1 from subjects where subjects.id = subject_id));

notify pgrst, 'reload schema';
